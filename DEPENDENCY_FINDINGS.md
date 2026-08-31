# Astrozen — Phase 5: Dependency & Supply Chain Findings

**Date:** 2026-08-30 · **Scope:** per `AUDIT_PLAN.md` Phase 5 checklist
**Method:** Real `pip-audit`, `npm audit`, `pip-licenses`, and `license-checker` runs against the actual resolved dependency trees (backend installed fresh into a venv in this worktree; frontend via `npm ci`). Several items below were already surfaced with full remediation detail in `SECURITY_FINDINGS.md` (SEC-C1 through SEC-C4) — cross-referenced rather than repeated, with the additional data this phase specifically asks for (full vulnerability list, outdated-major triage, license pass).

---

## Backend — `pip-audit`

**Full output** (`tmp/pip-audit-requirements.txt` and `tmp/pip-audit-installed.txt` — identical result from both the declared bounds and the fully-resolved install):
```
Found 1 known vulnerability in 1 package
Name  Version ID              Description
ecdsa 0.19.2  PYSEC-2026-1325  Minerva timing attack on the P-256 curve via ecdsa.SigningKey.sign_digest() —
                                no fix planned (project considers side-channel attacks out of scope)
```
**Analysis (see SEC-C3 for full detail):** transitive via `python-jose[cryptography]`. Confirmed unreachable in this app: `config.py` allowlists only `{HS256, RS256}` as JWT algorithms, so the vulnerable ECDSA signing path is never invoked. **Fix:** none required now; will keep surfacing on every future scan until `python-jose` drops the dependency or the app moves off it — don't mistake it for new/live on a future run.

**No other CVE-tracked vulnerabilities found** in the 94-package resolved dependency graph (`tmp/pip-freeze.txt`).

---

## Backend — version pinning risk

`Backend/requirements.txt` uses `>=` (or nothing) for all 30 direct dependencies, with zero upper bounds and no lockfile. **Live-demonstrated, not hypothetical** (see SEC-C2 for the full writeup): installing this exact file fresh in this session resolved several packages many versions ahead of their stated lower bound —

| Package | `requirements.txt` lower bound | Actually resolved this session |
|---|---|---|
| fastapi | `>=0.109.0` | `0.141.1` |
| starlette | (transitive) | `1.6.0` |
| sqlalchemy | `>=2.0.25` | `2.0.52` |
| alembic | `>=1.13.1` | `1.19.1` |
| python-jose | `>=3.3.0` | `3.5.0` |
| cryptography | `>=41.0.0` | `50.0.1` |
| pydantic | `>=2.5.3` | `2.13.5` |
| uvicorn | `>=0.27.0` | `0.52.4` |

13 packages have no bound recorded at all (`boto3`, `openai`, `mammoth`, `python-docx`, `markdown`, `html2docx`, `markdownify`, `google-api-python-client`, `google-auth-oauthlib`, `google-auth-httplib2`, `apscheduler`, and `slowapi`/`passlib` which do have lower bounds but are included here for the same "no ceiling" reason). **Fix:** already detailed in SEC-C2 — generate and commit a lockfile (`pip freeze > requirements-lock.txt` after confirming the current install works), point Render's `buildCommand` at it. Effort: **S**.

---

## Frontend — `npm audit`

**Full output:** 10 advisories (5 moderate, 5 high) — `tmp/npm-audit.txt` / `tmp/npm-audit.json`. Full per-package detail and production-vs-build-only triage already done in SEC-C4; summarized here for completeness:

| Package | Severity | Ships to production bundle? | Fix available |
|---|---|---|---|
| `mermaid` (→ `dompurify`) | Moderate | **Yes** — direct runtime dependency, feeds `Mermaid.tsx`'s `innerHTML` sink (compounds SEC-B1) | `npm audit fix`, no breaking change — **done** |
| `react-router`/`react-router-dom` | Moderate | **Yes** — direct runtime dependency, app-wide routing | Actually requires `--force` + a v6→v7 major bump (correcting the initial assumption below) — **deferred**, see SEC-C4 |
| `brace-expansion` | High | No — under `eslint`'s dependency tree, lint-time only | `npm audit fix` |
| `js-yaml` | High | No — under `eslint`'s dependency tree | `npm audit fix` |
| `nanoid` | High | No — under the `postcss`/`tailwindcss` build pipeline | `npm audit fix` |
| `postcss` | High | No — build-time CSS generation only | `npm audit fix` |
| `esbuild` | Moderate | No — `vite@5.4.21`'s dev server only; the advisory ("any website can send requests to the dev server") doesn't apply to the static production build Netlify serves | Requires `vite@8.2.2` via `--force` (breaking) |
| `dompurify` | Moderate | Bundled via `mermaid` (see above) | `npm audit fix` |

