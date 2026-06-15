# Astrozen API - FastAPI Backend

A comprehensive RESTful API backend for Astrozen project management application built with FastAPI and PostgreSQL.

## Features

- **User Authentication**: JWT-based authentication with secure password hashing
- **Issue Management**: Complete CRUD operations for issues with filtering, search, and triage
- **Project Management**: Projects with health tracking, milestones, updates, and resources
- **Cycle Management**: Sprint/cycle management for agile workflows
- **Labels & Organization**: Customizable labels with color coding
- **Comments & Activities**: Full activity tracking and commenting system
- **Custom Views & Filters**: Save and manage custom views and filters
- **Analytics**: Comprehensive insights and statistics

## Technology Stack

- **Framework**: FastAPI 0.109.0
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy 2.0
- **Migrations**: Alembic
- **Authentication**: JWT (python-jose)
- **Password Hashing**: passlib with bcrypt
- **Validation**: Pydantic v2
- **Testing**: pytest

## Project Structure

```
Backend/
├── alembic/                    # Database migrations
│   ├── versions/
│   ├── env.py
│   └── script.py.mako
├── app/
│   ├── api/                    # API routes
│   │   ├── deps.py             # Dependencies (auth, db)
│   │   └── v1/
│   │       ├── auth.py         # Authentication endpoints
│   │       ├── issues.py       # Issue endpoints
│   │       ├── projects.py     # Project endpoints
│   │       ├── labels.py       # Label endpoints
│   │       └── __init__.py     # API router
│   ├── core/                   # Core configuration
│   │   ├── config.py           # Settings
│   │   ├── database.py         # Database connection
│   │   └── security.py         # Auth & security
│   ├── models/                 # SQLAlchemy models
│   │   ├── user.py
│   │   ├── team.py
│   │   ├── issue.py
│   │   ├── project.py
│   │   ├── label.py
│   │   ├── cycle.py
│   │   ├── comment.py
│   │   ├── activity.py
│   │   └── custom_view.py
│   ├── schemas/                # Pydantic schemas
│   │   ├── user.py
│   │   ├── issue.py
│   │   ├── project.py
│   │   ├── comment.py
│   │   └── label.py
│   └── main.py                 # FastAPI application
├── tests/                      # Test files
├── .env.example                # Environment template
├── .gitignore
├── alembic.ini                 # Alembic config
├── requirements.txt            # Python dependencies
└── README.md
```

## Database Schema

### Main Tables

- **users** - User accounts and authentication
- **teams** - Team organization
- **labels** - Issue categorization labels
- **cycles** - Sprints/cycles for agile workflows
- **projects** - Project management
  - **milestones** - Project milestones
  - **project_updates** - Status updates
  - **project_resources** - Linked resources
- **issues** - Issue tracking
- **comments** - Issue comments
- **activities** - Activity history
- **custom_views** - User-defined views
- **saved_filters** - Saved filter configurations

### Association Tables

- **user_teams** - Many-to-many: Users ↔ Teams
- **project_members** - Many-to-many: Projects ↔ Users
- **project_teams** - Many-to-many: Projects ↔ Teams
- **issue_labels** - Many-to-many: Issues ↔ Labels

## Setup Instructions

### Prerequisites

- Python 3.11 or higher
- PostgreSQL 14 or higher
- pip (Python package manager)

### Installation

1. **Create a virtual environment**:

```bash
cd Backend
python -m venv venv

# On Windows
venv\Scripts\activate

# On macOS/Linux
source venv/bin/activate
```

2. **Install dependencies**:

```bash
pip install -r requirements.txt
```

3. **Set up PostgreSQL**:

```bash
# Create database
createdb astrozen

# Or using psql
psql -U postgres
CREATE DATABASE astrozen;
\q
```

4. **Configure environment variables**:

```bash
# Copy the example file
copy .env.example .env  # Windows
cp .env.example .env    # macOS/Linux

# Edit .env and update:
# - DATABASE_URL with your PostgreSQL connection string
# - SECRET_KEY with a secure random string
```

5. **Run database migrations**:

```bash
# Create initial migration (if needed)
alembic revision --autogenerate -m "Initial migration"

# Apply migrations
alembic upgrade head
```

### Running the Server

**Development mode** (with auto-reload):

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Production mode**:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

The API will be available at:

- API: `http://localhost:8000`
- Interactive docs (Swagger): `http://localhost:8000/docs`
- Alternative docs (ReDoc): `http://localhost:8000/redoc`

## API Endpoints

### Authentication

| Method | Endpoint                | Description             |
| ------ | ----------------------- | ----------------------- |
| POST   | `/api/v1/auth/register` | Register new user       |
| POST   | `/api/v1/auth/login`    | Login and get JWT token |
| GET    | `/api/v1/auth/me`       | Get current user info   |

### Issues

