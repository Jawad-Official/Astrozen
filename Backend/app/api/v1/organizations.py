from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.api.deps import get_current_active_user
from app.models.user import User
from app.schemas.organization import OrganizationCreate, Organization as OrganizationSchema
from app.schemas.invite_code import InviteCode as InviteCodeSchema
from app.services import organization_service
from uuid import UUID

router = APIRouter()


@router.post("", response_model=OrganizationSchema, status_code=status.HTTP_201_CREATED)
def create_organization(
    org_in: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new organization"""
    if current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already belongs to an organization. Leave first to create new one."
        )
        
    org = organization_service.create_organization(
        db, 
        org_in=org_in, 
        user_id=current_user.id
    )
    return org


@router.post("/join", response_model=OrganizationSchema)
def join_organization(
    invite_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Join an organization via invite code"""
    if current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already belongs to an organization"
        )
        
    org = organization_service.join_organization(
        db,
        invite_code=invite_code,
        user_id=current_user.id
    )
    return org


@router.get("/me", response_model=OrganizationSchema)
def get_my_organization(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's organization details"""
    if not current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User does not belong to any organization"
        )
        
    from app.crud import organization as crud_org
    org = crud_org.get(db, id=current_user.organization_id)
    return org


@router.get("/me/members", response_model=List[dict])
def get_organization_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all members in current user's organization"""
    if not current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User does not belong to any organization"
        )
    
    from app.crud import user as crud_user
    members = db.query(User).filter(
        User.organization_id == current_user.organization_id,
        User.is_active == True
    ).all()
    
    return [
        {
            "id": str(member.id),
            "first_name": member.first_name,
            "last_name": member.last_name,
            "full_name": member.full_name,
            "email": member.email,
            "job_title": member.job_title,
            "role": member.role
        }
        for member in members
    ]


@router.post("/invite-codes", response_model=InviteCodeSchema)
def generate_invite_code(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Generate invite code for current organization (Admin only)"""
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="No organization")
        
    code = organization_service.generate_invite_code(
        db,
        organization_id=current_user.organization_id,
        user_id=current_user.id
    )
    return code
