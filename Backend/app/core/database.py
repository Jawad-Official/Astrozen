from sqlalchemy import create_engine
from sqlalchemy import inspect
from sqlalchemy import text
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Create database engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=False
)

# Create session maker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()


# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_runtime_schema() -> None:
    if not settings.DATABASE_URL.startswith("sqlite"):
        return

    required_user_columns = {
        "username": "VARCHAR",
        "google_access_token": "VARCHAR",
        "google_refresh_token": "VARCHAR",
        "google_token_expires_at": "DATETIME",
    }

    with engine.begin() as connection:
        existing_columns = {
            column["name"] for column in inspect(connection).get_columns("users")
        }
        for column_name, column_type in required_user_columns.items():
            if column_name in existing_columns:
                continue
            connection.execute(text(f"ALTER TABLE users ADD COLUMN {column_name} {column_type}"))
