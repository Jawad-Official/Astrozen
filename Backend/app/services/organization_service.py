from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.crud import organization as crud_org, user_role as crud_role, invite_code as crud_invite, user as crud_user, team as crud_team
from app.models.organization import Organization
from app.models.user_role import UserRoleType
from app.models.invite_code import InviteCode
from app.schemas.organization import OrganizationCreate
from app.schemas.team import TeamCreate
from uuid import UUID


class OrganizationService:
    """Business logic for Organization management"""
    
    def create_organization(
        self,
        db: Session,
        *,
        org_in: OrganizationCreate,
        user_id: UUID
    ) -> Organization:
        """
        Create new organization:
        1. Create Organization
        2. Assign creator as Admin
        3. Create default team "{First Name}'s Team"
        4. Add user to team as Leader
        """
        user = crud_user.get(db, id=user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        # 1. Create Organization
        org = crud_org.create(db, obj_in=org_in)
        org.created_by_id = user_id
        db.add(org)
        db.commit()
        
        # 2. Assign Admin Role
        from app.schemas.user_role import UserRoleCreate
        crud_role.create(db, obj_in=UserRoleCreate(
            user_id=user_id,
            organization_id=org.id,
            role=UserRoleType.ADMIN
        ))
        
        # 3. Create Default Team
        team_name = f"{user.first_name}'s Team"
        identifier = team_name[:3].upper()
        
        from app.models.team_model import Team
        team = Team(
            organization_id=org.id,
            name=team_name,
            identifier=identifier
        )
        team.leaders.append(user)
        db.add(team)
        db.commit()
        
        # 4. Add user to team
        team.members.append(user)
        db.commit()
        
        # Update user's current organization
        user.organization_id = org.id
        db.commit()
        
        return org

    def join_organization(
        self,
        db: Session,
        *,
        invite_code: str,
        user_id: UUID
    ) -> Organization:
        """
        Join organization via invite code:
        1. Validate code
        2. Add user to org as Member
        3. Update usage stats
        """
        code = crud_invite.get_by_code(db, code=invite_code)
        if not code or not code.is_valid():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired invite code"
            )
            
        # Check if already member
        existing_role = crud_role.get_by_user_org(db, user_id=user_id, organization_id=code.organization_id)
        if existing_role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already in this organization"
            )
            
        # Add role
        from app.schemas.user_role import UserRoleCreate
        crud_role.create(db, obj_in=UserRoleCreate(
            user_id=user_id,
            organization_id=code.organization_id,
            role=UserRoleType.MEMBER
        ))
        
        # Update code usage
        code.used_count += 1
        db.commit()
        
        # Set as current org
        user = crud_user.get(db, id=user_id)
        user.organization_id = code.organization_id
        db.commit()
        
        return code.organization

    def generate_invite_code(
        self,
        db: Session,
        *,
        organization_id: UUID,
        user_id: UUID
    ) -> InviteCode:
        """Generate new invite code for organization"""
        # Check permission (must be admin)
        role = crud_role.get_by_user_org(db, user_id=user_id, organization_id=organization_id)
        if not role or role.role != UserRoleType.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can generate invite codes"
            )
            
        # Deactivate old codes? (Optional, based on requirements "one org-wide code")
        # For now, let's just create a new active one
        
        code_str = InviteCode.generate_code()
        expires_at = InviteCode.create_with_expiry()
        
        from app.schemas.invite_code import InviteCodeCreate
        # We need a custom create here because schema differs slightly from model
        db_obj = InviteCode(
            organization_id=organization_id,
            code=code_str,
            created_by_id=user_id,
            expires_at=expires_at,
            max_uses=None 
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        
        return db_obj


organization_service = OrganizationService()
