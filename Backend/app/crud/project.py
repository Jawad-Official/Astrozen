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
    def get_filtered(
        self,
        db: Session,
        *,
        user_id: UUID,
        user_team_ids: List[UUID],
        team_id: Optional[UUID] = None,
        organization_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100,
        is_admin: bool = False,
    ) -> List[Project]:
        """Get filtered projects with visibility rules"""
        from app.models.team_model import Team

        query = db.query(Project).join(Project.team)

        if organization_id:
            query = query.filter(Team.organization_id == organization_id)

        if team_id:
            query = query.filter(Project.team_id == team_id)

        # Visibility logic:
        # Admins see all in org
        # Members see all in org (as per requirement: "Member can see all projects even if not in it")
        # So we don't need additional filters here if organization_id is provided

        return query.offset(skip).limit(limit).all()

    def create_with_relations(
        self,
        db: Session,
        *,
        obj_in: ProjectCreate,
        member_ids: Optional[List[UUID]] = None,
        team_ids: Optional[List[UUID]] = None,
    ) -> Project:
        """Create project with member and team relations"""
        from app.models.user import User
        from app.models.team_model import Team

        obj_in_data = obj_in.model_dump(exclude={"member_ids", "team_ids"})
        db_obj = Project(**obj_in_data)

        if member_ids:
            members = db.query(User).filter(User.id.in_(member_ids)).all()
            db_obj.members = members

        if team_ids:
            teams = db.query(Team).filter(Team.id.in_(team_ids)).all()
            db_obj.teams = teams

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update_with_relations(
        self,
        db: Session,
        *,
        db_obj: Project,
        obj_in: ProjectUpdateSchema,
    ) -> Project:
        """Update project and its member/team relations"""
        from app.models.user import User
        from app.models.team_model import Team

        update_data = obj_in.model_dump(exclude_unset=True)

        # Handle members
        if "member_ids" in update_data:
            member_ids = update_data.pop("member_ids")
            if member_ids is not None:
                members = db.query(User).filter(User.id.in_(member_ids)).all()
                db_obj.members = members

        # Handle teams
        if "team_ids" in update_data:
            team_ids = update_data.pop("team_ids")
            if team_ids is not None:
                teams = db.query(Team).filter(Team.id.in_(team_ids)).all()
                db_obj.teams = teams

        # Update remaining fields
        for field in update_data:
            setattr(db_obj, field, update_data[field])

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

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
