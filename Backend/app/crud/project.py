from typing import List, Optional
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import or_, and_
from app.crud.base import CRUDBase
from app.models.project import (
    Project,
    Visibility,
    ProjectUpdate,
    Resource,
    Reaction,
    ProjectUpdateComment,
)
from app.models.enums import ResourceTargetType, ReactionTargetType
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate as ProjectUpdateSchema,
    ProjectUpdateCreate,
    ProjectUpdateLog,
    ProjectResourceCreate,
    ProjectResource as ProjectResourceSchema,
    ProjectUpdateCommentCreate,
    ProjectUpdateComment as ProjectUpdateCommentSchema,
)
from uuid import UUID


class CRUDProject(CRUDBase[Project, ProjectCreate, ProjectUpdateSchema]):
    def get_multi(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[Project]:
        return db.query(self.model).offset(skip).limit(limit).all()

    def get_by_team(
        self, db: Session, *, team_id: UUID, skip: int = 0, limit: int = 100
    ) -> List[Project]:
        return (
            db.query(self.model)
            .filter(self.model.team_id == team_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_multi_by_organization(
        self,
        db: Session,
        *,
        organization_id: UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Project]:
        from app.models.team_model import Team

        return (
            db.query(self.model)
            .join(Team)
            .filter(Team.organization_id == organization_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_multi_by_user(
        self,
        db: Session,
        *,
        user_id: UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Project]:
        from app.models.user import User

        return (
            db.query(self.model)
            .join(User.organization_id == organization_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_user(
        self,
        db: Session,
        *,
        user_id: UUID,
        team_id: Optional[UUID] = None,
    ) -> List[Project]:
        from app.models.team_model import Team
        from app.models.user import User

        query = (
            db.query(self.model)
            .outerjoin(self.model.team)
            .outerjoin(Team.members)
            .filter(
                or_(
                    self.model.lead_id == user_id,
                    User.id == user_id,
                )
            )
        )

        if team_id:
            query = query.filter(self.model.team_id == team_id)

        return query.all()


class CRUDProjectUpdate(
    CRUDBase[ProjectUpdate, ProjectUpdateCreate, ProjectUpdateSchema]
):
    def create_with_author(
        self, db: Session, *, obj_in: ProjectUpdateCreate, author_id: UUID
    ) -> ProjectUpdate:
        obj_in_data = obj_in.model_dump()
        db_obj = ProjectUpdate(**obj_in_data, author_id=author_id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


class CRUDResource(CRUDBase[Resource, ProjectResourceCreate, ProjectResourceSchema]):
    def create(
        self,
        db: Session,
        *,
        obj_in: ProjectResourceCreate,
        target_id: UUID,
        target_type: ResourceTargetType,
    ) -> Resource:
        obj_in_data = obj_in.model_dump()
        db_obj = Resource(**obj_in_data, target_id=target_id, target_type=target_type)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


class CRUDProjectUpdateComment(
    CRUDBase[ProjectUpdateComment, ProjectUpdateCommentCreate, any]
):
    def create_with_author(
        self, db: Session, *, obj_in: ProjectUpdateCommentCreate, author_id: UUID
    ) -> ProjectUpdateComment:
        obj_in_data = obj_in.model_dump()
        db_obj = ProjectUpdateComment(**obj_in_data, author_id=author_id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


class CRUDReaction(CRUDBase[Reaction, any, any]):
    def toggle_update_reaction(
        self, db: Session, *, update_id: UUID, user_id: UUID, emoji: str
    ) -> Optional[Reaction]:
        existing = (
            db.query(Reaction)
            .filter(
                Reaction.target_id == update_id,
                Reaction.target_type == ReactionTargetType.PROJECT_UPDATE,
                Reaction.user_id == user_id,
                Reaction.emoji == emoji,
            )
            .first()
        )

        if existing:
            db.delete(existing)
            db.commit()
            return None

        db_obj = Reaction(
            target_id=update_id,
            target_type=ReactionTargetType.PROJECT_UPDATE,
            user_id=user_id,
            emoji=emoji,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def toggle_comment_reaction(
        self, db: Session, *, comment_id: UUID, user_id: UUID, emoji: str
    ) -> Optional[Reaction]:
        existing = (
            db.query(Reaction)
            .filter(
                Reaction.target_id == comment_id,
                Reaction.target_type == ReactionTargetType.PROJECT_UPDATE_COMMENT,
                Reaction.user_id == user_id,
                Reaction.emoji == emoji,
            )
            .first()
        )

        if existing:
            db.delete(existing)
            db.commit()
            return None

        db_obj = Reaction(
            target_id=comment_id,
            target_type=ReactionTargetType.PROJECT_UPDATE_COMMENT,
            user_id=user_id,
            emoji=emoji,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


project = CRUDProject(Project)
project_update = CRUDProjectUpdate(ProjectUpdate)
resource = CRUDResource(Resource)
project_update_comment = CRUDProjectUpdateComment(ProjectUpdateComment)
reaction = CRUDReaction(Reaction)
