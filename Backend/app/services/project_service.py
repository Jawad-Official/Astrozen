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

        # If team association changed, we DON'T automatically add all team members anymore
        # if project_in.team_id or project_in.team_ids is not None:
        #      self.sync_project_members(db, project=updated_project)

        # Re-fetch to ensure all relations are loaded for the API response
        return crud_project.get(db, id=project_id)

    def sync_project_members(self, db: Session, *, project: Project):
        """Ensure all members of joined teams are added to the project - DISABLED"""
        return
        # teams_to_sync = [project.team] if project.team else []
        # if project.teams:
        #     teams_to_sync.extend(project.teams)
        
        # member_ids = {m.id for m in project.members}
        # added = False
        
        # for team in teams_to_sync:
        #     for member in team.members:
        #         if member.id not in member_ids:
        #             project.members.append(member)
        #             member_ids.add(member.id)
        #             added = True
        
        # if added:
        #     db.add(project)
        #     db.commit()
        #     db.refresh(project)

    def sync_team_members(self, db: Session, *, team_id: UUID):
        """
        Sync members of a team with all projects involving that team.
        Called when team members are added/removed. - DISABLED
        """
        return
    



project_service = ProjectService()
