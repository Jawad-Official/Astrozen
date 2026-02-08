# Import all models here for Alembic to detect them
from app.core.database import Base
from app.models.organization import Organization
from app.models.team_model import Team, team_members
from app.models.invite_code import InviteCode
from app.models.user import User
from app.models.user_role import UserRole
# from app.models.label removed
from app.models.cycle import Cycle, CycleStatus
from app.models.project import (
    Project, ProjectUpdate, ProjectResource, ProjectUpdateComment, 
    ProjectUpdateReaction, ProjectUpdateCommentReaction,
    ProjectStatus, ProjectHealth, ProjectPriority, ResourceType,
    project_members, project_teams
)
from app.models.feature import (
    Feature, FeatureType, FeatureStatus, FeatureHealth, 
    Milestone
)
from app.models.issue import (
    Issue, IssueStatus, IssuePriority, TriageStatus, Visibility
)
from app.models.comment import Comment
from app.models.activity import Activity, ActivityType
from app.models.custom_view import (
    CustomView, SavedFilter,
    ViewType, ViewVisibility, ViewLayout
)
from app.models.project_idea import ProjectIdea, ValidationReport, IdeaStatus
from app.models.project_asset import ProjectAsset, AssetType, AssetStatus

__all__ = [
    "Base",
    "Organization",
    "Team",
    "InviteCode",
    "User",
    "UserRole",
    "Cycle",
    "Project",
    "ProjectUpdate",
    "ProjectResource",
    "ProjectUpdateComment",
    "ProjectUpdateReaction",
    "ProjectUpdateCommentReaction",
    "Feature",
    "Milestone",
    "Issue",
    "Comment",
    "Activity",
    "CustomView",
    "SavedFilter",
    "ProjectIdea",
    "ValidationReport",
    "ProjectAsset",
    # Enums
    "CycleStatus",
    "ProjectStatus",
    "ProjectHealth",
    "ProjectPriority",
    "ResourceType",
    "FeatureType",
    "FeatureStatus",
    "FeatureHealth",
    "IssueStatus",
    "IssuePriority",
    "TriageStatus",
    "Visibility",
    "ActivityType",
    "ViewType",
    "ViewVisibility",
    "ViewLayout",
    "IdeaStatus",
    "AssetType",
    "AssetStatus",
    # Association tables
    "team_members",
    "project_members",
    "project_teams",
]
