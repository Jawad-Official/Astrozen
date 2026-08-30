# Astrozen — Full Audit Report

**Date:** 2026-08-30 · **Repo HEAD at audit start:** `1988090` (`chore: add render blueprint`), branch `main`
**Scope:** Phases 0-7 of `AUDIT_PLAN.md`, read-only. No code has been changed. This report is the STOP checkpoint before Phase 8 (remediation) — nothing in Phase 8 begins without your explicit go-ahead.

**How to read this document:** the phase files (`SECURITY_FINDINGS.md`, `BUG_FINDINGS.md`, `CODE_QUALITY_FINDINGS.md`, `TESTING_CI_FINDINGS.md`, `DEPENDENCY_FINDINGS.md`, `PERFORMANCE_FINDINGS.md`) each contain the full evidence — code excerpts, exact citations, and reasoning — for every finding below. This report condenses each finding to one row (ID, severity, file:line, one-line impact/fix, effort) so the whole audit is navigable in one place; **the phase files are the source of truth for evidence**, this report is the index and the synthesis.

**Total findings across all phases: 4 Critical · 9 High · 14 Medium · 17 Low** (44 actionable findings; counted directly from the tables below, not estimated), plus 1 needs-verification item and dozens of explicitly-verified clean/informational items recorded in the phase files so you know what was actually checked, not just what was found wrong.

---

## Executive Summary — Top 5 Risks, Ranked

1. **Astrozen's multi-tenant isolation is broken in three independent ways, all Critical (SEC-1, SEC-2, SEC-3).** Any registered user can self-promote to `role="admin"` for free and use it to bypass organization checks on projects/issues/features (SEC-1); the AI idea/blueprint engine (`ai_projects.py`, ~29 of 34 routes) and the entire `documents.py` router perform **no ownership check at all** on any resource (SEC-2, SEC-3). Together these mean any authenticated user — not a sophisticated attacker, just a second account — can read, mutate, or delete any other organization's confidential business ideas, projects, issues, and Google Docs. This is the most severe finding in the audit and the one place where "solo bootstrapped app" calibration doesn't reduce the severity: this is the core promise of a multi-tenant SaaS (your data is yours) being unenforced today.
2. **A stored XSS reaches the JWT sitting in `localStorage` (SEC-B1, SEC-7).** Any user can plant a malicious Mermaid diagram payload via an unvalidated `Dict[str, Any]` endpoint; it renders with `securityLevel: 'loose'` and raw `innerHTML`, and because the same JWT that the backend correctly protects with an httpOnly cookie is *also* duplicated into `localStorage` on the frontend, successful exploitation is a full session takeover, not just a cookie-inaccessible annoyance.
3. **Every I/O-bound backend call is synchronous inside `async def` handlers, with zero threadpool offload anywhere in the codebase (BUG-2).** Combined with a single-process `uvicorn` deploy (no `--workers`), one user's AI generation or Google Drive call blocks every other request the server is handling. This is a concrete scalability ceiling that will reproduce the moment two users use the app at the same time.
4. **The backend CI test job has been failing on every run, and nothing has been blocking merges on it (TEST-1).** Confirmed by direct execution, not inferred: `pytest -q` against the current (empty) test directory exits 5. This means the "safety net" a solo founder is relying on to catch a bad push before Render's `autoDeploy: true` ships it has been silently broken — it's not a coverage gap, it's an inert alarm that's been going off unnoticed on every push.
5. **Zero rate limiting on ~15 billable OpenRouter-calling routes (SEC-C1), zero caching anywhere (PERF-1), and Google OAuth tokens with a broad, unused-in-practice scope sit in the database in plaintext because `ENCRYPTION_KEY` is never set in either `render.yaml` (SEC-10).** None of these three individually is as severe as #1-4, but together they represent the "this could quietly cost you money or leak a real Google credential and you wouldn't find out from an alert, you'd find out from a bill or a breach notification" category — worth fixing in the same pass as the Criticals given how cheap each fix is.

---

## Documentation Drift (Phase 7)

