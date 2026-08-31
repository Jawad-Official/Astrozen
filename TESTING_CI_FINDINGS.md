# Astrozen — Phase 4: Testing & CI/CD Findings

**Date:** 2026-08-30 · **Scope:** per `AUDIT_PLAN.md` Phase 4 checklist
**Method:** Direct execution of the exact commands both GitHub Actions workflows run, in this worktree's venv/`node_modules`, with exit codes captured cleanly (not through a pipe, which masks the real exit code — see the methodology note under TEST-1).

---

## TEST-1: Backend CI's test step fails on every single run — confirmed by direct execution
**Severity:** High — this isn't a coverage gap, it's an actively broken CI job.
**File:** `.github/workflows/backend.yml:30-32`.
**Evidence:**
```yaml
- name: Run tests
  run: |
    if [ -d tests ]; then pytest -q; fi
```
`Backend/tests/` exists (`Backend/tests/__init__.py`, `Backend/tests/test_api/__init__.py` — both tracked in git; every actual test file was deleted without ever being committed, per `AUDIT_PLAN.md` §0.7a), so the `if` condition is true and `pytest -q` runs. Executed directly in this session's venv:
```
$ python -m pytest -q > out.txt 2>&1; echo $?
5
$ cat out.txt
no tests ran in 0.02s
```
Exit code **5** is pytest's documented code for "no tests were collected." GitHub Actions runs `run:` blocks with `bash -eo pipefail` by default — a non-zero exit from the last command in the script fails the step, and there is no `continue-on-error` set on this step in the workflow. **Methodology note:** my first attempt at this check piped `pytest`'s output through `tail`, which reported exit code 0 — that was `tail`'s exit code, not `pytest`'s, a pipe-masking mistake I caught and corrected by redirecting to a file instead. Recorded here so the correction is visible rather than silently fixed.
**Impact:** The backend CI job has been failing on every push to `main` and every PR since the test files were deleted (git history shows no commits since; the tracked `__init__.py`-only state has likely been the case for a while). Since there's no evidence of branch protection requiring green CI before merge (a standalone `.github/workflows/*.yml` file doesn't enforce anything by itself — that requires a separately-configured branch protection rule, which isn't visible in this repo), pushes have evidently continued to merge and deploy despite this. This means the CI's "red" status has not been acting as a gate at all — it's just noise everyone has learned to ignore, which is worse than not having the step, because a *real* regression would produce the identical "red" signal and be equally easy to ignore.
**Fix:** Either add a real test (even one trivial `def test_health_check(): ...` hitting `/health` is enough to make `pytest` exit 0 and turn this from permanently-broken into actually-meaningful) or change the workflow condition to `if [ -d tests ] && [ -n "$(find tests -name 'test_*.py')" ]; then pytest -q; fi` so an empty test directory doesn't fail the build. Given Phase 8 priorities, the smallest real fix is one auth-flow test (see TEST-3) — that single test both closes this CI gap and starts real coverage. Effort: **S**.

---

