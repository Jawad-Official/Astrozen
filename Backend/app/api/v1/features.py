from typing import Optional
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_active_user, check_can_edit_feature, check_can_manage_project
from app.models.user import User
from app.models.feature import FeatureStatus
from app.schemas.feature import (
    FeatureCreate, FeatureUpdate, Feature as FeatureSchema,
    MilestoneCreate, MilestoneUpdate, Milestone as MilestoneSchema
)
from app.services import feature_service
from app.crud import feature as crud_feature, project as crud_project
from uuid import UUID

router = APIRouter()


@router.get("", response_model=List[FeatureSchema])
def list_features(
    project_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List features (optionally filtered by project)"""
    if project_id:
        # Check project access
        project = crud_project.get(db, id=project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.team.organization_id != current_user.organization_id:
             raise HTTPException(status_code=403, detail="Not authorized to view this project")
            
        return crud_feature.get_by_project(db, project_id=project_id)
    
    # Return all features in organization
    return crud_feature.get_multi_by_user_projects(
        db, 
        user_id=current_user.id, 
        user_team_ids=[], 
        organization_id=current_user.organization_id
    )


@router.post("", response_model=FeatureSchema, status_code=status.HTTP_201_CREATED)
def create_feature(
    feature_in: FeatureCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new feature"""
    # Verify project exists
    project = crud_project.get(db, id=feature_in.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    # Check permissions
    if not check_can_manage_project(current_user, feature_in.project_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to create features in this project"
        )
        
    feature = feature_service.create_feature(
        db,
        feature_in=feature_in,
        user_id=current_user.id
    )
    return feature


@router.get("/{feature_id}", response_model=FeatureSchema)
def get_feature(
    feature_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get feature details"""
    feature = crud_feature.get(db, id=feature_id)
    # Check access via objective->org
    if not feature:
        raise HTTPException(status_code=404, detail="Feature not found")
    
    # Check visibility
    if feature.project.team.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this feature")
    
    return feature


@router.patch("/{feature_id}", response_model=FeatureSchema)
def update_feature(
    feature_id: UUID,
    feature_in: FeatureUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a feature"""
    feature = crud_feature.get(db, id=feature_id)
    if not feature:
        raise HTTPException(status_code=404, detail="Feature not found")
        
    if not check_can_edit_feature(current_user, feature_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project managers or the feature owner can update this feature"
        )

    # If status change, go through service for gate checks
    if feature_in.status and feature_in.status != feature.status:
        # First update other fields
        crud_feature.update(db, db_obj=feature, obj_in=feature_in)
        # Then validate status transition
        feature = feature_service.update_status(
            db, 
            feature_id=feature_id, 
            status=feature_in.status, 
            user_id=current_user.id
        )
    else:
        feature = crud_feature.update(db, db_obj=feature, obj_in=feature_in)
        
    return feature


@router.delete("/{feature_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_feature(
    feature_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a feature"""
    feature = crud_feature.get(db, id=feature_id)
    if not feature:
        raise HTTPException(status_code=404, detail="Feature not found")
        
    if not check_can_edit_feature(current_user, feature_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project managers or the feature owner can delete this feature"
        )
        
    crud_feature.delete(db, id=feature_id)
    return None


@router.post("/{feature_id}/milestones", response_model=MilestoneSchema, status_code=status.HTTP_201_CREATED)
def create_milestone(
    feature_id: UUID,
    milestone_in: MilestoneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a milestone for a feature"""
    feature = crud_feature.get(db, id=feature_id)
    if not feature:
        raise HTTPException(status_code=404, detail="Feature not found")
        
    milestone = crud_feature.create_milestone(
        db,
        feature_id=feature_id,
        obj_in=milestone_in
    )
    return milestone


@router.patch("/{feature_id}/milestones/{milestone_id}", response_model=MilestoneSchema)
def update_milestone(
    feature_id: UUID,
    milestone_id: UUID,
    milestone_in: MilestoneUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a milestone"""
    feature = crud_feature.get(db, id=feature_id)
    if not feature:
        raise HTTPException(status_code=404, detail="Feature not found")
        
    milestone = crud_feature.get_milestone(db, id=milestone_id)
    if not milestone or milestone.feature_id != feature_id:
        raise HTTPException(status_code=404, detail="Milestone not found")
        
    milestone = crud_feature.update_milestone(
        db,
        db_obj=milestone,
        obj_in=milestone_in
    )
    return milestone


@router.delete("/{feature_id}/milestones/{milestone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_milestone(
    feature_id: UUID,
    milestone_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a milestone"""
    feature = crud_feature.get(db, id=feature_id)
    if not feature:
        raise HTTPException(status_code=404, detail="Feature not found")
        
    if not check_can_edit_feature(current_user, feature_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project managers or the feature owner can delete milestones"
        )
        
    milestone = crud_feature.get_milestone(db, id=milestone_id)
    if not milestone or milestone.feature_id != feature_id:
        raise HTTPException(status_code=404, detail="Milestone not found")
        
    crud_feature.delete_milestone(db, id=milestone_id)
    return None
