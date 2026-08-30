# Astrozen — Phase 6: Performance Findings

**Date:** 2026-08-30 · **Scope:** per `AUDIT_PLAN.md` Phase 6 checklist, right-sized for a solo bootstrapped app
**Method:** Real `npm run build` output analyzed directly (no visualizer plugin needed — Vite's own chunk-size report and a `du -sh` pass on `dist/` gave clear enough numbers), full-file reads of every list endpoint and its backing model for pagination/indexing, and a repo-wide grep for any caching infrastructure.

---

## PERF-1: Zero caching around AI generation — every regeneration is a fresh, billable OpenRouter call
**Severity:** Medium — a direct cost problem for a bootstrapped founder, not just a performance one, echoing SEC-C1's rate-limiting finding from a different angle.
**File:** repo-wide (`grep -rn "redis\|memoize\|lru_cache\|cachetools\|@cache" Backend/app` → the only hit is the literal string `"go-redis"` inside an AI prompt template in `ai_service.py:379`, not real usage) — confirmed **zero caching infrastructure of any kind** exists in the backend.
**Relationship to SEC-C1:** rate limiting (already recommended in Phase 1) stops *scripted/abusive* repeated calls. Caching is a separate, complementary lever that would also save cost on *legitimate* repeated calls — e.g., a user double-clicking "Generate" after a slow response, a retry after a client-side timeout, or navigating away and back to a page that re-triggers the same generation on mount. Neither problem is solved by fixing only the other.
**Impact:** Every `generate_document`, `regenerate_doc_section`, `validate_idea`, `generate_blueprint`, etc. call (the same ~15 routes named in SEC-C1) hits OpenRouter fresh every time, even for byte-identical input. There's no evidence in this codebase of a specific duplicate-call bug being triggered today (not asserting one) — this is a structural gap, not a demonstrated incident.
**Fix, sized for a solo dev (no new infrastructure required):** A simple in-process memoization keyed on `(idea_id, doc_type/operation, hash of relevant input fields)` — even a plain `dict` with a TTL, or `functools.lru_cache` on a pure function extracted from the request handler — would catch the double-click/retry case without needing Redis. Only worth adding Redis (or Render's managed key-value add-on) if usage actually grows to where in-process memory limits matter; not recommended now. Effort: **S** for the simple version.

---

## PERF-2: Two list endpoints have no pagination at all
**Severity:** Medium — bounded today by the app's current scale, but both are genuinely unbounded queries with no ceiling as data grows, and one of them (documents) compounds with a missing-index issue (PERF-3).
**File:** `Backend/app/api/v1/documents.py:48-68` (`list_documents`); `Backend/app/api/v1/features.py:50-76` (`list_features`).
**Evidence:**
```python
# documents.py:48-68 — no skip/limit params at all
async def list_documents(project_id: Optional[UUID] = None, idea_id: Optional[UUID] = None, ...):
    query = db.query(Document)
    ...
    docs = query.all()   # returns every matching row, no ceiling
```
```python
# features.py:50-76 — same shape
def list_features(project_id: Optional[UUID] = None, ...):
    ...
    return crud_feature.get_multi_by_user_projects(db, ...)   # .all() internally, no limit
```
Contrast with `issues.py:28-41` and `projects.py:45-50`, which both correctly accept `skip`/`limit` query params with sane defaults (`limit: int = 100`). `teams.py` and `organizations.py`'s member-list endpoint are unbounded too, but those are naturally small-N per organization (a handful of teams, a handful of members) and not flagged as a real risk at this stage.
**Impact:** As a single project or organization accumulates documents or features over time (both are exactly the kind of entity that grows unboundedly with product usage — every AI-generated doc, every feature ever created), these two endpoints will return larger and larger unpaginated JSON payloads with no way for a client to request a page at a time.
**Fix:** Add the same `skip: int = 0, limit: int = 100` pattern already used correctly in `issues.py`/`projects.py` to both routes. Effort: **S**.

---

## PERF-3: `Document.project_id`/`Document.idea_id` have no index despite being the only filter columns on an unbounded query
**Severity:** Low today, compounds directly with PERF-2 as the table grows.
**File:** `Backend/app/models/document.py:21-22`.
**Evidence:** No `__table_args__`/`Index(...)` exists anywhere in `document.py`, while `list_documents` (`documents.py:56-58`) filters exclusively on these two columns. For comparison, every other frequently-filtered FK in the schema has an explicit named index — `Index("idx_features_project_id", ...)`, `Index("idx_issues_team_id", ...)`, `Index("idx_project_ideas_user_id", ...)`, etc. (36 named indexes found across the model files) — the indexing discipline elsewhere in this codebase is genuinely good; `documents.py` is the one gap.
**Fix:** Add `__table_args__ = (Index("idx_documents_project_id", "project_id"), Index("idx_documents_idea_id", "idea_id"))` to the `Document` model, plus a new Alembic migration. Effort: **S**.

---

## Frontend build output

**Real `npm run build` output** (not estimated): total `dist/` size **4.8 MB**. Largest chunks:

| Chunk | Minified | Gzipped |
|---|---:|---:|
| `mermaid` | 2,201.90 kB | 577.14 kB |
| `cytoscape` (transitive, via mermaid) | 644.30 kB | 196.27 kB |
| `index` (main app bundle) | 517.74 kB | 139.49 kB |
| `radix` | 293.35 kB | 92.94 kB |
| `katex` (transitive, via mermaid) | 262.60 kB | 77.51 kB |

**`mermaid` is, by a wide margin, the single heaviest dependency in the app** — larger than the next three chunks combined. **Checked and already correctly mitigated:** `mermaid` is lazy-loaded (`Frontend/src/pages/ai-generator/page.tsx:44`: `const Mermaid = lazy(() => import('@/components/Mermaid'))`), so its 2.2MB chunk is not part of the initial page load — it only downloads when a user actually opens the AI generator's diagram view. `cytoscape` and `katex` are not direct dependencies of this app at all (confirmed: not in `package.json`, zero direct imports) — they're transitive dependencies `mermaid` itself pulls in for certain diagram types and math rendering, and `vite.config.ts:36-46` already manually chunks them separately from the main mermaid bundle, which is good practice for caching even though it doesn't reduce total download size for a user who needs mermaid at all.
**No action recommended** beyond confirming (not found to be violated) that no other code path ever imports `Mermaid` eagerly/statically outside the existing `lazy()` wrapper — worth a quick grep before merging any future feature that touches this component.

---

## DB index coverage — checked, largely clean

Cross-referenced every list/detail endpoint's filter columns from Phases 1-2 against `Index(...)` declarations across all model files: `activities`, `comments`, `custom_views`, `features`, `milestones`, `invite_codes`, `issues`, `notifications`, `organizations`, `projects`, `project_updates`, `project_update_comments`, `resources`, `reactions`, `project_ideas`, `project_assets`, `teams`, `users`, and `user_roles` all have explicit named indexes on the columns actually filtered by their corresponding list endpoints (organization_id, project_id, team_id, status, assignee_id, etc.). **`documents` is the one table missing coverage** — see PERF-3.

---

*Continuing to Phase 7 (Documentation Drift & Final Report).*
