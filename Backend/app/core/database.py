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

    required_columns = {
        "users": {
            "username": "VARCHAR",
            "google_access_token": "VARCHAR",
            "google_refresh_token": "VARCHAR",
            "google_token_expires_at": "DATETIME",
            "oauth_provider": "VARCHAR",
        },
        "documents": {
            "idea_id": "UUID",
        },
    }

    with engine.begin() as connection:
        tables = inspect(connection).get_table_names()
        for table_name, columns in required_columns.items():
            if table_name not in tables:
                continue
            existing_columns = {
                col["name"] for col in inspect(connection).get_columns(table_name)
            }
            for col_name, col_type in columns.items():
                if col_name in existing_columns:
                    continue
                connection.execute(
                    text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}")
                )
