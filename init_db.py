import sys
import os

# Add Backend to path
sys.path.append(os.path.join(os.getcwd(), "Backend"))

from app.core.database import engine
from app.models import Base

def init_db():
    print("Creating all tables...")
    Base.metadata.create_all(bind=engine)
    print("Done!")

if __name__ == "__main__":
    init_db()
