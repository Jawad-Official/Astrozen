# Export all schemas
from app.schemas.user import User, UserCreate, UserUpdate, Token, LoginRequest
from app.schemas.issue import Issue, IssueCreate, IssueUpdate, IssueList
from app.schemas.project import Project, ProjectCreate, ProjectUpdate
# Milestone moved to feature schema import below, but Project still references classes with same name?
# Actually project.py schema had Milestone embedded. We should remove it from there or alias it.
# For now, let's keep the project one for legacy if needed, but import new one from feature.
# Wait, naming conflict. Pydantic classes with same name "Milestone".
# Project's milestone is legacy. Feature's milestone is new.
# I should probably update project schema to remove Milestone if it's no longer there.
# But for now, let's import Feature-based Milestone as "FeatureMilestone"

from app.schemas.comment import Comment, CommentCreate, Activity
# from app.schemas.label removed
from app.schemas.organization import Organization, OrganizationCreate
from app.schemas.team import Team, TeamCreate, TeamUpdate
from app.schemas.user_role import UserRole, UserRoleCreate
from app.schemas.invite_code import InviteCode, InviteCodeCreate
from app.schemas.feature import Feature, FeatureCreate, FeatureUpdate, Milestone as FeatureMilestone, MilestoneCreate, MilestoneUpdate

__all__ = [
    "User",
    "UserCreate",
    "UserUpdate",
    "Token",
    "LoginRequest",
    "Issue",
    "IssueCreate",
    "IssueUpdate",
    "IssueList",
    "Project",
    "ProjectCreate",
    "ProjectUpdate",
    # "Milestone", # Removed legacy from export list to favor new one
    # "MilestoneCreate",
    # "MilestoneUpdate",
    "Comment",
    "CommentCreate",
    "Activity",
    "Organization",
    "OrganizationCreate",
    "Team",
    "TeamCreate",
    "TeamUpdate",
    "UserRole",
    "UserRoleCreate",
    "InviteCode",
    "InviteCodeCreate",
    "Feature",
    "FeatureCreate",
    "FeatureUpdate",
    "Milestone",
    "MilestoneCreate",
    "MilestoneUpdate"
]
# Alias for clean export
Milestone = FeatureMilestone
