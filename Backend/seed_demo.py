import uuid
from app.core.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.organization import Organization
from app.core.security import get_password_hash
from app.models import (
    user, organization, team_model, project, issue, feature, 
    activity, comment, notification, project_idea, cycle, 
    document, invite_code, custom_view, user_role
)

def seed_db():
    # Create tables
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if user already exists
        email = "user@example.com"
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"User {email} already exists.")
            return

        print(f"Creating demo user {email}...")
        # Create organization
        org = Organization(
            name="Demo Organization",
        )
        db.add(org)
        db.flush() # Get org.id
        
        # Create user
        demo_user = User(
            email=email,
            first_name="Demo",
            last_name="User",
            hashed_password=get_password_hash("password"),
            role="admin",
            is_active=True,
            organization_id=org.id
        )
        db.add(demo_user)
        db.commit()
        print("Database seeded successfully!")
        print(f"Email: {email}")
        print("Password: password")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
