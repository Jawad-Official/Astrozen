# Astrozen

> Turn raw ideas into structured plans, generated code-readiness docs, and actionable tickets.

**Still in progress.** Core flows are present; expect follow-up updates as features and docs evolve.

Platform Site: https://astrozen.netlify.app/

![Projects overview](screenshots/projects.png)
![AI Generator](screenshots/ai-generator.png)
![Issues board](screenshots/issues.png)
![Inbox](screenshots/inbox.png)

## What It Does

Astrozen is a project planning and execution workspace. You bring an idea; Astrozen helps turn that idea into validation, architecture blueprinting, technical documentation, and real implementation work tied together in projects, features, issues, and milestones.

## Who It's For

- Product builders who want validation and structure before coding starts.
- Teams who need a single place for project status, planning artifacts, and issue tracking.
- Founders and operators who want PRD, app flows, schema, and implementation plans generated quickly.

## Screenshots

> `screenshots/*.png` placeholders. Check in real app screenshots under `screenshots/` and the README will render them automatically.

| Area | What You See | Placeholder Image |
| --- | --- | --- |
| Projects | A high-level project surface with status grouping and quick actions such as “New Project” or “Plan with AI”. | `screenshots/projects.png` |
| Project Detail | Project planning, updates, resources, and team context. | `screenshots/project-detail.png` |
| AI Generator | Idea input, AI clarifier, validation report, blueprint, and generated docs workflow. | `screenshots/ai-generator.png` |
| Features | Product capabilities organized under projects, with milestones and sub-features. | `screenshots/features.png` |
| Issues | Kanban and list views for work items, with assignees, status, priority, and comments. | `screenshots/issues.png` |
| Inbox | Unified notifications and review surface for comments, assignments, status changes, and AI outputs. | `screenshots/inbox.png` |
| Insights | Issue analytics, completion rate, cycle time, and workload by assignee or project. | `screenshots/insights.png` |
| Settings | Profile, organization, and team management. | `screenshots/settings.png` |

## Core Features

- **Projects** – Create projects, attach teams, track status and priority, view features and issues in one place.
- **Features and Subfeatures** – Break down products into capabilities with milestones, owners, and health signals.
- **Issues** – Manage work in board or list, support sub-issues and comments, change status and priority in place.
- **AI Idea Validator** – Describe an idea, answer clarifying questions, then get validation, blueprint, and advancement into docs and real tickets.
- **Generated Technical Docs** – PRD, App Flow, Tech Stack, Frontend Guidelines, Backend Schema, and Implementation Plan.
- **Google Docs Workflows** – Embed Google Docs, edit live, sync to backup storage, chat about changes with AI assistance.
- **Inbox** – Consolidated activity feed and notification center.
- **Insights** – Analytics and at-a-glance project and issue health.
- **Teams and Roles** – Organizations, teams, invites, and permission-aware access.

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, shadcn UI, Zustand, React Router, Framer Motion, Mermaid.
- Backend: FastAPI, SQLAlchemy, Alembic, Pydantic, JWT and bcrypt auth.
- Database: SQLite locally, PostgreSQL for production.
- AI: OpenRouter-backed validation, blueprinting, and doc generation.
- Documents and storage: Google OAuth, Google Drive/Docs, R2-compatible storage, background sync via APScheduler.

## Getting the Code

- Source: `https://github.com/Jawad-Official/Astrozen`
- Docs and deeper implementation notes live under `docs/` in the repo.

## Run Locally with Docker

```
docker compose up --build
```

This starts three containers: Postgres, the FastAPI backend (runs Alembic
migrations on boot, then serves on `:18010`), and the built frontend served
by nginx on `:18011`. Open `http://localhost:18011`.

The backend's `JWT_SECRET` in `docker-compose.yml` is a throwaway
dev-only value generated for this stack - regenerate it for your own use,
never reuse it anywhere real. `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`/
`GOOGLE_CLIENT_SECRET`, and the `R2_*` storage variables are left unset,
so AI generation, Google Docs sync, and file storage stay disabled (each
logs a warning and no-ops rather than crashing) until you add real values
under the `backend` service's `environment` block. Everything else -
auth, projects, issues, features, teams - works against the containerized
Postgres out of the box.

## Deployment

`render.yaml` deploys the backend as a single Render web service plus a
Postgres database, both on Render's **free plan**:

- The web service runs a single instance - the free plan doesn't offer
  horizontal scaling, so there's no risk of multiple processes running the
  app at once.
- The free Postgres database is subject to Render's free-tier limits
  (e.g. it expires after a fixed period unless upgraded) - see Render's
  own docs for current terms before relying on this for anything beyond a
  demo/staging deployment.
- The free web service spins down on inactivity and cold-starts on the
  next request, so the first request after idle periods will be slow.

The backend also starts an in-process APScheduler job (`ENABLE_SCHEDULER`,
see `render.yaml` and `app/main.py`) that syncs Google Docs to R2 storage
every 15 minutes. This scheduler is **in-process**, not a separate worker:
every process that boots the app and has `ENABLE_SCHEDULER` set starts its
own copy of the same scheduled job. That's safe today only because the
free plan runs exactly one instance. If this service is ever scaled to
more than one instance or worker process, `ENABLE_SCHEDULER` must be
unset everywhere except one designated instance (or the sync job moved to
a separate Render Cron Job) before scaling - otherwise every instance
fires the same 15-minute sync job independently. `run_sync_task` guards
against overlapping runs *within* a single process, but that guard can't
see across separate processes.

## Planned and In Progress

- Frontend linting and theme passes remain open in several screens.
- Some backend endpoints still use broad error handling.
- Deployment automation, production database migrations, and live auth flow hardening are incremental work.

## License

MIT
