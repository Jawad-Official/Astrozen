# Linear Project - Full Stack Application

A comprehensive project management application inspired by Linear, built with React (Frontend) and FastAPI (Backend).

## Project Structure

```
Linear/
├── Backend/              # FastAPI Backend API
│   ├── app/              # Application code
│   │   ├── api/v1/       # API endpoints (auth, issues, projects, labels)
│   │   ├── core/         # Configuration, database, security
│   │   ├── models/       # SQLAlchemy database models (10+ models)
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   └── main.py       # FastAPI application
│   ├── alembic/          # Database migrations
│   ├── tests/            # Test suite
│   ├── requirements.txt  # Python dependencies
│   └── README.md         # Backend documentation
│
└── Frontend/             # React + Vite Frontend
    ├── src/              # Source code
    │   ├── components/   # React components
    │   ├── pages/        # Page components
    │   ├── store/        # Zustand state management
    │   └── types/        # TypeScript types
    ├── public/           # Static assets
    └── package.json      # Node dependencies
```

## Features

### Backend (FastAPI)

- ✅ JWT Authentication
- ✅ User Management
- ✅ Issue Tracking (with auto-generated identifiers)
- ✅ Project Management (with health tracking)
- ✅ Cycle/Sprint Management
- ✅ Labels & Organization
- ✅ Comments & Activity Tracking
- ✅ PostgreSQL Database with Alembic Migrations
- ✅ Comprehensive API Documentation (Swagger/ReDoc)
- ✅ Testing Framework (pytest)

### Frontend (React)

- ✅ Modern UI with Tailwind CSS
- ✅ Issue Management (All Issues, My Issues, Inbox)
- ✅ Project Management
- ✅ Board & List Views
- ✅ Filtering & Search
- ✅ Settings Management
- ✅ Analytics/Insights Dashboard

## Quick Start

### Backend Setup

1. **Prerequisites**:
   - Python 3.11+
   - PostgreSQL

2. **Install & Run**:

   ```bash
   cd Backend
   python -m venv venv
   venv\Scripts\activate  # Windows
   pip install -r requirements.txt

   # Create database
   createdb linear_db

   # Configure .env
   copy .env.example .env
   # Edit .env with your database credentials

   # Run migrations
   alembic upgrade head

   # Start server
   uvicorn app.main:app --reload
   ```

3. **Access API**:
   - API: http://localhost:8000
   - Docs: http://localhost:8000/docs

### Frontend Setup

1. **Prerequisites**:
   - Node.js 18+

2. **Install & Run**:

   ```bash
   cd Frontend
   npm install
   npm run dev
   ```

3. **Access App**:
   - Frontend: http://localhost:5173

## API Endpoints

### Authentication

- `POST /api/v1/auth/register` - Register user
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Get current user

### Issues

- `GET /api/v1/issues` - List issues (with filters)
- `POST /api/v1/issues` - Create issue
- `PATCH /api/v1/issues/{id}` - Update issue
- `DELETE /api/v1/issues/{id}` - Delete issue
- `POST /api/v1/issues/{id}/comments` - Add comment
- `GET /api/v1/issues/{id}/activities` - Get activity log

### Projects

- `GET /api/v1/projects` - List projects
- `POST /api/v1/projects` - Create project
- `PATCH /api/v1/projects/{id}` - Update project
- `POST /api/v1/projects/{id}/milestones` - Add milestone

### Labels

- `GET /api/ v1/labels` - List labels
- `POST /api/v1/labels` - Create label

## Database Schema

- **users** - User accounts
- **teams** - Team organization
- **labels** - Issue labels
- **cycles** - Sprints
- **projects** - Projects with milestones, updates, resources
- **issues** - Issues with status, priority, labels
- **comments** - Issue comments
- **activities** - Change tracking
- **custom_views** - Saved views
- **saved_filters** - Saved filters

## Tech Stack

### Backend

- FastAPI 0.109.0
- PostgreSQL
- SQLAlchemy 2.0
- Alembic (migrations)
- JWT Authentication
- Pydantic v2
- pytest

### Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Zustand (state management)
- shadcn/ui components
- React Router

## Development Status

### ✅ Completed

- Complete backend API with authentication
- All core database models
- 30+ API endpoints
- Frontend UI with all pages
- Issue and project management
- Comments and activity tracking

### 🚧 Next Steps

- Connect frontend to backend API
- Replace mock data with real API calls
- Add error handling and loading states
- Deploy to production

## Documentation

- [Backend README](Backend/README.md) - Complete backend documentation
- [Frontend README](Frontend/README.md) - Frontend setup and usage
- API Docs: http://localhost:8000/docs (when server is running)

## License

MIT License
