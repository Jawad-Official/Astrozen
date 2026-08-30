# Astrozen — Phase 2: Correctness & Bug Hunt Findings

**Date:** 2026-08-30 · **Scope:** Backend + Frontend, per `AUDIT_PLAN.md` Phase 2 checklist
**Method:** Live `alembic check` against a throwaway SQLite DB built from `alembic upgrade head`, full-file reads of every service touching I/O, and a full-file frontend correctness pass (Zustand stores, loading/error states, `useEffect` cleanup, route guards) run in parallel. Same evidence rules as Phase 1: every finding cites a file:line personally read; anything unconfirmed is marked "needs verification."

Total: **2 High · 3 Medium (2 backend, 1 frontend) · 7 Low (3 backend, 4 frontend)**, plus 9 explicitly-verified clean items.

---

## High

### BUG-1: `teams.identifier` — model allows 5 characters, the Postgres column only allows 3
**Severity:** High — silently correct in SQLite dev, a guaranteed unhandled 500 in Postgres production the moment a team is created with a 4-5 character custom identifier. This is a concrete, live instance of the exact "SQLite vs. Postgres migration drift" risk the audit brief called out `ensure_runtime_schema()` as evidence of.
**File:** `Backend/app/models/team_model.py:57` (model) vs. `Backend/alembic/versions/fdf4ab59a20e_upadate_identifier_to_3_char_max.py:18-22` (last migration to touch this column, and no later migration reverts it) vs. `Backend/app/schemas/team.py:8` (no `max_length`) vs. `Backend/app/services/team_service.py:35-37` (user value passed through unmodified).
**Evidence:**
```python
# team_model.py:57 — the SQLAlchemy model (what the ORM/dev-SQLite sees)
identifier = Column(String(5), nullable=False)
```
```python
# alembic/versions/fdf4ab59a20e...py:18-22 — the last migration to touch this column (Feb 2026)
batch_op.alter_column('identifier', existing_type=sa.VARCHAR(length=5),
                       type_=sa.String(length=3), existing_nullable=False)
# no later migration in the chain (checked: 8d7152ffd8f0, 5f033e3abb1d, 6b3c0d8f2a11,
# b000731f8eae, eaab564ba700) touches teams.identifier again
```
```python
# schemas/team.py:8 — Pydantic schema puts NO ceiling on length
identifier: Optional[str] = None

# team_service.py:35-37 — user-supplied value used verbatim if present
identifier = team_in.identifier
if not identifier:
    identifier = Team.generate_identifier(team_in.name)   # only the auto-generated fallback truncates to 3
```
Confirmed live via `alembic check` in this session (run against a fresh SQLite DB migrated to head): the tool's own type-mismatch noise for every UUID PK/FK is a known SQLite-reflection artifact (SQLite has no native UUID type, so `alembic check` always reports `NUMERIC()`→`UUID()` "changes" that aren't real — safe to ignore), but the **`teams.identifier` VARCHAR(length)` mismatch is not part of that noise pattern** — it's a genuine divergence between what the model declares and what the last migration actually created.
**Impact:** `POST /api/v1/teams` with a `TeamCreate.identifier` of 4 or 5 characters passes Pydantic validation (no `max_length`), succeeds silently against SQLite dev (SQLite does not enforce `VARCHAR(n)` length limits at all), and raises `psycopg2.errors.StringDataRightTruncation: value too long for type character varying(3)` on the very first attempt in Postgres production — a bug that is structurally invisible in local development and only reproduces after a real deploy.
**Fix:** Either (a) add a migration to widen `teams.identifier` to `VARCHAR(5)` to match the model (if 5 chars was an intentional later product decision), or (b) add `identifier: Optional[str] = Field(None, max_length=3)` to `TeamCreate`/`TeamUpdate` and change the model back to `String(3)` if 3 was intentional. Given the model was apparently widened after the migration without anyone re-running `alembic revision --autogenerate`, (a) is more likely the intended fix. Effort: **S**.

---

### BUG-2: Every I/O-bound service call is synchronous, blocking the single-process event loop
**Severity:** High — under any concurrent load, one user's AI generation, Drive sync, or R2 upload stalls every other request the server is handling, because there is zero threadpool/async offload anywhere in the codebase.
**File:** repo-wide (`grep -rn "run_in_threadpool\|asyncio.to_thread" Backend/app` → zero matches). Confirmed blocking call sites:
- `Backend/app/services/ai_service.py:1,84-88,180-185` — `from openai import OpenAI` (the **synchronous** client, not `AsyncOpenAI`); `_call_ai` is a plain `def` calling `self.client.chat.completions.create(...)`, invoked from inside `async def generate_clarification_questions`/`validate_idea`/`generate_blueprint`/`generate_doc`/etc. (15 `async def` methods in this file alone).
- `Backend/app/services/document_service.py:24-118` — every method is `async def`, but every actual network call inside is the **synchronous** googleapiclient idiom: `self.drive_service.files().create(...).execute()` (:44-48), `.permissions().create(...).execute()` (:72-77), `.files().export(...).execute()` (:92-95), `.documents().batchUpdate(...).execute()` (:110-113), `.files().delete(...).execute()` (:118) — none wrapped in a thread offload.
- `Backend/app/services/storage_service.py:33-58` — `upload_content`/`get_content` are `async def` wrapping **synchronous** `boto3` calls (`self.s3_client.put_object(...)`, `.get_object(...)`) with no `run_in_threadpool`.
**Evidence:**
```python
# ai_service.py:180-185
def _call_ai(self, prompt: str, **kwargs) -> Any:
    return self.client.chat.completions.create(...)   # blocking HTTP call, no await, no thread offload
