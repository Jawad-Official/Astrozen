import os
from dotenv import load_dotenv

# Load .env from Backend/.env
load_dotenv(os.path.join("Backend", ".env"))

from app.core.database import SessionLocal
from app.models.user import User

def make_admin(email):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.role = "admin"
            db.commit()
            print(f"User {email} is now admin")
        else:
            print(f"User {email} not found")
    finally:
        db.close()

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        make_admin(sys.argv[1])