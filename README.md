# Astrozen

> Turn raw ideas into structured plans, generated code-readiness docs, and actionable tickets.

**Still in progress.** Core flows are present; expect follow-up updates as features and docs evolve.

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

## Planned and In Progress

- Frontend linting and theme passes remain open in several screens.
- Some backend endpoints still use broad error handling.
- Deployment automation, production database migrations, and live auth flow hardening are incremental work.

## License

MIT
