

from app.core.config import settings
from sqlalchemy import create_engine, text

def reset_database():
    """Drop all tables and enums to reset the database"""
    print(f"Resetting database at {settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else '...'}")
    
    # Create engine
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        conn.execution_options(isolation_level="AUTOCOMMIT")
        
        print("Dropping public schema...")
        # Drop schema public cascade drops everything
        conn.execute(text("DROP SCHEMA public CASCADE;"))
        conn.execute(text("CREATE SCHEMA public;"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO public;"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO postgres;"))
        
        print("Database reset complete.")

if __name__ == "__main__":
    reset_database()
