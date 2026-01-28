from typing import List, Optional
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import or_, and_
from app.crud.base import CRUDBase
from app.models.project import Project, Visibility, ProjectUpdate, ProjectResource, ProjectUpdateComment, ProjectUpdateReaction, ProjectUpdateCommentReaction
from app.schemas.project import (
    ProjectCreate, 
    ProjectUpdate as ProjectUpdateSchema, 
    ProjectUpdateCreate, 
    ProjectUpdateLog,
    ProjectResourceCreate,
    ProjectResource as ProjectResourceSchema,
    ProjectUpdateCommentCreate,
    ProjectUpdateComment as ProjectUpdateCommentSchema,
    ProjectUpdateReactionCreate,
    ProjectUpdateReaction as ProjectUpdateReactionSchema,
    ProjectUpdateCommentReactionCreate,
    ProjectUpdateCommentReaction as ProjectUpdateCommentReactionSchema
)
from uuid import UUID


class CRUDProject(CRUDBase[Project, ProjectCreate, ProjectUpdateSchema]):
    """CRUD operations for Project model"""
    
    def get(self, db: Session, id: any) -> Optional[Project]:
        return db.query(self.model).options(
            joinedload(Project.lead),
            selectinload(Project.updates).options(
                joinedload(ProjectUpdate.author),
                selectinload(ProjectUpdate.comments).options(
                    joinedload(ProjectUpdateComment.author),
                    selectinload(ProjectUpdateComment.reactions).joinedload(ProjectUpdateCommentReaction.user)
                ),
                selectinload(ProjectUpdate.reactions).joinedload(ProjectUpdateReaction.user)
            ),
            selectinload(Project.teams),
            selectinload(Project.members)
        ).filter(self.model.id == id).first()

    def create_with_relations(
        self,
        db: Session,
        *,
        obj_in: ProjectCreate,
        member_ids: Optional[List[UUID]] = None,
        team_ids: Optional[List[UUID]] = None
    ) -> Project:
        """Create project with members and teams"""
        obj_in_data = obj_in.model_dump(exclude={'member_ids', 'team_ids'})
        db_obj = Project(**obj_in_data)
        
        # Add members
        if member_ids:
            from app.models.user import User
            members = db.query(User).filter(User.id.in_(member_ids)).all()
            db_obj.members = members
        
        # Add teams
        if team_ids:
            from app.models.team_model import Team
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
        obj_in: ProjectUpdateSchema
    ) -> Project:
        """Update project including members and teams"""
        update_data = obj_in.model_dump(exclude_unset=True)
        
        # Handle members separately
        if "member_ids" in update_data:
            from app.models.user import User
            members = db.query(User).filter(User.id.in_(update_data["member_ids"])).all()
            db_obj.members = members
            del update_data["member_ids"]
        
        # Handle teams separately
        if "team_ids" in update_data:
            from app.models.team_model import Team
            teams = db.query(Team).filter(Team.id.in_(update_data["team_ids"])).all()
            db_obj.teams = teams
            del update_data["team_ids"]
        
        # Update other fields
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        
        db.add(db_obj)
        db.commit() # ENSURE COMMIT
        db.refresh(db_obj)
        return db_obj

    def get_filtered(
        self,
        db: Session,
        *,
        user_id: UUID,
        user_team_ids: List[UUID],
        team_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100,
        is_admin: bool = False,
        organization_id: Optional[UUID] = None
    ) -> List[Project]:
        """Get filtered projects based on visibility and user access"""
        from app.models.team_model import Team # ENSURE IMPORTED AT START OF METHOD
        query = db.query(Project).options(
            selectinload(Project.team),
            joinedload(Project.lead),
            selectinload(Project.teams),
            selectinload(Project.members)
        )
        
        if is_admin and organization_id:
            # Admin can see all projects in org
            query = query.join(Project.team).filter(Team.organization_id == organization_id)
        else:
            # Everyone in the organization can see all projects
            query = query.join(Project.team).filter(Team.organization_id == organization_id)
        
        if team_id:
            query = query.filter(Project.team_id == team_id)
            
        return query.offset(skip).limit(limit).all()

