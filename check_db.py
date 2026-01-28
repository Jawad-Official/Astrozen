import sys
import os

# Add Backend to path
sys.path.append(os.path.join(os.getcwd(), "Backend"))

try:
    from app.core.database import engine
    from sqlalchemy import text
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        print(f"Database connection successful: {result.fetchone()}")
except Exception as e:
    print(f"Database connection failed: {e}")