```
**Impact:** `render.yaml`'s `startCommand` runs plain `uvicorn app.main:app --host 0.0.0.0 --port $PORT` with no `--workers` flag — a single process, single event loop. Every one of the ~15 AI-generation routes (which can take several seconds to get an LLM completion back from OpenRouter) and every Drive/R2 call blocks that one event loop for its full duration, during which **no other request of any kind** (a different user's login, a health check, an unrelated list query) can be serviced. This is a direct scalability ceiling, not a hypothetical one — it will reproduce as soon as two users hit the app at the same time and one is generating an AI document.
**Fix:** Wrap each blocking call site in `starlette.concurrency.run_in_threadpool(...)` (already a FastAPI/Starlette dependency, zero new packages) — e.g. `await run_in_threadpool(self.client.chat.completions.create, model=..., messages=...)`. This is the smallest fix; the more thorough fix (swapping to `AsyncOpenAI` and an async Google client) is a larger refactor not justified at this stage. Effort: **M** — mechanical, but touches ~10 call sites across 3 files.

---

## Medium

### BUG-3: `list_projects` has zero eager loading despite serializing 5 relationships — N+1 on every call
**Severity:** Medium — a real, reproducible N+1 on what is likely the most-visited list endpoint in the app; severity capped at Medium rather than High because it's a performance/cost issue, not a correctness/data-integrity one, and the project counts for a solo-founder-stage app are probably still small enough not to be a crisis yet.
**File:** `Backend/app/crud/project.py:28-48` (`get_filtered`, the query backing `GET /api/v1/projects`) vs. `Backend/app/schemas/project.py:179-190` (`Project` response schema).
**Evidence:**
```python
# crud/project.py:43 — no .options(...) anywhere in this method
query = db.query(Project).join(Project.team)
```
```python
# schemas/project.py:180-186 — five relationships serialized per project
lead: Optional[UserBase] = None
members: List[UserInDB] = []
teams: List[TeamSchema] = []
updates: List[ProjectUpdateLog] = []
resources: List[ProjectResource] = []
```
All five (`Project.lead`, `.members`, `.teams`, `.updates`, `.resources`) are standard SQLAlchemy `relationship()`s with no `lazy=` override (default lazy/select loading), confirmed in `Backend/app/models/project.py`. Every one of them triggers a separate lazy-load query per project row during Pydantic's `from_attributes=True` serialization.
**Impact:** Listing N projects issues 1 (base query) + up to 5×N additional queries. At even modest project counts (a few dozen), this is a visibly slow endpoint; it will get worse linearly as the product grows, with no code change required to trigger it.
**Fix:** Add `.options(joinedload(Project.lead), selectinload(Project.members), selectinload(Project.teams), selectinload(Project.updates), selectinload(Project.resources))` to `get_filtered`'s query — the same `selectinload` pattern already used correctly in `crud/feature.py:19-23` for `Feature.milestones`. Effort: **S**.

### BUG-4: `Feature.sub_features` is lazy-loaded in both feature-list queries
**Severity:** Medium — same category as BUG-3, smaller blast radius (one relationship, not five).
**File:** `Backend/app/crud/feature.py:19-38` (`get_by_project`, `get_multi_by_user_projects`) vs. `Backend/app/models/feature.py:75-77` (`sub_features` relationship, no `lazy=` override) vs. `Backend/app/schemas/feature.py:67` (`sub_features: List['Feature']` serialized).
**Evidence:**
```python
# crud/feature.py:21-23 — milestones IS eager-loaded, sub_features is not
return db.query(Feature).options(
    selectinload(Feature.milestones)
).filter(Feature.project_id == project_id).all()
```
The codebase clearly knows the `selectinload` pattern (applies it correctly to `milestones`) — `sub_features` was simply missed.
**Fix:** Add `selectinload(Feature.sub_features)` alongside the existing `selectinload(Feature.milestones)` in both CRUD methods. Effort: **S**.

### BUG-5: `documents.py` returns raw internal exception text to the client in 5 handlers
**Severity:** Medium — an information-disclosure-flavored correctness bug: FastAPI's own default (`debug=False`, confirmed — `Backend/app/main.py:52-57` never passes `debug=True`) already prevents accidental traceback leakage app-wide via Starlette's `ServerErrorMiddleware`, so this is not a global gap — but these 5 handlers explicitly opt back into leaking by echoing `str(e)` into the response body.
**File:** `Backend/app/api/v1/documents.py:44, 100, 159, 192, 229` — every handler with a broad `try/except Exception as e:` wraps it as `raise HTTPException(status_code=500, detail=str(e))`.
**Evidence:**
```python
# documents.py:16-46 (create_document)
except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))
```
Traced representative exception sources reaching this: Google API errors (`googleapiclient.errors.HttpError`, whose `str()` includes the full request/response body from Google, including the Drive/Docs API endpoint and error reason), boto3 `ClientError` (includes the R2 bucket name and request ID), and SQLAlchemy `IntegrityError` (includes the raw failing SQL statement and bound parameter values — see BUG-1/BUG-8's identifier-collision scenario, which would surface here verbatim).
**Impact:** A client (including an unauthenticated one, if the underlying handler's own auth check is bypassed by one of Phase 1's IDOR findings) can learn internal infrastructure details — Google API error internals, R2 bucket naming, raw SQL — from a 500 response instead of a generic message.
**Fix:** Replace `detail=str(e)` with a fixed generic message (`"An internal error occurred"`) in all 5 sites, and rely on the existing `logger`/`log_event` calls (or add one) to capture the real exception server-side for debugging. Effort: **S**.

---

## Low

### BUG-6: `convert_to_project`'s multi-step create swallows kanban-issue-creation errors silently
**Severity:** Low — not a data-corruption risk (SQLAlchemy's session-per-request model means a mid-transaction failure before `commit()` would raise, not partially persist), but a silent-failure risk: the user is told the conversion succeeded even when the issue-creation step failed entirely.
**File:** `Backend/app/api/v1/ai_projects.py:2093-2118` (also flagged by `bandit` as `B110:try_except_pass`, confirmed by direct read — not a false positive like the `B608` hit in Phase 1).
**Evidence:**
```python
# ai_projects.py:2094-2118 (inside convert_to_project)
try:
    kanban_data = ast.literal_eval(kanban_asset.content)
    ...
    for i, issue_data in enumerate(kanban_data):
        ...
        db.add(issue)