**Fix — done:** ran `npm audit fix`, which resolved `mermaid`/`dompurify`, `brace-expansion`, `js-yaml`, `nanoid`, and `postcss` (6 of 10) with no breaking changes — verified via `eslint`, `tsc -b`, and a full production build afterward, all clean. **Correction:** `react-router`/`react-router-dom` turned out to require `--force` and a v6→v7 major bump (`react-router-dom@7.18.3`) once actually run — the original assumption that it would resolve the same way as the others wasn't verified before being written down. Left deferred as its own deliberate upgrade decision given `react-router-dom` is used throughout the app's routing. `vite`/`esbuild` remain deferred too, for the reason already given (dev-server-only risk, not urgent). Effort: **S** for the completed part, **M** for either deferred major bump if undertaken later.

---

## Outdated majors worth knowing about (security/maintenance relevance only — not a blanket "everything's old" list)

Checked via `npm outdated`; only listing packages where the gap has a concrete reason to care, per the audit brief's own instruction not to flag staleness for its own sake:

- **`vite` 5.4.21 → latest 8.2.2 (3 majors behind).** The only outdated-major with a security tie-in (the `esbuild` dev-server advisory above requires this jump to fully clear) — but since that advisory doesn't affect the production build, this is a "worth planning for eventually" item, not urgent.
- **`react-router-dom` 6.30 → latest 7.18 (1 major behind).** Correcting an earlier assumption in this report: the moderate open-redirect advisory (SEC-C4) does **not** resolve within the 6.x line — `npm audit fix` requires `--force` and the full v7 jump to actually fix it. Treat the upgrade as its own deliberate migration (React Router 7 has real API changes) rather than a routine audit-fix side effect.
- **`react`/`react-dom` 18.3 → latest 19.2 (1 major behind).** No active CVE. Maintenance-relevant in the medium term since React 18 will eventually stop receiving security backports, but there's no clock running on this today — don't prioritize it over any finding in this report.
- **Everything else flagged by `npm outdated`** (the ~25 individually-versioned `@radix-ui/*` packages, `eslint`, `typescript`, `tailwindcss`, `zustand`, `zod`, etc.) is routine minor/patch drift or a major bump with no security or stated maintenance concern — not worth a founder's time to chase during this audit cycle.

---

## License check

**Backend (`pip-licenses`, 94 resolved packages):** overwhelmingly MIT/BSD/Apache-2.0. One package worth a one-line note: **`psycopg2-binary` is LGPL** (GNU Library/Lesser GPL). LGPL permits linking from proprietary/closed-source software (unlike full GPL) as long as the LGPL-licensed library itself isn't modified — using it as an unmodified PyPI dependency in a closed-source backend, as Astrozen does, is standard practice and carries essentially no risk; this is precisely the license PostgreSQL's Python driver ecosystem has used for years for exactly this reason. No action needed. (Note: `bandit`, `pip-audit`, `pip-licenses`, and `ruff` also appear in the installed-package list because this audit installed them as tooling — they are not part of Astrozen's own dependency tree and were excluded from this analysis.)

**Frontend (`license-checker`, production dependencies):** 379 MIT, 50 ISC, 8 BSD-3-Clause, 5 Apache-2.0, 3 BlueOak-1.0.0, 1 CC-BY-4.0, 1 (MPL-2.0 OR Apache-2.0, dual-licensed — the permissive option applies), 1 Unlicense, 1 0BSD. **Zero copyleft licenses** (no GPL/LGPL/AGPL) anywhere in the frontend production dependency tree. The one "UNLICENSED" flag is `vite_react_shadcn_ts@0.0.0` itself — Astrozen's own `Frontend/package.json`, which has no `license` field set. That's correct and expected for private, closed-source application code (not a third-party dependency issue); no action needed, though adding `"license": "UNLICENSED"` explicitly to `package.json` would silence the tool's flag if that matters to you.

**Verdict: no license risk for a closed-source SaaS in either the backend or frontend dependency tree.**

---

*Continuing to Phase 6 (Performance).*
