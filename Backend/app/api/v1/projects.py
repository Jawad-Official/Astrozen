from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_active_user, check_is_admin, check_can_manage_project, check_is_team_member
from app.models.user import User
from app.schemas.project import (
    ProjectCreate, 
    ProjectUpdate as ProjectUpdateSchema, 
    Project as ProjectSchema,
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
from app.models.project import ProjectResource as ProjectResourceModel, ResourceType, Visibility
# Force reload
from app.crud.project import (
    project as crud_project, 
    project_update, 
    project_resource,
    project_update_comment,
    project_update_reaction,
    project_update_comment_reaction
)
from app.services import project_service
from uuid import UUID

router = APIRouter()


@router.get("", response_model=List[ProjectSchema])
def list_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    skip: int = 0,
    limit: int = 100,
    team_id: Optional[UUID] = None
):
    """List projects with permission rules"""
    # Check if admin
    is_admin = check_is_admin(current_user)
    
    # REQUIREMENTS: Member can see all projects even if not in it
    # We pass organization_id to get_filtered to show all projects in org
    projects = crud_project.get_filtered(
        db,
        user_id=current_user.id,
        user_team_ids=[], # Not used anymore for visibility
        team_id=team_id,
        skip=skip,
        limit=limit,
        is_admin=is_admin,
        organization_id=current_user.organization_id
    )
    return projects


@router.post("", response_model=ProjectSchema, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new project"""
    if not project_in.team_id:
        raise HTTPException(status_code=400, detail="Every project must be assigned to at least one team")
        
    if not check_is_team_member(current_user, project_in.team_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of the team to create projects in it"
        )
        
    if project_in.lead_id is None:
        project_in.lead_id = current_user.id
    
    # VALIDATION: Lead cannot be a 'member'
    from app.crud import user as crud_user
    lead_user = crud_user.get(db, id=project_in.lead_id)
    if lead_user and lead_user.role == "member":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Users with 'member' role cannot be project leads"
        )
        
    project = project_service.create_project(db, project_in=project_in)
    return project


@router.get("/{project_id}", response_model=ProjectSchema)
def get_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get project by ID"""
    project = crud_project.get(db, id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    # Check visibility
    from app.models.project import Visibility
    user_team_ids = [t.id for t in current_user.teams]
    
    # If admin, can see all projects in org
    if check_is_admin(current_user) or project.team.organization_id == current_user.organization_id:
        return project

    raise HTTPException(status_code=403, detail="Not authorized to view this project")


@router.patch("/{project_id}", response_model=ProjectSchema)
def update_project(
    project_id: UUID,
    project_in: ProjectUpdateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a project with permission checks"""
    project = crud_project.get(db, id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if not check_can_manage_project(current_user, project_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Only organization admins, team leaders or project members can update this project"
        )
    
    # VALIDATION: Lead cannot be a 'member'
    if project_in.lead_id:
        from app.crud import user as crud_user
        lead_user = crud_user.get(db, id=project_in.lead_id)
        if lead_user and lead_user.role == "member":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Users with 'member' role cannot be project leads"
            )

    # Use service to handle relations and re-fetch full object
    return project_service.update_project(db, project_id=project_id, project_in=project_in)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a project (Admin or Team Leader only)"""
    project = crud_project.get(db, id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not check_can_manage_project(current_user, project_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Only organization admins or team leaders can delete projects"
        )
        
    crud_project.delete(db, id=project_id)
    return None


@router.post("/{project_id}/updates", response_model=ProjectUpdateLog)
def create_project_update(
    project_id: UUID,
    update_in: ProjectUpdateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new project update and update project health"""
    project = crud_project.get(db, id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if not check_can_manage_project(current_user, project_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to post updates to this project"
        )
        
    new_update = project_update.create_with_author(
        db, obj_in=update_in, author_id=current_user.id
    )
    
    # Update project health to match the latest update
    project.health = update_in.health
    db.add(project)
    db.commit()
    
    return new_update


@router.delete("/{project_id}/updates/{update_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project_update(
    project_id: UUID,
    update_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a project update"""
    update = project_update.get(db, id=update_id)
    if not update or update.project_id != project_id:
        raise HTTPException(status_code=404, detail="Update not found")
        
    if update.author_id != current_user.id and not check_can_manage_project(current_user, project_id, db):
        raise HTTPException(status_code=403, detail="Not authorized to delete this update")
        
    project_update.delete(db, id=update_id)
    return None


@router.post("/{project_id}/resources", response_model=ProjectResourceSchema)
def create_project_resource(
    project_id: UUID,
    resource_in: ProjectResourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new project resource"""
    project = crud_project.get(db, id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if not check_can_manage_project(current_user, project_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to manage resources for this project"
        )
        
    return project_resource.create(
        db, obj_in=resource_in, project_id=project_id
    )


@router.delete("/{project_id}/resources/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project_resource(
    project_id: UUID,
    resource_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a project resource"""
    resource = db.query(ProjectResourceModel).filter(
        ProjectResourceModel.id == resource_id,
        ProjectResourceModel.project_id == project_id
    ).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
        
    if not check_can_manage_project(current_user, project_id, db):
        raise HTTPException(status_code=403, detail="Not authorized to delete this resource")
        
    db.delete(resource)
    db.commit()
    return None
@router.post("/{project_id}/updates/{update_id}/comments", response_model=ProjectUpdateCommentSchema)
def create_update_comment(
    project_id: UUID,
    update_id: UUID,
    comment_in: ProjectUpdateCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new comment on a project update"""
    update = project_update.get(db, id=update_id)
    if not update or update.project_id != project_id:
        raise HTTPException(status_code=404, detail="Update not found")
        
    return project_update_comment.create_with_author(
        db, obj_in=comment_in, author_id=current_user.id
    )


@router.delete("/{project_id}/updates/{update_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_update_comment(
    project_id: UUID,
    update_id: UUID,
    comment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a comment on a project update"""
    comment = project_update_comment.get(db, id=comment_id)
    if not comment or comment.update_id != update_id:
        raise HTTPException(status_code=404, detail="Comment not found")
        
    if comment.author_id != current_user.id and not check_is_admin(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")
        
    project_update_comment.delete(db, id=comment_id)
    return None


@router.post("/{project_id}/updates/{update_id}/reactions", response_model=Optional[ProjectUpdateReactionSchema])
def toggle_update_reaction(
    project_id: UUID,
    update_id: UUID,
    reaction_in: ProjectUpdateReactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Toggle a reaction on a project update"""
    update = project_update.get(db, id=update_id)
    if not update or update.project_id != project_id:
        raise HTTPException(status_code=404, detail="Update not found")
        
    return project_update_reaction.toggle(
        db, obj_in=reaction_in, user_id=current_user.id
    )


@router.post("/{project_id}/updates/{update_id}/comments/{comment_id}/reactions", response_model=Optional[ProjectUpdateCommentReactionSchema])
def toggle_comment_reaction(
    project_id: UUID,
    update_id: UUID,
    comment_id: UUID,
    reaction_in: ProjectUpdateCommentReactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Toggle a reaction on a project update comment"""
    comment = project_update_comment.get(db, id=comment_id)
    if not comment or comment.update_id != update_id:
        raise HTTPException(status_code=404, detail="Comment not found")
        
    return project_update_comment_reaction.toggle(
        db, obj_in=reaction_in, user_id=current_user.id
    )
