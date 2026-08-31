from sqlalchemy.orm import Session
from app.crud import project as crud_project
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate
from uuid import UUID


class ProjectService:
    """Business logic for Project management"""
    
    def create_project(
        self,
        db: Session,
        *,
        project_in: ProjectCreate
    ) -> Project:
        """Create a new project with members and teams"""
        # Start with specifically requested members
        member_ids = set(project_in.member_ids or [])
        
        # ENSURE lead is a member
        if project_in.lead_id:
            member_ids.add(project_in.lead_id)
        
        return crud_project.create_with_relations(
            db,
            obj_in=project_in,
            member_ids=list(member_ids),
            team_ids=project_in.team_ids if hasattr(project_in, 'team_ids') else None
        )
    
    def update_project(
        self,
        db: Session,
        *,
        project_id: UUID,
        project_in: ProjectUpdate
    ) -> Project:
        """Update a project"""
        project = crud_project.get(db, id=project_id)
        if not project:
            return None
        
        # This will update basic fields and member_ids/team_ids if provided
        updated_project = crud_project.update_with_relations(
            db,
            db_obj=project,
            obj_in=project_in
        )

        # Team association changes no longer auto-add all team members to
        # the project - removed sync_project_members/sync_team_members
        # (see CODE_QUALITY_FINDINGS.md CQ-1). This was a deliberate
        # product decision, not a regression.

        # Re-fetch to ensure all relations are loaded for the API response
        return crud_project.get(db, id=project_id)



project_service = ProjectService()
