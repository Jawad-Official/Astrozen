# Astrozen — Audit Plan (Phase 0: Discovery & Inventory)

**Date:** 2026-08-30
**Repo HEAD:** `1988090` (`chore: add render blueprint`), branch `main`, remote `github.com/Jawad-Official/Astrozen`
**Audit branch:** `worktree-audit-phase0` (isolated worktree — your working copy is untouched)
**Scope:** read-only through Phase 7. No code changes until you approve Phase 8.

---

## 0.1 What this repo actually is

| | |
|---|---|
| Total tracked files | 262 |
| Total commits (all history) | 9 |
| Backend Python LOC (`Backend/app`) | 11,311 |
| Frontend TS/TSX LOC (`Frontend/src`) | 25,011 |
| API routes | **91** across 10 routers |
| DB models | 22 classes + 3 association tables |
| Alembic migrations | 7, single linear head (`eaab564ba700`) |
| Tests | **0** (see §0.7) |

---

## 0.2 Backend module map — `Backend/app/`

### `app/api/` — HTTP layer (10 routers, 91 routes)

| File | LOC | Routes | Direct DB ops | Notes |
|---|---:|---:|---:|---|
| `api/v1/ai_projects.py` | **2,338** | **34** | **61** | AI/blueprint/document engine. The single biggest layering problem in the repo. |
| `api/v1/projects.py` | 383 | 13 | 5 | |
| `api/v1/features.py` | 277 | 8 | 1 | |
| `api/v1/documents.py` | 231 | 8 | **12** | Drive/R2 document CRUD |
| `api/v1/issues.py` | 216 | 10 | 1 | |
| `api/v1/organizations.py` | 120 | 5 | 1 | |
| `api/v1/teams.py` | 119 | 5 | 1 | |
| `api/v1/google_auth.py` | 62 | 2 | 0 | OAuth login + callback |
| `api/v1/notifications.py` | ~55 | 3 | 0 | |
| `api/v1/auth.py` | 65 | 3 | 0 | register / login / me — cleanest router |
| `api/deps.py` | 175 | — | 4 | Auth dependency + all authz predicates |

### `app/core/` — cross-cutting infrastructure
- `config.py` (117) — Pydantic-settings `Settings`; validators for `SECRET_KEY` strength, `ALGORITHM` allowlist, and an explicit `reject_cors_wildcard` model validator.
- `database.py` (61) — engine, `SessionLocal`, `Base`, `get_db`, and `ensure_runtime_schema()` (SQLite-only `ALTER TABLE` patcher).
- `security.py` (71) — bcrypt hash/verify, `create_access_token`, `decode_access_token`, RS256 key selection helpers.
- `encryption.py` (58) — Fernet wrapper for Google OAuth tokens at rest.
- `rate_limit.py` (8) — slowapi `Limiter` keyed on remote address.
- `time.py` — `utc_now()`.

### `app/crud/` — 13 modules (`base`, `user`, `project`, `issue`, `feature`, `team`, `organization`, `document`, `comment`, `activity`, `invite_code`, `user_role`, `crud_project_idea`)

### `app/models/` — 17 modules; SQLAlchemy 2.0 declarative. All re-exported from `models/__init__.py` so Alembic autogenerate sees them.

### `app/schemas/` — 11 Pydantic v2 modules. **No schema module for documents or project ideas** — those routes hand-roll `Any`/dict responses (see §0.8 candidate C-8).

### `app/services/` — 15 modules
`ai_service` (1,231 LOC), `project_md_service` (331), `team_service` (304), `issue_service` (292), `doc_analyzer_service` (276), `organization_service` (164), `feature_service`, `document_service` (120), `google_auth` (119), `auth_service`, `notification_service`, `project_service`, `storage_service`, `service_account`, `audit_service`.

### `app/tasks/` — 1 module
`sync_drive_to_r2.py` (80 LOC): `run_sync_task()` → `sync_all_documents_to_r2()` + an (apparently uncalled) `refresh_google_token()`.