except:
    pass   # <-- ANY exception here — malformed AI-generated kanban content, a KeyError on
           #     issue_data["title"], anything — is silently discarded
idea.status = IdeaStatus.COMPLETED
idea.project_id = new_project.id
...
db.commit()   # commits regardless of whether any issues were actually created
```
**Impact:** If the stored kanban asset content is malformed (e.g., the AI model returned slightly invalid structure, or a field the code expects is missing), the entire issue-creation loop aborts with zero indication — the project and its features are still created and the idea is marked `COMPLETED`, but the user has no way to know their issues weren't imported, and no error is logged.
**Fix:** Change `except:` to `except Exception as e:` and at minimum `logger.error(f"Failed to create issues from kanban data for idea {idea_id}: {e}")` — cheap, and turns a silent data-loss bug into a debuggable one. Effort: **S**.

### BUG-7: Dead per-user Google OAuth token-refresh subsystem (correctness/dead-code, cross-referenced with SEC-10)
**Severity:** Low, informational — corrects a Phase-0 assumption rather than reporting new risk.
**File:** `Backend/app/tasks/sync_drive_to_r2.py:13-50` (`refresh_google_token`) and `Backend/app/services/document_service.py:79-84` (`_decrypt_user_tokens`) — both confirmed via repo-wide grep to be **defined but never called anywhere**.
**Evidence:** `Backend/app/services/document_service.py:19-22` shows all real Drive/Docs API access goes through a single shared service account (`get_service_account_credentials()`), not per-user OAuth tokens — so the background sync job (`sync_all_documents_to_r2`, `sync_drive_to_r2.py:53-71`) never needs to refresh a user's token, because it never reads one in the first place.
**Correction to `AUDIT_PLAN.md` candidate C-11:** the plan speculated that the sync job might silently fail on expired per-user tokens because `refresh_google_token` is never called. That's true as a dead-code observation, but the practical conclusion is different: the sync job doesn't use per-user tokens at all, so this dead code has **no effect on sync reliability**. Confirmed instead: `sync_all_documents_to_r2` (`:53-71`) DOES correctly isolate per-document failures via a `try/except` inside its loop (`:60-65`) — one broken document does not stop the sync of others. This part of C-11 is **resolved as a non-issue**.
**Fix:** No functional fix needed. Recommend deleting `refresh_google_token` and `_decrypt_user_tokens` as dead code (Phase 3), or wiring them in if per-user Drive access is ever actually implemented.

### BUG-8: `documents.r2_path` unique-constraint collision surfaces as an unhandled 500 (cross-referenced with SEC-B3)
**Severity:** Low — see SEC-B3 in `SECURITY_FINDINGS.md` for the full input-validation analysis; noted here as its correctness-side counterpart.
**File:** `Backend/app/api/v1/documents.py:16-27` (unvalidated `title` → `r2_path`), `:24` (`Document.r2_path` `unique=True` in the model).
**Impact:** Two documents whose titles collide after `.replace(' ', '_').lower()` (e.g. "Report" and "REPORT") produce the same `r2_path`; the second insert raises an `IntegrityError`, caught by BUG-5's `except Exception as e: raise HTTPException(500, detail=str(e))`, returning a raw driver error to the client instead of a clean "a document with this name already exists" message.
**Fix:** Catch `sqlalchemy.exc.IntegrityError` specifically and return a 409 with a clear message; combine with SEC-B3's fix (slugify + server-generated key) to prevent the collision from being reachable at all. Effort: **S**.

---

## Checked, no finding

- **Alembic migration chain is linear and applies cleanly.** `alembic upgrade head` against a fresh SQLite DB in this session applied all 7 migrations without error, ending at `eaab564ba700` with no branch points.
- **`alembic check` UUID-type noise is a known SQLite-reflection limitation, not real drift.** SQLite has no native UUID column type, so every `UUID`-typed column in the models is reflected back as `NUMERIC()` by SQLAlchemy's SQLite dialect on inspection, making `alembic check` report a "type change" on every single UUID PK/FK in the schema. This reproduces on any SQLAlchemy+SQLite+UUID project and does not indicate a real Postgres-side problem — the one exception (`teams.identifier`) is BUG-1 above, which is real because it's a length change on a `String`/`VARCHAR` type, not a UUID-reflection artifact.
- **APScheduler's overlap protection is safe by default.** `BackgroundScheduler.add_job` (`main.py:40`) doesn't override `max_instances`, which defaults to `1` in APScheduler — if `run_sync_task` ever takes longer than the 15-minute interval, the next tick is skipped rather than piling up concurrent runs. No misfire-storm risk.
- **Per-document sync failure isolation is correctly implemented.** `sync_all_documents_to_r2` (`tasks/sync_drive_to_r2.py:60-65`) wraps each document's sync in its own `try/except`, logging and continuing — one broken document/token does not halt the batch. (See BUG-7 for the related but separate dead-code finding.)
- **`list_issues` is correctly eager-loaded and org-scoped** (`crud/issue.py:231`, `joinedload(Issue.assignee)`, filtered by `Team.organization_id`) — a positive counter-example showing the codebase knows the right patterns; the N+1/scoping gaps found elsewhere are inconsistency, not ignorance of the pattern.
- **Background-task DB session handling is correct.** `update_project_md_background` (`features.py:30-45`), invoked via FastAPI's `BackgroundTasks`, opens its own `SessionLocal()` and closes it in a `finally` block rather than reusing the request-scoped session — the right pattern for code that outlives the request.

---

## Frontend correctness (Medium)

### BUG-9: 14 of 22 `issueStore` mutation actions swallow API errors silently; 8 correctly rethrow
**Severity:** Medium — users get false "success" feedback for the majority of mutation actions when the underlying API call actually failed.
**File:** `Frontend/src/store/issueStore.ts`.
**Evidence:**
```ts
// Swallows on failure (resolves normally, caller can never detect it) — 14 actions, e.g.:
updateIssue: async (id, updates) => {
  try {
    const updated = await issueService.update(id, updates);
    set((state) => ({ issues: state.issues.map((i) => i.id === id ? updated : i) }));
  } catch (error) {
    console.error('Failed to update issue', error);   // no `throw error`
  }
},
```
8 actions (`updateProject`, `deleteProject`, `addProjectUpdate`, `addUpdateComment`, `addProjectResource`, `addTeam`, `updateTeam`/`deleteTeam`, `addFeature`, `addComment`) correctly rethrow; 14 (`addIssue`, `updateIssue`, `deleteIssue`, `deleteProjectUpdate`, `deleteUpdateComment`, both reaction toggles, `deleteProjectResource`, `updateFeature`, `deleteFeature`, all 4 milestone actions, `toggleProjectFavorite`) do not. The split looks like an unintentional evolution rather than a deliberate design choice.
**Impact:** Any component doing `await updateIssue(...); toast.success('Saved')` shows a success toast even when the PATCH failed server-side — including on the 403s that Phase 1's authorization fixes (`check_can_edit_issue`, `check_can_edit_feature`) will start correctly returning once applied.
**Fix:** Add `throw error;` after `console.error(...)` in the 14 listed actions, matching the 8 that already do it. Effort: **S** — mechanical, one file.

## Frontend correctness (Low)

### BUG-10: `saveFilter`/`deleteFilter` are no-op stubs
**File:** `Frontend/src/store/issueStore.ts:627-631`. `savedFilters: SavedFilter[]` exists in state and is initialized to `[]`, but `saveFilter` discards its argument and `deleteFilter` does nothing — there is no way to ever create a saved filter via this store. **Fix:** implement persistence or remove the affordance if a "Save Filter" UI control exists (needs verification against the calling component). Effort: **S**-**M**.

### BUG-11: `setSelectedIssue` has no request-ordering guard — rapid issue switching can show stale comments/activities
**File:** `Frontend/src/store/issueStore.ts:583-598` (same pattern in `addComment:636-648`). Clicking issue A then B before A's fetch resolves can leave B selected while showing A's comments/activities if A's response arrives later. **Fix:** capture `issueId` at call time and check it still matches `get().selectedIssueId` before `set()`-ing the fetched data. Effort: **S**.

### BUG-12: `notificationStore` mutations swallow errors with zero user-facing feedback
**File:** `Frontend/src/store/notificationStore.ts:34-58`. Contrast with `aiStore.ts`, which calls `toast.error(...)` in all 12 of its mutation actions — the working pattern this store should copy. **Fix:** add matching `toast.error(...)` calls. Effort: **S**.

### BUG-13: `fetchNodeDetails` fails silently in the blueprint canvas
**File:** `Frontend/src/pages/projects/[projectId]/PlansTab.tsx:686-693`. Clicking a blueprint node to view its details produces no visible feedback on fetch failure — indistinguishable from a slow network call. **Fix:** add `toast.error(...)` in the catch. Effort: **S**.

## Frontend — checked, no finding

- **`aiStore.ts` (all 12 mutation actions) is clean** — every action calls `toast.error(...)` with the specific backend error message when available, and consistently resets loading state on both success and failure. This is the pattern BUG-9/12/13 should copy.
- **No stale-state duplication between two copies of the same entity.** Neither `issueStore` nor `aiStore` keeps a derived/cached copy of server data that could diverge from the primary array — all `getFiltered*`/`getMyIssues`/`getIssueById` selectors compute fresh from `state.issues` on every call. The specific pattern the audit brief anticipated (Zustand vs. TanStack Query divergence) doesn't exist since TanStack Query is never actually used (confirmed in `AUDIT_PLAN.md` §0.7b).
- **`useEffect` cleanup is correct at all 4 real listener sites** (`ThemeContext.tsx:25-43`, `hooks/use-mobile.tsx:8-16`, `PlansTab.tsx:330-358` — `pointermove`/`pointerup` listeners, matching cleanup). No `setInterval`/`setTimeout` exists anywhere in `Frontend/src` — no interval-leak risk to check.
- **Unhandled promise rejections — 3 of 4 checked `.then(` sites are safe.** `CreateTeamDialog.tsx:42` and `Mermaid.tsx:72` both have real `.catch()` handlers; `ai-generator/page.tsx:928`'s bare `.then()` is safe by construction because the called action (`aiStore.generateDoc`) never rethrows. One minor, narrow gap noted but not written up as a full finding: `Mermaid.tsx:18`'s dynamic `import('mermaid').then(...)` has no `.catch()` — a failed chunk load would leave `isReady` permanently `false` with no user-facing error.
- **Route guards are complete.** Only `/login`, `/register`, and the `*` → `NotFound` catch-all are unguarded (correctly); every other route is nested inside `<RequireAuth>`.
- **`AuthContext` performs a real server-side check, not blind trust of `localStorage`.** A `token`'s presence triggers a real `GET /auth/me` round-trip before `user` is set and before `isLoading` clears — a stale or tampered-but-well-formed token does not render the app "logged in" with fabricated data; the failed `/me` call leaves `user: null` and `RequireAuth` redirects to `/login`. One UX rough edge, not a security bug: the catch block deliberately does not auto-clear the token on a failed check (to tolerate transient network errors), so a genuinely expired token leaves the user on a blank state until they navigate — `RequireAuth` still redirects correctly at that point.