project = CRUDProject(Project)


class CRUDProjectUpdate(CRUDBase[ProjectUpdate, ProjectUpdateCreate, ProjectUpdateLog]):
    """CRUD operations for ProjectUpdate model"""
    
    def create_with_author(
        self,
        db: Session,
        *,
        obj_in: ProjectUpdateCreate,
        author_id: UUID
    ) -> ProjectUpdate:
        """Create project update with author"""
        obj_in_data = obj_in.model_dump()
        db_obj = ProjectUpdate(**obj_in_data, author_id=author_id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


class CRUDProjectResource(CRUDBase[ProjectResource, ProjectResourceCreate, ProjectResourceSchema]):
    """CRUD operations for ProjectResource model"""
    
    def create(
        self,
        db: Session,
        *,
        obj_in: ProjectResourceCreate,
        project_id: UUID
    ) -> ProjectResource:
        """Create project resource"""
        obj_in_data = obj_in.model_dump()
        db_obj = ProjectResource(**obj_in_data, project_id=project_id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


class CRUDProjectUpdateComment(CRUDBase[ProjectUpdateComment, ProjectUpdateCommentCreate, any]):
    """CRUD operations for ProjectUpdateComment model"""
    
    def create_with_author(
        self,
        db: Session,
        *,
        obj_in: ProjectUpdateCommentCreate,
        author_id: UUID
    ) -> ProjectUpdateComment:
        """Create comment with author"""
        obj_in_data = obj_in.model_dump()
        db_obj = ProjectUpdateComment(**obj_in_data, author_id=author_id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


class CRUDProjectUpdateReaction(CRUDBase[ProjectUpdateReaction, ProjectUpdateReactionCreate, any]):
    """CRUD operations for ProjectUpdateReaction model"""
    
    def toggle(
        self,
        db: Session,
        *,
        obj_in: ProjectUpdateReactionCreate,
        user_id: UUID
    ) -> ProjectUpdateReaction:
        """Toggle reaction - allows multiple different emojis per user"""
        # Find if this specific emoji reaction already exists
        existing = db.query(ProjectUpdateReaction).filter(
            ProjectUpdateReaction.update_id == obj_in.update_id,
            ProjectUpdateReaction.user_id == user_id,
            ProjectUpdateReaction.emoji == obj_in.emoji
        ).first()
        
        if existing:
            # If it's the same emoji, remove it (toggle off)
            db.delete(existing)
            db.commit()
            return None
            
        db_obj = ProjectUpdateReaction(
            update_id=obj_in.update_id,
            user_id=user_id,
            emoji=obj_in.emoji
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


class CRUDProjectUpdateCommentReaction(CRUDBase[ProjectUpdateCommentReaction, ProjectUpdateCommentReactionCreate, any]):
    """CRUD operations for ProjectUpdateCommentReaction model"""
    
    def toggle(
        self,
        db: Session,
        *,
        obj_in: ProjectUpdateCommentReactionCreate,
        user_id: UUID
    ) -> ProjectUpdateCommentReaction:
        """Toggle reaction on a comment"""
        existing = db.query(ProjectUpdateCommentReaction).filter(
            ProjectUpdateCommentReaction.comment_id == obj_in.comment_id,
            ProjectUpdateCommentReaction.user_id == user_id,
            ProjectUpdateCommentReaction.emoji == obj_in.emoji
        ).first()
        
        if existing:
            db.delete(existing)
            db.commit()
            return None
            
        db_obj = ProjectUpdateCommentReaction(
            comment_id=obj_in.comment_id,
            user_id=user_id,
            emoji=obj_in.emoji
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


project_update = CRUDProjectUpdate(ProjectUpdate)
project_resource = CRUDProjectResource(ProjectResource)
project_update_comment = CRUDProjectUpdateComment(ProjectUpdateComment)
project_update_reaction = CRUDProjectUpdateReaction(ProjectUpdateReaction)
project_update_comment_reaction = CRUDProjectUpdateCommentReaction(ProjectUpdateCommentReaction)