| Method | Endpoint                         | Description                |
| ------ | -------------------------------- | -------------------------- |
| GET    | `/api/v1/issues`                 | List issues (with filters) |
| POST   | `/api/v1/issues`                 | Create issue               |
| GET    | `/api/v1/issues/my-issues`       | Get user's issues          |
| GET    | `/api/v1/issues/inbox`           | Get triage issues          |
| GET    | `/api/v1/issues/{id}`            | Get issue details          |
| PATCH  | `/api/v1/issues/{id}`            | Update issue               |
| DELETE | `/api/v1/issues/{id}`            | Delete issue               |
| POST   | `/api/v1/issues/{id}/comments`   | Add comment                |
| GET    | `/api/v1/issues/{id}/comments`   | Get comments               |
| GET    | `/api/v1/issues/{id}/activities` | Get activities             |

### Projects

| Method | Endpoint                                 | Description      |
| ------ | ---------------------------------------- | ---------------- |
| GET    | `/api/v1/projects`                       | List projects    |
| POST   | `/api/v1/projects`                       | Create project   |
| GET    | `/api/v1/projects/{id}`                  | Get project      |
| PATCH  | `/api/v1/projects/{id}`                  | Update project   |
| DELETE | `/api/v1/projects/{id}`                  | Delete project   |
| POST   | `/api/v1/projects/{id}/milestones`       | Create milestone |
| PATCH  | `/api/v1/projects/{id}/milestones/{mid}` | Update milestone |
| DELETE | `/api/v1/projects/{id}/milestones/{mid}` | Delete milestone |

### Labels

| Method | Endpoint              | Description  |
| ------ | --------------------- | ------------ |
| GET    | `/api/v1/labels`      | List labels  |
| POST   | `/api/v1/labels`      | Create label |
| PATCH  | `/api/v1/labels/{id}` | Update label |
| DELETE | `/api/v1/labels/{id}` | Delete label |

## Usage Examples

### Register a new user

```bash
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "johndoe",
    "full_name": "John Doe",
    "password": "securepassword"
  }'
```

### Login

```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=johndoe&password=securepassword"
```

### Create an issue (authenticated)

```bash
curl -X POST "http://localhost:8000/api/v1/issues" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Fix authentication bug",
    "description": "Users are getting logged out unexpectedly",
    "status": "todo",
    "priority": "high"
  }'
```

## Testing

Run tests with pytest:

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_api/test_issues.py
```

## Database Migrations

### Create a new migration

```bash
alembic revision --autogenerate -m "Description of changes"
```

### Apply migrations

```bash
# Upgrade to latest
alembic upgrade head

# Upgrade one version
alembic upgrade +1

# Downgrade one version
alembic downgrade -1
```

### View migration history

```bash
alembic history
alembic current
```

## Environment Variables

| Variable                      | Description                  | Default                                                   |
| ----------------------------- | ---------------------------- | --------------------------------------------------------- |
| `DATABASE_URL`                | PostgreSQL connection string | `postgresql://postgres:password@localhost:5432/astrozen`  |
| `SECRET_KEY`                  | Secret key for JWT           | Required                                                  |
| `ALGORITHM`                   | JWT algorithm                | `HS256`                                                   |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiration time        | `30`                                                      |
| `BACKEND_CORS_ORIGINS`        | Allowed CORS origins         | `["http://localhost:5173"]`                               |
| `PROJECT_NAME`                | API project name             | `Astrozen API`                                            |

## Security Notes

- Always use HTTPS in production
- Change the default `SECRET_KEY` to a secure random string
- Use environment variables for sensitive data
- Implement rate limiting for production
- Keep dependencies up to date
- Use strong passwords and enforce password policies

## Troubleshooting

### Database connection errors

- Verify PostgreSQL is running: `pg_isready`
- Check DATABASE_URL in `.env`
- Ensure database exists: `psql -l`

### Import errors

- Ensure virtual environment is activated
- Reinstall dependencies: `pip install -r requirements.txt`

### Migration errors

- Check Alembic configuration in `alembic.ini`
- Verify all models are imported in `alembic/env.py`
- Reset database if needed and rerun migrations

## Contributing

1. Create a feature branch
2. Make your changes
3. Write tests
4. Run tests and linting
5. Submit a pull request

## License

MIT License

## Support

For issues and questions, please open an issue in the repository.

## Security Notes

- Always use HTTPS in production
- Change the default `SECRET_KEY` to a secure random string
- Use environment variables for sensitive data
- Implement rate limiting for production
- Keep dependencies up to date
- Use strong passwords and enforce password policies

## Troubleshooting

### Database connection errors

- Verify PostgreSQL is running: `pg_isready`
- Check DATABASE_URL in `.env`
- Ensure database exists: `psql -l`

### Import errors

- Ensure virtual environment is activated
- Reinstall dependencies: `pip install -r requirements.txt`

### Migration errors

- Check Alembic configuration in `alembic.ini`
- Verify all models are imported in `alembic/env.py`
- Reset database if needed and rerun migrations

## Contributing

1. Create a feature branch
2. Make your changes
3. Write tests
4. Run tests and linting
5. Submit a pull request

## License

MIT License

## Support

For issues and questions, please open an issue in the repository.