`docs/PRD.md`, `docs/BACKEND_SCHEMA.md`, `docs/APP_FLOW.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/TECH_STACK.md` were read in full and diffed against the current code. Two structural notes first: **these 5 files total only 251 lines** — they're intentionally lightweight, high-level docs, not a detailed spec, so "drift" here means a handful of specific, material mismatches rather than a document rotted beyond repair. Second, and more important: **`docs/` itself is gitignored (`.gitignore:49`, `*docs/`) and has never been committed** — every one of these files exists only on this machine. That's its own finding (DOC-5 below), separate from their content accuracy.

| ID | Finding | Evidence |
|---|---|---|
| **DOC-1** | `IMPLEMENTATION_PLAN.md:33` and `TECH_STACK.md:34` both document `npm.cmd exec tsc -- -b` as a working verification command. It currently **hard-fails** with `TS2688: Cannot find type definition file for 'vitest/globals'` before checking a single line of app code (`CODE_QUALITY_FINDINGS.md`). Anyone following this doc to verify their own changes would see a failure and reasonably assume they broke something — when the repo was already broken this way before they touched it. | `Frontend/tsconfig.app.json:3`; confirmed via direct `npx tsc -b` run this session. |
| **DOC-2** | `docs/APP_FLOW.md:7`: "Google OAuth is available for document workflows. The backend stores Google access and refresh tokens on the user record" — accurate about storage, but implies these tokens power document workflows. In reality (`BUG_FINDINGS.md` BUG-7), all real Drive/Docs API access goes through a single shared **service account**; the per-user tokens are captured and stored but never read by any live code path. The doc's mental model of *how* document access works doesn't match the implementation. | `Backend/app/services/document_service.py:19-22`; confirmed zero call sites for `_decrypt_user_tokens`/`refresh_google_token`. |
| **DOC-3** | `docs/BACKEND_SCHEMA.md:35`: "Local SQLite databases also run a small startup schema guard for additive columns that `create_all()` cannot apply to existing tables." **`Base.metadata.create_all()` is never called anywhere in this codebase** (confirmed via repo-wide grep) — the guard (`ensure_runtime_schema()`) exists because of Alembic migration/model drift (the same class of issue as BUG-1's `teams.identifier` finding), not because of any `create_all()` limitation. The doc describes a mechanism that isn't actually in play. | `Backend/app/core/database.py:31-61`; `grep -rn "create_all(" Backend/app` → zero matches. |
| **DOC-4** | `docs/PRD.md:65`: "Frontend lint still contains broad `any` usage" (listed as a "Current Known Gap" implying active tracking). In reality, `eslint.config.js:20` has `@typescript-eslint/no-explicit-any: "off"` — the linter isn't tracking `any` usage at all, so there's no signal driving this "known gap" forward one way or the other. The doc frames this as a monitored backlog item; the tooling has actually stopped monitoring it. | `Frontend/eslint.config.js:19-21`; confirmed via real `npx eslint .` run (0 warnings, because the rule is off). |
| **DOC-5** | `docs/` is gitignored (`.gitignore:49`) and has never been committed to version control — confirmed via `git ls-files docs/` (empty) across the full history. All 5 files checked in this phase, plus `DEPLOYMENT.md`, `FRONTEND_GUIDELINES.md`, and `NOTIFICATIONS.md`, exist only on the machine that originally wrote them. If that machine is lost, or a collaborator ever clones this repo, none of this documentation comes with it. | `AUDIT_PLAN.md` §0.6. |

**Broadly accurate and worth noting as such:** `docs/TECH_STACK.md` and `docs/BACKEND_SCHEMA.md`'s core content (table lists, framework choices, AI/document integration description) matches reality closely — table names, relationships, and the overall stack list all check out against the actual models and `package.json`/`requirements.txt`. `IMPLEMENTATION_PLAN.md:11` ("Improve API error handling across services and stores") and its "Add tests for auth..." line are both still exactly correct priorities, independently validated by this audit's own Phase 2 and Phase 4 findings — a good sign the doc's authors had accurate self-awareness of the codebase's weak points even before this audit.

---

## Full Findings List

### Phase 1 — Security (`SECURITY_FINDINGS.md`)

| ID | Title | Sev | File:line | Fix (one line) | Effort |
|---|---|---|---|---|---|
| SEC-1 | Self-obtainable admin role bypasses org isolation | **Critical** | `deps.py:79-81` + 5 predicates | Org-match check before admin bypass in all 5 predicates | S |
| SEC-2 | AI engine has no ownership check on ~29/34 routes | **Critical** | `ai_projects.py` (23 `.get()` sites) | One `deps.py` helper, swap ~25 call sites | M |
| SEC-3 | `documents.py` trusts `doc_id` alone on all 8 routes | **Critical** | `documents.py:17-231` | Org-scope join at top of 6 handlers + `create_document` | S |
| SEC-B1 | Stored XSS: Mermaid `securityLevel:'loose'` + raw `innerHTML` | **Critical** | `Mermaid.tsx:24,74`; `ai_projects.py:1461` | `securityLevel:'strict'` + real Pydantic schema | S |
| SEC-4 | `issues.py` comments/activities have no authz | High | `issues.py:179-216` | Reuse existing org-check at `:129` | S |
| SEC-6 | Google OAuth login-CSRF (no `state`) | High | `google_auth.py:39-49`, api `:24-38` | Add `state` param, verify on callback | S |
| SEC-B2 | SSRF via `html2docx` image loader | High | `ai_projects.py:1822-1846,586-641` | Strip non-`data:`/non-allowlisted `<img src>` before conversion | S |
| SEC-C1 | Zero rate limiting on ~15 billable AI routes | High | `ai_projects.py` (whole router) | `@limiter.limit(...)` per route or router-level | S |
| SEC-5 | Milestone create/update skip the check delete uses | Medium | `features.py:214-249` | Add `check_can_edit_feature` guard | S |
| SEC-9 | Project update-comments/reactions have no authz | Medium | `projects.py:297-383` | Reuse org-check at `:125-131` | S |
| SEC-7 | JWT duplicated into `localStorage` | Medium | `api-client.ts:18`, `AuthContext.tsx` | Drop `localStorage`, rely on the existing httpOnly cookie | S-M |
| SEC-10 | Google OAuth tokens stored in plaintext (`ENCRYPTION_KEY` unset) | Medium | `encryption.py:18-21`; both `render.yaml` | Set `ENCRYPTION_KEY` in Render dashboard | S |
| SEC-C2 | `requirements.txt` unpinned — live-demonstrated drift | Medium | `requirements.txt:1-8` | `pip freeze` a lockfile, point Render's buildCommand at it | S |
| SEC-C4 | 2 of 10 npm-audit findings ship to production | Medium | `package.json:56,66` | `npm audit fix` (non-breaking) | S |
| SEC-8 | No logout endpoint — cookie never revoked | Low | `auth_service.py`, `auth.ts:46-49` | Add `POST /auth/logout` + `delete_cookie` | S |
| SEC-B3 | Unvalidated title → R2 key collision → raw 500 | Low | `documents.py:16-27` | Slugify + server-generated key | S |
| SEC-B6 | 3 Pydantic schema gaps (1 input, 2 response-side) | Low | `ai_projects.py:1461,1933,2041`; `organizations.py:74` | Fix `:1461` with SEC-B1; schemas for the other 2 when touched | S |
| SEC-C3 | `ecdsa` PYSEC-2026-1325 — transitive, unreachable | Low | n/a (dependency) | None needed now | — |
| SEC-C5 | Audit-log `detail=str(e)` — broad except, verified low risk | Low | `auth.py:25-27,57-59` | Narrow exception types when touched | S |

### Phase 2 — Correctness & Bugs (`BUG_FINDINGS.md`)

| ID | Title | Sev | File:line | Fix (one line) | Effort |
|---|---|---|---|---|---|
| BUG-1 | `teams.identifier`: model allows 5 chars, Postgres column allows 3 | High | `team_model.py:57` vs migration `fdf4ab59a20e` | New migration to widen, or cap schema at 3 | S |
| BUG-2 | Every I/O-bound service call is synchronous in `async def` handlers | High | `ai_service.py`, `document_service.py`, `storage_service.py` | Wrap in `run_in_threadpool(...)` | M |
| BUG-3 | `list_projects` has zero eager loading, 5 relationships serialized | Medium | `crud/project.py:28-48` | Add `.options(joinedload/selectinload(...))` | S |
| BUG-4 | `Feature.sub_features` lazy-loaded in both feature-list queries | Medium | `crud/feature.py:19-38` | Add `selectinload(Feature.sub_features)` | S |
| BUG-5 | `documents.py` returns raw exception text in 5 handlers | Medium | `documents.py:44,100,159,192,229` | Fixed generic message, log server-side | S |
| BUG-9 | 14/22 `issueStore` mutations swallow API errors | Medium | `issueStore.ts` (14 actions) | Add `throw error;` matching the 8 that already do it | S |
| BUG-6 | `convert_to_project` swallows kanban-issue errors (`except: pass`) | Low | `ai_projects.py:2093-2118` | `except Exception as e:` + log | S |
| BUG-7 | Dead per-user Google OAuth token-refresh subsystem (corrects Phase-0 hypothesis) | Low/info | `sync_drive_to_r2.py:13-50`, `document_service.py:79-84` | Delete dead code, or wire in if ever needed | S |
| BUG-8 | `documents.r2_path` collision → unhandled 500 | Low | `documents.py:16-27` | Catch `IntegrityError` → 409; pairs with SEC-B3 | S |
| BUG-10 | `saveFilter`/`deleteFilter` no-op stubs | Low | `issueStore.ts:627-631` | Implement or remove the affordance | S-M |
| BUG-11 | `setSelectedIssue` request-ordering race | Low | `issueStore.ts:583-598` | Guard `set()` with an "is this still selected" check | S |
| BUG-12 | `notificationStore` swallows errors silently | Low | `notificationStore.ts:34-58` | Add `toast.error(...)` matching `aiStore.ts` | S |
| BUG-13 | `fetchNodeDetails` fails silently in blueprint canvas | Low | `PlansTab.tsx:686-693` | Add `toast.error(...)` | S |

### Phase 3 — Code Quality & Architecture (`CODE_QUALITY_FINDINGS.md`)

| ID | Title | Sev | File:line | Fix (one line) | Effort |
|---|---|---|---|---|---|
| CQ-1 | `sync_team_members` still called live but body disabled (`return`) | High* | `project_service.py:58-79`; called from `team_service.py:125,205` | Confirm intent; delete or re-enable (code's still there, commented) | S |
| CQ-6 | `tsc -b` cannot run at all; unblocking it finds 2 real bugs | Medium | `tsconfig.app.json:3`; `themes.ts:11-30`; `PlansTab.tsx:683` | Remove/fix `vitest/globals` type ref; add missing `ThemeColors` fields | S |
| CQ-2 | Duplicate function name `get_project_ideas` (2 routes) | Low | `ai_projects.py:467,497` | Rename one | S |
| CQ-7 | 6 verified-unused frontend packages (depcheck, cross-checked) | Low | `package.json` | Remove `react-markdown`, `motion-dom`, `motion-utils`, `baseline-browser-mapping`, `caniuse-lite`, `@tailwindcss/typography` | S |
| CQ-4 | Duplicate `render.yaml` (root vs `Backend/`) | Low | both files | Delete `Backend/render.yaml`, keep root | S |
| CQ-5 | Orphaned `bun.lockb` at repo root (no `package.json` there) | Low | `bun.lockb` | `git rm bun.lockb` | S |
| — | ESLint disables its two highest-signal rules (0 warnings ≠ 0 issues) | info | `eslint.config.js:19-21` | Not recommended to re-enable now (would surface a large one-time cleanup) | — |
| — | `PlansTab.tsx` — 2,881 lines, 18 `useState`/8 `useEffect` in one component | info/watch | `PlansTab.tsx:595-2881` | No action now — no bug in this audit was attributable to the size specifically | — |

*CQ-1's severity is elevated above a typical "dead code" finding because it's still actively called and silently breaks team→project member propagation — it's a functional bug wearing dead-code clothing. Full reasoning in `CODE_QUALITY_FINDINGS.md`.

### Phase 4 — Testing & CI/CD (`TESTING_CI_FINDINGS.md`)

| ID | Title | Sev | File:line | Fix (one line) | Effort |
|---|---|---|---|---|---|
| TEST-1 | Backend CI test step fails on every run (confirmed, exit 5) | High | `backend.yml:30-32` | One real test makes this meaningful again | S |
| TEST-3 | Zero test coverage — 0/91 backend routes, 0 frontend flows | High (auth specifically) | `Backend/tests/`, `Frontend/src/test/` | 8-12 focused tests: auth + Phase-1 IDOR regressions | M |
| TEST-2 | "Type check" CI step runs ESLint, not `tsc` | Medium | `frontend.yml:30-31` | Fix CQ-6 first, then add a real `tsc -b` step | S (after CQ-6) |
| TEST-4 | `alembic upgrade head` in startCommand — deploy-failure mode unverified | Needs verification | `render.yaml:8` | Check Render dashboard's zero-downtime behavior on the free plan | — |

### Phase 5 — Dependencies & Supply Chain (`DEPENDENCY_FINDINGS.md`)

Fully cross-referenced with Phase 1 (SEC-C1-C4) — see that table above for the security-relevant dependency items (unpinned `requirements.txt`, the `ecdsa` CVE, the 2 npm findings that ship to production). Additional Phase 5-only items:

| ID | Title | Sev | Fix | Effort |
|---|---|---|---|---|
| — | `psycopg2-binary` is LGPL | info | No action — standard, low-risk for a closed-source SaaS backend | — |
| — | Frontend production deps: 100% permissive licenses (MIT/BSD/ISC/Apache/etc.) | info (clean) | No action | — |
| — | `vite` 3 majors behind (5→8); only relevant CVE (esbuild dev-server) doesn't reach production | info | Not urgent; plan separately if ever done | — |

### Phase 6 — Performance (`PERFORMANCE_FINDINGS.md`)

| ID | Title | Sev | File:line | Fix (one line) | Effort |
|---|---|---|---|---|---|
| PERF-1 | Zero caching around billable AI generation calls | Medium | repo-wide (confirmed absent) | Simple in-process memoization keyed on input hash | S |
| PERF-2 | `documents.py`/`features.py` list endpoints have no pagination | Medium | `documents.py:48-68`; `features.py:50-76` | Add `skip`/`limit`, matching `issues.py`/`projects.py` | S |
| PERF-3 | `Document.project_id`/`idea_id` have no index (the one gap in an otherwise well-indexed schema) | Low | `document.py:21-22` | Add 2 indexes + migration | S |
| — | `mermaid` is the heaviest dependency (2.2MB) but already correctly lazy-loaded | info (clean) | `ai-generator/page.tsx:44` | No action; keep it lazy | — |

---

## Fix Priority Roadmap

Ordered for **one person**, working alone, in the order that closes the most risk per hour of work. Criticals are listed individually because each deserves its own commit and its own moment of "did this actually work" verification. Highs are grouped where they touch the same files. Lows are a single deferred bucket — pick them up opportunistically, don't schedule dedicated time for them.

### Do first, one at a time (Criticals)

1. **SEC-1** — org-match guard in `deps.py`'s 5 predicates. Smallest, most self-contained Critical fix; do this first to stop the "free admin" escalation path immediately.
2. **SEC-3** — `documents.py` org-scoping (6 handlers + `create_document`). Second-smallest Critical; also self-contained to one file.
3. **SEC-B1** — Mermaid `securityLevel` + the `blueprint_in` schema. Two independent changes, both small; do both in the same commit since they're the same finding's two halves.
4. **SEC-2** — the `ai_projects.py` ownership-check sweep. Save this for last among the Criticals: it's the same *pattern* as SEC-1/SEC-3 (you'll have just done it twice), but touches ~25 call sites in one file, so it benefits from doing the smaller, structurally-identical fixes first to nail the pattern down.

### Batch together (Highs that share files/logic)

5. **SEC-4 + SEC-9** (`issues.py` comments/activities + `projects.py` update-comments/reactions) — identical shape (existence-check-only → add org-check), different files but same 20-minute fix repeated 5 times. Do in one sitting.
6. **SEC-6** (OAuth `state` param) — standalone, ~15-20 lines across 2 files.
7. **SEC-B2** (SSRF via `html2docx`) — standalone, one sanitization pass before the existing conversion call.
8. **SEC-C1** (AI route rate limiting) — standalone, decorator additions.
9. **BUG-1** (`teams.identifier`) + **BUG-2** (blocking I/O calls) — these don't share files, but both are High-severity Phase 2 findings worth doing in the same work session as the remaining security Highs, since by this point you're deep in the same routers (`ai_projects.py`, `documents.py`) that BUG-2's fix touches.
10. **CQ-1** (`sync_team_members` disabled logic) — decide intent (5 minutes of thinking, not code), then either delete or re-enable.
11. **TEST-1** (broken CI) — write one real test (the auth happy-path test from TEST-3 satisfies this too) so the CI signal means something again.

### Medium batch (do together once the above is stable)

12. **SEC-5, SEC-7, SEC-10, SEC-C2, SEC-C4** — all small, independent, no shared files; a good "clean-up afternoon" batch.
13. **BUG-3, BUG-4, BUG-5, BUG-9** — the N+1/error-handling/error-swallowing batch; `BUG-5`'s fix pairs naturally with `SEC-B3`/`BUG-8` (same file, same root cause).
14. **CQ-6** (unblock `tsc -b`, fix the 2 real type errors it finds) — do this before TEST-2, since TEST-2 depends on it.
15. **TEST-2** (fix the CI "Type check" step to actually run `tsc`) — immediately after CQ-6.
16. **PERF-1, PERF-2, PERF-3** — independent, small, no urgency but cheap.

### Defer unless you have spare time (Lows)

SEC-8, SEC-B3 (paired with BUG-8), SEC-B6, SEC-C3 (no action needed, ever), SEC-C5, BUG-6, BUG-7, BUG-10, BUG-11, BUG-12, BUG-13, CQ-2, CQ-7, CQ-4, CQ-5. None of these block anything else or compound with another finding — pick them up whenever you're already in the relevant file for an unrelated reason.

### Not code fixes — decisions or verification, not Phase 8 work

- **TEST-4** (Render deploy-failure behavior) — check your Render dashboard's settings for the account's actual plan behavior; not something I can verify from the repo.
- **TEST-3** (the 8-12 test items) — schedule this as its own effort after the Critical/High fixes above land, so the tests are written against the *fixed* behavior (especially the IDOR regression tests, which only make sense once SEC-1/2/3/4/9 are fixed).
- **DOC-1 through DOC-5** — once CQ-6 is fixed, DOC-1 resolves itself. DOC-5 (commit `docs/` to git) is a one-command decision whenever you want your documentation to survive a fresh clone.

---

## What was explicitly verified clean (so you know it isn't an oversight)

Pulled up from each phase file for visibility in one place — these are things a less careful audit might have flagged incorrectly, or that are worth knowing are *not* a problem:

- CORS wildcard is structurally impossible (fails closed via a startup validator).
- No secret has ever been committed to git history (full-content scan across all commits).
- JWT algorithm pinning is airtight; no python-jose algorithm-confusion path exists.
- SQL injection: the only raw-SQL site is hardcoded, non-user-influenced, startup-only.
- Filesystem path traversal: no code path writes a user-named file to local disk.
- `chart.tsx`'s `dangerouslySetInnerHTML` and the `react-markdown` dependency are both dead code — zero live attack surface.
- `AuthContext` performs a real server-side `/auth/me` check, not blind `localStorage` trust.
- All frontend route guards are correctly applied; no unguarded protected route exists.
- `aiStore.ts` (all 12 actions) has correct, consistent error handling — the pattern the other two stores should copy.
- APScheduler's overlap protection (`max_instances=1` default) prevents pile-up if a sync run overlaps its own interval.
- Per-document sync failures are correctly isolated — one broken document doesn't halt the batch.
- The Alembic migration chain is linear, single-headed, and applies cleanly.
- 36 named DB indexes exist across the schema on exactly the columns list/detail endpoints filter by (documents is the one gap — PERF-3).
- Both `render.yaml` files were correctly diffed and reconciled (CQ-4) rather than assumed identical.
- License exposure across both dependency trees is essentially zero risk for a closed-source SaaS.

---

**This is the STOP checkpoint.** No remediation has begun. Phase 8 starts only after you give an explicit go-ahead, and per the ground rules: Criticals one at a time with review between each, Highs may be batched per the roadmap above, Lows are untouched unless you ask for them.
