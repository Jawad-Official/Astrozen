from typing import List, Optional
from sqlalchemy.orm import Session, selectinload, joinedload
from app.crud.base import CRUDBase
from app.models.team_model import Team
from app.schemas.team import TeamCreate, TeamUpdate
from uuid import UUID


class CRUDTeam(CRUDBase[Team, TeamCreate, TeamUpdate]):
    """CRUD operations for Team model"""
    
    def get(self, db: Session, id: any) -> Optional[Team]:
        return db.query(Team).options(
            selectinload(Team.leaders),
            selectinload(Team.members)
        ).filter(Team.id == id).first()

    def get_by_organization(
        self, db: Session, *, organization_id: UUID, skip: int = 0, limit: int = 100
    ) -> List[Team]:
        """Get all teams in an organization"""
        return db.query(Team).options(
            selectinload(Team.leaders),
            selectinload(Team.members)
        ).filter(
            Team.organization_id == organization_id
        ).offset(skip).limit(limit).all()
        
    def get_by_identifier(
        self, db: Session, *, organization_id: UUID, identifier: str
    ) -> Optional[Team]:
        """Get team by identifier within organization"""
        return db.query(Team).options(
            selectinload(Team.leaders),
            selectinload(Team.members)
        ).filter(
            Team.organization_id == organization_id,
            Team.identifier == identifier
        ).first()
    
    def add_member(self, db: Session, *, team_id: UUID, user_id: UUID):
        """Add member to team"""
        team = self.get(db, id=team_id)
        if not team:
            return None
            
        from app.models.user import User
        user = db.query(User).get(user_id)
        if not user:
            return None
            
        if user not in team.members:
            team.members.append(user)
            db.commit()
            
        return team
        
    def remove_member(self, db: Session, *, team_id: UUID, user_id: UUID):
        """Remove member from team"""
        team = self.get(db, id=team_id)
        if not team:
            return None
            
        from app.models.user import User
        user = db.query(User).get(user_id)
        if not user:
            return None
            
        if user in team.members:
            team.members.remove(user)
            db.commit()
            
        return team


team = CRUDTeam(Team)
