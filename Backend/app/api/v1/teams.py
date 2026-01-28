from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_active_user, check_is_admin
from app.models.user import User
from app.schemas.team import TeamCreate, TeamUpdate, Team as TeamSchema
from app.services import team_service
from app.crud import team as crud_team
from uuid import UUID

router = APIRouter()


@router.get("", response_model=List[TeamSchema])
def list_teams(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List teams with permission rules"""
    if not current_user.organization_id:
        return []
        
    # Return all teams in organization for everyone
    from app.models.team_model import Team
    from sqlalchemy.orm import selectinload
    
    teams = db.query(Team).options(
        selectinload(Team.leaders),
        selectinload(Team.members)
    ).filter(
        Team.organization_id == current_user.organization_id
    ).all()
    
    return teams


@router.post("", response_model=TeamSchema, status_code=status.HTTP_201_CREATED)
def create_team(
    team_in: TeamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new team (Admin only)"""
    if not check_is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only organization admins can create teams"
        )
        
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="Must belong to an organization")
        
    # Ensure creating in own org
    team_in.organization_id = current_user.organization_id
    
    team = team_service.create_team(
        db,
        team_in=team_in,
        user_id=current_user.id
    )
    return team


@router.get("/{team_id}", response_model=TeamSchema)
def get_team(
    team_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get team details"""
    team = crud_team.get(db, id=team_id)
    if not team or team.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@router.patch("/{team_id}", response_model=TeamSchema)
def update_team(
    team_id: UUID,
    team_in: TeamUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update team details (Admin or Team Leader only)"""
    team = crud_team.get(db, id=team_id)
    if not team or team.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Team not found")
        
    # Check permissions: Admin or Team Leader
    is_leader = any(l.id == current_user.id for l in team.leaders)
    if not check_is_admin(current_user) and not is_leader:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only organization admins or team leaders can update teams"
        )
        
    return team_service.update_team(db, team_id=team_id, team_in=team_in)


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team(
    team_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a team (Admin only)"""
    team = crud_team.get(db, id=team_id)
    if not team or team.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Team not found")
        
    if not check_is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only organization admins can delete teams"
        )
        
    crud_team.delete(db, id=team_id)
    return None