## TEST-2: Frontend CI's "Type check" step doesn't type-check anything
**Severity:** Medium — no `tsc` runs anywhere in CI, so type errors currently reach production undetected.
**File:** `.github/workflows/frontend.yml:30-31`.
**Evidence:**
```yaml
- name: Type check
  run: npm run lint
```
```json
// Frontend/package.json
"lint": "eslint .",
```
The step is *named* "Type check" but runs ESLint. There is no `tsc -b` / `tsc --noEmit` invocation anywhere in either workflow file. Compounding this: as established in `CODE_QUALITY_FINDINGS.md`, `npx tsc -b` in this repo currently fails immediately with `TS2688: Cannot find type definition file for 'vitest/globals'` — even if someone added a real type-check step today by naively pasting `npx tsc -b` into the workflow, it would fail on this unrelated config bug before ever reaching the 2 real type errors also found in that phase (`themes.ts`'s missing `ThemeColors` fields, `PlansTab.tsx`'s `NodeJS.Timeout` reference).
**Impact:** The two genuine type errors found in Phase 3 have been shipping to production undetected because nothing in CI or the local dev loop currently catches them (ESLint doesn't do cross-file type checking; `tsc` is the only tool that would).
**Fix:** First apply the Phase 3 fix (resolve the `vitest/globals` reference so `tsc -b` can run at all), then rename this step accurately and add a second step `run: npx tsc -b` (or fold both into one `npm run lint && npx tsc -b` step). Effort: **S**, but has the Phase 3 fix as a prerequisite.

---

## TEST-3: Zero test coverage — 0 of 91 backend routes, 0 of the frontend's user flows
**Severity:** High for the specific gap named below (auth); Medium overall — expected at this project stage, but auth is the one area where "no tests" and "no CI gate" combine with Phase 1's findings into real risk.
**File:** `Backend/tests/test_api/` (only `__init__.py` tracked); `Frontend/src/test/` (empty directory, zero files).
**Evidence:** Route inventory from `AUDIT_PLAN.md` §0.1-0.2 confirms 91 backend routes across 10 routers and 0 test files exercising any of them. No frontend test file exists anywhere in the repo (confirmed via `find Frontend/src -name "*.test.*" -o -name "*.spec.*"` → zero results in Phase 0, and `vitest` itself is not installed — see `CODE_QUALITY_FINDINGS.md`).
**Impact, prioritized by blast radius, not by "test everything":**
1. **Auth flow (`register`/`login`/`/me`) is the highest-priority gap.** It's the one place where a regression is both easy to introduce (any change to `auth_service.py`, `security.py`, or `deps.py`) and immediately catastrophic (a broken password check, a JWT that never expires, a `get_current_user` that returns the wrong user). This is also the one place Phase 1 found *is* currently correct (JWT algorithm pinning, bcrypt defaults) — a regression test here would be pinning down behavior that's already right, which is the cheapest kind of test to write and maintain.
2. **The Phase 1 IDOR fixes (SEC-1 through SEC-9) have zero regression protection once fixed.** Once the organization-scoping checks are added in Phase 8, there is currently nothing that would catch someone accidentally removing or weakening one of them in a future change — the exact kind of security fix most likely to silently regress without a test pinning it down.
3. **AI generation / document conversion paths are comparatively lower priority to test right now** — they're the most complex to set up tests for (require mocking OpenRouter and Google APIs) and, per Phase 1/2 findings, are already the least-trusted part of the codebase; fixing the known bugs there matters more right now than writing tests around the current (buggy) behavior.
**Fix (sized for a solo dev, not "write a test suite"):** After Phase 8's Critical fixes land, add: (a) one test file covering register/login/me happy-path + the "wrong password"/"duplicate email" failure paths, and (b) one test per fixed IDOR finding (SEC-1 through SEC-4 at minimum) asserting a cross-org request now returns 403/404 instead of 200. That's roughly 8-12 focused tests, not a coverage-percentage target. Effort: **M**.

---

## TEST-4: `alembic upgrade head` as part of the Render `startCommand` — needs verification against Render's actual deploy behavior, not confirmable from the repo alone
**Severity:** Needs verification — flagging the risk shape rather than asserting a specific failure mode I can't confirm without inspecting live Render account settings, which is out of scope for a read-only codebase audit.
**File:** `render.yaml:8` / `Backend/render.yaml:7`: `startCommand: alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
**What's confirmed from the repo:** if `alembic upgrade head` exits non-zero (a migration fails), the `&&` means `uvicorn` never starts, so the new deploy's instance never becomes healthy. On the `free` plan (`render.yaml:5`), the service is explicitly a single instance (`databases: astrozen-db, plan: free` and the web service's `plan: free` — Render's free tier does not provision multiple concurrent instances).
**What needs verification (Render-account-specific, not in this repo):** whether Render's zero-downtime deploy behavior (keep the old instance serving traffic until the new one passes its health check) is available on the free plan, or whether a free-tier deploy takes the single instance down before the new one is confirmed healthy. This determines whether a failed migration means "the old version keeps serving traffic and you get a deploy-failed notification" (safe) or "the service goes down until you manually roll back" (real outage risk). This is answerable by checking Render's current dashboard/docs for the account's specific plan, not by reading this repository.
**Fix (safe regardless of the answer above):** Consider splitting migration from app start — e.g., a Render "pre-deploy command" (if available on this plan) or a separate manual/CI-triggered migration step run before deploy, so a failed migration is caught before the app's own health check is ever at stake. This is a deployment-process change, not a code change — flagging for awareness rather than as a Phase 8 code fix.

---

## Checked, no finding

- **Both workflows correctly scope their triggers with `paths:` filters** (`backend.yml:6-7,11-12`, `frontend.yml:6-7,11-12`) — a backend-only change doesn't waste CI minutes on the frontend job and vice versa. Reasonable for a solo project.
- **The Netlify deploy step correctly gates on the `test` job succeeding first** (`frontend.yml:36`: `needs: test`) and only runs on `main` (`:38`) — the wiring is correct; it's what the "test" job actually checks (TEST-2) that's the gap, not the gating logic itself.
- **No secrets are hardcoded in either workflow file** — `NETLIFY_AUTH_TOKEN`/`NETLIFY_SITE_ID` are correctly sourced from `${{ secrets.* }}` (`frontend.yml:58-59`).

---

*Continuing to Phase 5 (Dependency & Supply Chain).*
