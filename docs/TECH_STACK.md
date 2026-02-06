# Technology Stack

## Frontend (Web Client)

**Core Framework:**

- **React 18:** UI Library.
- **TypeScript:** Type safety.
- **Vite:** Build tool and dev server.

**UI & Styling:**

- **Tailwind CSS:** Utility-first CSS framework.
- **Radix UI:** Headless accessible UI primitives.
- **shadcn/ui:** Reusable component system based on Radix and Tailwind.
- **Lucide React / Phosphor Icons:** Iconography.
- **Framer Motion:** Animations and transitions.

**State & Data:**

- **TanStack Query (React Query):** Server state management, data fetching, caching.
- **Zustand:** Global client state management.
- **React Hook Form:** Form handling.
- **Zod:** Schema validation (used with forms).

**Utilities:**

- **Axios:** HTTP client.
- **date-fns:** Date manipulation.
- **cmdk:** Command palette implementation.

## Backend (API Layer)

**Core Framework:**

- **Python:** Language Runtime.
- **FastAPI:** High-performance web framework.
- **Uvicorn:** ASGI server.

**Database & ORM:**

- **PostgreSQL:** Relational Database.
- **SQLAlchemy 2.0:** ORM (Object Relational Mapper).
- **Alembic:** Database migrations.
- **psycopg2-binary:** PostgreSQL adapter.

**Authentication & Security:**

- **JWT (JSON Web Tokens):** Stateless authentication.
- **Passlib (bcrypt):** Password hashing.
- **Pydantic v2:** Data validation and serialization.

**Testing:**

- **Pytest:** Testing framework.

## Infrastructure & Services

- **Database:** Managed PostgreSQL.
- **Storage:** Cloud Object Storage (AWS S3 / Cloudflare R2).
- **AI Services:** OpenRouter (access to various LLMs).
- **Deployment:** (TBD - Recommended Vercel for Frontend, Railway/Render/AWS for Backend).