### Layering violations already visible (to be written up properly in Phase 3)
- `ai_projects.py` performs **61** direct `db.query/add/flush/commit/delete` calls — it *is* the data layer, service layer and HTTP layer at once.
- `documents.py` performs 12.
- `api/deps.py` queries `Project`, `Issue`, `Feature` directly to evaluate permissions (arguably acceptable for authz, but it means authz logic can't be unit-tested without HTTP).
- Only one raw-SQL site exists repo-wide: `core/database.py:60`, an f-string `ALTER TABLE` (identifiers are hardcoded constants, not user input — will confirm in Phase 1).

---

## 0.3 Frontend module map — `Frontend/src/`

| Dir | Count | Notes |
|---|---:|---|
| `components/ui/` | 47 | shadcn primitives, mostly untouched |
| `components/` (app) | 18 | incl. `RequireAuth`, `Mermaid`, `AIDocChatPanel`, `FeatureWindow` (1,293 LOC) |
| `components/issue/` | 9 | |
| `components/dialogs/`, `feature/`, `layout/` | 5 / 2 / 3 | |
| `pages/` | 17 | route-level, lazy-loaded |
| `services/` | 12 | axios API wrappers |
| `store/` | 3 | Zustand: `issueStore` (712), `aiStore` (369), `notificationStore` |
| `context/` | 3 | `AuthContext`, `AuthContextObject`, `ThemeContext` |
| `lib/` | 6 | `api-client` (axios instance), `permissions`, `themes`, `motion`, `utils`, `constants` |
| `hooks/` | 2 | `use-mobile`, `use-toast` |
| `types/` | 3 | `auth`, `issue`, `feature` |
| `test/` | **0 files** | empty directory |

**Largest files (maintenance risk candidates):**
`pages/projects/[projectId]/PlansTab.tsx` **2,881** · `pages/projects/[projectId]/page.tsx` **1,534** · `components/FeatureWindow.tsx` **1,293** · `pages/ai-generator/page.tsx` **1,019** · `components/issue/IssueDetailSheet.tsx` 740 · `store/issueStore.ts` 712.

---

## 0.4 External trust boundaries

| # | Boundary | Entry point | Auth / trust model |
|---|---|---|---|
| **TB-1** | Public REST API (91 routes) | `main.py` → `api/v1/*` | JWT via `Authorization: Bearer` **or** `auth_token` cookie (`api/deps.py:12-24`) |
| **TB-2** | Unauthenticated auth endpoints | `auth.py` register/login | Rate-limited 3/min, 10/min |
| **TB-3** | Google OAuth redirect | `google_auth.py:18` `/auth/google/login` | **Unauthenticated redirect builder** — no `state` param generated |
| **TB-4** | Google OAuth callback | `google_auth.py:24` `/auth/google/callback?code=` | Rate-limited 10/min; **`state` not validated**; mints a JWT + sets cookie |
| **TB-5** | Google Drive / Docs API (egress) | `services/document_service.py`, `service_account.py` | User OAuth tokens (encrypted-at-rest *if* `ENCRYPTION_KEY` set) + `GOOGLE_SERVICE_ACCOUNT_INFO` |
| **TB-6** | Cloudflare R2 (egress) | `services/storage_service.py` | boto3 S3 client, static R2 keys |
| **TB-7** | OpenRouter / OpenAI (egress, **billable**) | `services/ai_service.py:85` | `OPENROUTER_API_KEY`; reached from **34 `ai_projects.py` routes, none rate-limited** |
| **TB-8** | Public SPA on Netlify | `Frontend/dist` | Anything in `VITE_*` is public by construction |
| **TB-9** | In-process APScheduler job | `main.py:34-49` → `tasks/sync_drive_to_r2.py:74` | Runs every 15 min, no auth context, iterates **all** `Document` rows |
| **TB-10** | CORS | `main.py:79-85` | `allow_credentials=True`, `allow_methods/headers=["*"]`, origins from settings |
| **TB-11** | CI/CD → production | `.github/workflows/*`, `render.yaml`, `netlify.toml` | `autoDeploy: true` on Render; Netlify deploy on push to `main` |

---

## 0.5 Where secrets & config are read

| Location | Status | Notes |
|---|---|---|
| `Backend/app/core/config.py:109-113` | — | `env_file=(".env", "Backend/.env")`, `extra="ignore"` |
| `Backend/.env` | untracked, correctly ignored (`Backend/.gitignore:30`) | 12 keys present. `ENCRYPTION_KEY` is **empty**. Google creds are literal `dummy…` values. |
| `Backend/.env.example` | on disk but **NOT in git** | Ignored by `.gitignore:51-52` (`*.env.example`, `Backend/.env.example`) — these override the `!.env.example` negation on line 28. Onboarding doc is invisible to anyone cloning. |
| `render.yaml` (root) | tracked | `rootDir: Backend`, `runtime: python`, 17 env vars |
| `Backend/render.yaml` | tracked | Byte-identical service definition **except** `env: python` (legacy key) and **no `rootDir`** |
| `Frontend/netlify.toml` | tracked | build/publish/SPA redirect only; **no env vars, no security headers** |
| `Frontend/.env` | untracked, correctly ignored (`.gitignore:27`) | single key `VITE_API_URL` |
| `.github/workflows/frontend.yml:59-60` | tracked | `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID` from GitHub secrets — correct pattern |

**Declared in `config.py` but absent from both `render.yaml` files:** `ENCRYPTION_KEY`, `MODEL_NAME`, `RATE_LIMIT_ENABLED`. `ENCRYPTION_KEY` absence is a Phase-1 priority (see C-3).

---

## 0.6 Dev artifacts on disk — git hygiene ✅

Checked both "is it tracked now" and "was it ever committed in any branch":

| Artifact | On disk | Tracked now | In any commit | Ignored by |
|---|---|---|---|---|
| `Backend/test.db` | yes | no | **no** | `Backend/.gitignore:47` `*.db` |
| `Backend/.pytest_cache/` | yes | no | **no** | `Backend/.gitignore:41` |
| `Backend/.env` | yes | no | **no** | `Backend/.gitignore:30` |
| `Frontend/.env` | yes | no | **no** | `.gitignore:27` `.env*` |
| `Frontend/frontend-dev.log` / `.err.log` | yes | no | **no** | `.gitignore:3` `*.log` |
| `Frontend/tsconfig.*.tsbuildinfo` | yes | no | **no** | `.gitignore:38` |

**Result: clean.** No secret-bearing or build artifact has ever entered git history. This is the strongest thing I found in Phase 0.

**But two `.gitignore` rules over-reach and cause real drift:**
1. `.gitignore:49` `*docs/` — this ignores the entire **`docs/` directory**. All 8 architecture docs (PRD, TECH_STACK, BACKEND_SCHEMA, APP_FLOW, IMPLEMENTATION_PLAN, FRONTEND_GUIDELINES, DEPLOYMENT, NOTIFICATIONS) exist locally but are **not in version control**. They live only on this machine.
2. `.gitignore:51-52` — `.env.example` is likewise uncommitted.

Also present: stale `.pyc` files (`Backend/tests/__pycache__/conftest.*.pyc`, `test_api/__pycache__/test_auth.*.pyc`, dated May 2026) for **test files that no longer exist on disk and were never committed**.

---

## 0.7 Two premises in your brief that the code contradicts

I need to flag these now because they change what Phases 2 and 4 should look at.

**(a) There are no tests at all — not "thin" coverage, zero.**
`Backend/tests/` and `Backend/tests/test_api/` contain only `__init__.py`. `Frontend/src/test/` is an empty directory. `git ls-files` confirms only the two `__init__.py` files are tracked. The `.pyc` remnants show a `test_auth.py` + `conftest.py` existed locally in May and were deleted without ever being committed. Consequence to verify in Phase 4: `backend.yml:32` runs `if [ -d tests ]; then pytest -q; fi` — the directory exists, so pytest runs and collects nothing, which exits **5**, which should be failing the job. *Needs verification — `gh` CLI is not installed here, so I can't read run history.*

**(b) TanStack Query is installed and mounted but never used.**
`App.tsx:28,32` creates a `QueryClient` and wraps the tree in `QueryClientProvider`, but `useQuery` appears in **0** files and `useMutation` in **0** files. All server state flows through 3 Zustand stores + raw axios calls. So the Phase-2 item "same server data held in both Zustand and TanStack Query" has no instances to find; the real finding is a dead dependency and a hand-rolled fetch/cache layer in `issueStore.ts`/`aiStore.ts`. Phase 2 will audit *that* instead (stale-state and refetch discipline in the Zustand stores), and Phase 3 will cover the dead dep.

---

## 0.8 Candidate findings carried into Phases 1–7

Recorded during discovery, **not yet verified** — each gets a full read + write-up in its phase.

| ID | Candidate | Phase | First seen |
|---|---|---|---|
| C-1 | Google OAuth flow generates no `state` param → OAuth CSRF / login-CSRF | 1 | `services/google_auth.py:41-49` |
| C-2 | 34 AI routes hitting billable OpenRouter have **no** rate limit; only 3 endpoints repo-wide are limited | 1 | `grep limiter` → `auth.py:18,31`, `google_auth.py:25` |
| C-3 | `ENCRYPTION_KEY` unset ⇒ `encrypt_token()` silently returns plaintext; key is declared in neither `render.yaml` ⇒ prod Google OAuth tokens likely stored in cleartext | 1 | `core/encryption.py:20,42-43`; `Backend/.env` |
| C-4 | JWT stored in `localStorage` **and** issued as an httpOnly cookie — the cookie's protection is nullified | 1 | `lib/api-client.ts:18`; `auth.py:47-55` |
| C-5 | No logout/revocation path; no refresh tokens; `exp` is the only bound | 1 | `security.py:44-58`; `services/auth.ts:47` |
| C-6 | `log_event(..., detail=str(e))` on register/login/OAuth failure may serialize exception text containing user input | 1 | `auth.py:26,58`; `google_auth.py:29,37` |
| C-7 | IDOR sweep needed across 91 routes — `deps.py` has good authz *predicates*, but each route must be checked for actually calling them | 1 | `api/deps.py:98-175` |
| C-8 | Untyped responses/bodies (`response_model=Any`, raw dicts) on idea/document routes | 1 | `ai_projects.py:1933`, `2041`; `organizations.py:74` |
| C-9 | `storage_service.upload_content`/`get_content` are `async def` but call **blocking** boto3 — blocks the event loop | 2 | `services/storage_service.py:33-58` |
| C-10 | `get_content` doesn't null-check `self.s3_client` (unlike `upload_content`) ⇒ `AttributeError` when R2 unconfigured | 2 | `storage_service.py:51-58` |
| C-11 | Sync job loads **all** documents unbounded and never calls `refresh_google_token()` — expired tokens likely fail silently every 15 min | 2 | `tasks/sync_drive_to_r2.py:13,57` |
| C-12 | No global exception handler ⇒ 500s may leak internals; `openapi_url` gating shows the env-aware pattern exists but isn't applied to errors | 2 | `main.py:52-57` (no `@app.exception_handler(Exception)`) |
| C-13 | `ensure_runtime_schema()` patches 6 columns on SQLite that migrations should own — verify models vs. head `eaab564ba700` | 2 | `core/database.py:31-61` |
| C-14 | Multi-step `db.flush()` … `db.commit()` blocks in `ai_projects.py` with no try/rollback ⇒ partial-write risk | 2 | `ai_projects.py:190-283`, `2071-2128` |
| C-15 | `ai_projects.py` at 2,338 LOC / 61 DB calls — the layering violation | 3 | — |
| C-16 | Duplicate function name `get_project_ideas` defined twice on different paths | 3 | `ai_projects.py:467`, `497` |
| C-17 | TS strictness fully disabled: `strict:false`, `noImplicitAny:false`, `strictNullChecks:false` | 3 | `tsconfig.app.json:19-22`; `tsconfig.json:9-14` |
| C-18 | ESLint config disables `no-explicit-any` **and** `no-unused-vars` — the two rules that would catch the most here | 3 | `eslint.config.js:20-21` |
| C-19 | `tsconfig.app.json:3` declares `"types": ["vitest/globals"]` but **vitest is not a dependency** ⇒ `tsc -b` may fail outright | 3/4 | `tsconfig.app.json:3` vs `package.json:75-91` |
| C-20 | Two `render.yaml` files; root has `rootDir: Backend` + modern `runtime:`, `Backend/` copy has neither | 3 | both files |
| C-21 | `bun.lockb` committed at repo root where **no `package.json` exists**; real lockfile is `Frontend/package-lock.json` (used by CI + Netlify) | 3 | `git ls-files` |
| C-22 | Frontend CI step **named** "Type check" actually runs `npm run lint` (= eslint). No `tsc` runs anywhere in CI. | 4 | `frontend.yml:30-31` |
| C-23 | No test gate in either workflow; Render `autoDeploy: true` | 4 | `render.yaml:53` |
| C-24 | `alembic upgrade head && uvicorn` as `startCommand` on a free-tier single instance — failed migration ⇒ service won't boot | 4 | `render.yaml:8` |
| C-25 | `requirements.txt` uses `>=` for all 30 deps, 13 fully unpinned (`boto3`, `openai`, `mammoth`, `python-docx`, `markdown`, `html2docx`, `markdownify`, google libs, `apscheduler`) | 5 | `requirements.txt:18-28` |
| C-26 | Local Python is **3.14.6**; Render pins **3.11**. Backend deps are not installed locally at all (no venv). | 5 | `render.yaml:12` |
| C-27 | `motion-dom` + `motion-utils` listed alongside `framer-motion` (v11 bundles its own); `baseline-browser-mapping` + `caniuse-lite` as direct **runtime** deps | 5/3 | `package.json:46-58` |
| C-28 | `@tanstack/react-query` dead dependency (§0.7b) | 3/5 | `App.tsx` |
| C-29 | Unbounded list endpoints — `documents.py:56`, sync job `:57`, `organizations.py:87` | 6 | — |
| C-30 | No caching around AI generation → identical regenerations re-billed | 6 | `ai_service.py:182` |
| C-31 | `graphify-out/GRAPH_REPORT.md` claims build from commit `c1f88804`, which **does not exist in this repo's history** ⇒ graph is stale/orphaned; usable as a rough map only | 7 | `GRAPH_REPORT.md:14` |
| C-32 | `scripts/setup.sh:7` hardcodes `/c/Users/jawad/Coding/Astrozen/Astrozen/.git` (wrong path) and installs the **Railway** CLI; `config.py:56` still allowlists `astrozen.up.railway.app`. Project is on Render + Netlify. | 7 | `scripts/setup.sh`, `config.py:56` |
| C-33 | `docs/` is gitignored — 8 architecture docs exist only on this machine (§0.6) | 7 | `.gitignore:49` |

**Already checked and clean** (so I don't re-litigate them later):
- No secrets in git history — every `.env`, `.db`, `.log` is untracked and was never committed.
- CORS wildcard is genuinely impossible: `config.py:68-76` `reject_cors_wildcard` raises at startup if `"*"` is in the origins list. `main.py:79-85` is safe *because of* that validator.
- `SECRET_KEY` has a real strength validator (≥32 chars, rejects `secret`/`dummy`) at `config.py:28-40`; `ALGORITHM` is allowlisted to `{HS256, RS256}` at `:42-48`, and `decode_access_token` pins `algorithms=[settings.ALGORITHM]` at `security.py:67` — **no python-jose algorithm-confusion hole**. (Will still verify the RS256 fallback path at `security.py:19-23`.)
- Only one raw-SQL construction site exists repo-wide, over hardcoded identifiers.
- Alembic chain is linear with a single head — no divergent branches.
- Security headers middleware is present (`main.py:23-31`).

---

## 0.9 Tooling status & what I need to install

| Tool | Status | Plan |
|---|---|---|
| Python 3.14.6 | present (global, **no venv**) | Create `Backend/.venv` on 3.11-compatible deps for a faithful audit |
| Backend deps | **not installed** (no fastapi/sqlalchemy/jose/boto3/…) | `pip install -r requirements.txt` into the venv — required for pip-audit, bandit, pytest |
| `pip-audit`, `bandit`, `safety`, `semgrep`, `ruff`, `mypy`, `pytest` | **all missing** | `pip install pip-audit bandit ruff` (cheap). `semgrep` if it installs cleanly on Windows; skip if not. |
| Node 24.18.0 / npm 12.0.1 | present | — |
| `Frontend/node_modules` | **not installed** | `npm ci` (lockfile present) — required for eslint, tsc, npm audit |
| `bun` | not installed | Confirms npm is authoritative (C-21) |
| `gh` CLI | **not installed** | Can't read GitHub Actions run history — CI red/green status stays "needs verification" unless you can paste it |

Installation happens in the isolated worktree / a local venv; nothing is added to `requirements.txt` or `package.json`.

---

## 0.10 Phase checklist & effort estimates

Estimates are wall-clock for me, assuming no surprises. "Findings" are rough expected counts.

### Phase 1 — Security · **~2.5–3.5 h** · largest phase
- [ ] JWT: signing/verification path, RS256 fallback at `security.py:19-23`, `exp` handling, absence of `nbf`/`iat`/`aud`, revocation
- [ ] bcrypt work factor (`gensalt()` default), password-reset flow (**appears not to exist** — confirm)
- [ ] **IDOR sweep across all 91 routes** — the single most time-consuming item. Method: for every route with a path param, read the handler and confirm it calls a `deps.check_*` predicate or filters by `current_user`. Special attention to `documents.py` (8 routes, `db.query(Document).filter(Document.id == doc_id)` with no owner filter visible at `:77,91,112,127,171,204`) and the 34 `ai_projects.py` routes.
- [ ] Google OAuth: `state`, redirect-URI allowlisting, token storage/logging (C-1, C-3)
- [ ] Frontend token storage (C-4)
- [ ] SQL injection: confirm the single `text()` site is safe; grep-verify nothing else
- [ ] Document pipeline: path traversal on user filenames through `python-docx`/`mammoth`/`html2docx`/`markdownify`; check `react-markdown` render path and `Mermaid.tsx:74` `innerHTML = result.svg`
- [ ] SSRF: any endpoint fetching a user-supplied URL (Drive IDs, R2 keys)
- [ ] Pydantic coverage: routes taking raw `dict`/`Any` (C-8)
- [ ] CORS — **already resolved as safe**, will document the validator as the reason
- [ ] Git-history secret scan — **already done, clean**; will re-run with a broader pattern set for the record
- [ ] Dependency pinning + CVE check on installed versions (C-25)
- [ ] Rate-limit coverage (C-2)
- [ ] `audit_service.log_event` leak review (C-6)
- [ ] `VITE_*` exposure — only `VITE_API_URL`/`VITE_API_BASE_URL`, both non-secret; confirm
- [ ] **Tools:** `bandit -r app/`, `pip-audit`, git-history grep, `semgrep --config=auto` if installable
- → `SECURITY_FINDINGS.md`

### Phase 2 — Correctness & bugs · **~2–2.5 h**
- [ ] Models vs. Alembic head: `alembic check` / autogenerate-diff against `eaab564ba700` (C-13)
- [ ] Blocking-in-async sweep: boto3, google-api-python-client, `requests`, OpenAI SDK, docx/mammoth — cross-referenced against which handlers are `async def` (C-9)
- [ ] `run_sync_task` resilience: per-doc isolation, token refresh, scheduler survival after exception, `max_instances`/overlap (C-11)
- [ ] Transaction boundaries in `ai_projects.py` and services (C-14)
- [ ] N+1 on list endpoints (issues/projects/features/documents)
- [ ] Global exception handler / stack-trace leakage (C-12)
- [ ] **Revised per §0.7b:** Zustand store staleness & refetch discipline; missing loading/error states; unhandled rejections; `useEffect` cleanup leaks
- [ ] Route guards — `RequireAuth.tsx` reviewed, looks correct; verify every protected route is actually wrapped and that `AuthContext` gates on a real `/me` call
- → `BUG_FINDINGS.md`

### Phase 3 — Code quality & architecture · **~1.5–2 h**
- [ ] Layering violations, quantified (C-15)
- [ ] Dead code / TODO / FIXME / commented blocks / duplicate defs (C-16)
- [ ] TS strictness (C-17) cross-referenced with **actual `tsc -b` output** (expect C-19 to bite first)
- [ ] **Run `npx eslint .`** and report real output (config disables the 2 highest-signal rules — C-18)
- [ ] Unused deps via `depcheck` + import grep (C-27, C-28)
- [ ] Component size — only where a concrete maintenance problem is demonstrable (`PlansTab.tsx` 2,881 LOC is the lead candidate)
- [ ] render.yaml + lockfile reconciliation with a keep/delete recommendation (C-20, C-21)
- → `CODE_QUALITY_FINDINGS.md`

### Phase 4 — Testing & CI/CD · **~45–60 min**
- [ ] Document the zero-test reality and rank what to test first by blast radius (auth → IDOR-prone routes → AI cost paths)
- [ ] Verify the `pytest` exit-5 hypothesis by running it locally (C-22 context)
- [ ] "Type check" mislabel; no `tsc`, no tests, no backend lint in CI (C-22, C-23)
- [ ] Migration-on-startup failure mode on Render free tier (C-24)
- → `TESTING_CI_FINDINGS.md`

### Phase 5 — Dependencies & supply chain · **~45–60 min**
- [ ] `pip-audit` full output (needs venv install first)
- [ ] `npm audit` full output (needs `npm ci` first)
- [ ] Outdated majors *with* security/maintenance relevance only
- [ ] Quick license pass for copyleft/attribution risk in a closed-source product
- → `DEPENDENCY_FINDINGS.md`

### Phase 6 — Performance & AI cost · **~45–60 min**
- [ ] `npm run build` output + temporary `rollup-plugin-visualizer` pass (`mermaid`, `recharts`, `framer-motion` are the suspects; `chunkSizeWarningLimit` is already raised to 1800 KB at `vite.config.ts:32`, which hints the bundle is large)
- [ ] Unbounded list endpoints (C-29)
- [ ] **AI call caching — the direct-cost item** (C-30)
- [ ] Index coverage on FKs and filtered columns behind the list/detail routes
- → `PERFORMANCE_FINDINGS.md`

### Phase 7 — Doc drift & final report · **~1–1.5 h**
- [ ] Diff all 8 `docs/*.md` against reality (they total only 362 lines, so this is quick)
- [ ] Railway→Render drift (C-32), graph staleness (C-31), gitignored docs (C-33)
- [ ] Assemble `AUDIT_REPORT.md`: top-5 ranked risks, full grouped findings, solo-dev fix roadmap
- → `AUDIT_REPORT.md` + **STOP for your approval**

**Total: ~10–13 hours of audit work**, of which Phase 1's IDOR sweep across 91 routes is the single largest block.

---

## 0.11 Decisions I'd like from you (non-blocking — I have defaults)

1. **Where should the audit artifacts live?** Default: this worktree (`.claude/worktrees/audit-phase0/`), committed to `worktree-audit-phase0`, so `main` stays clean. Say the word if you'd rather they land directly on `main` or in `docs/`.
2. **`semgrep` on Windows** is often painful to install. Default: try once, skip if it fights back, and note it as not-run rather than burning time.
3. **CI run history** — I can't read it without `gh`. If you paste the last few run results (or install `gh`), Phase 4 gets a definitive answer instead of a hypothesis.

---

*End of Phase 0. Awaiting go-ahead before starting Phase 1.*
