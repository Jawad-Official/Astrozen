# Import all models here for Alembic to detect them
from app.core.database import Base
from app.models.organization import Organization
from app.models.team_model import Team, team_members
from app.models.invite_code import InviteCode
from app.models.user import User
from app.models.user_role import UserRole

from app.models.project import (
    Project,
    ProjectUpdate,
    ProjectUpdateComment,
    Resource,
    Reaction,
    project_members,
    project_teams,
)
from app.models.feature import (
    Feature,
    Milestone,
)
from app.models.issue import Issue
from app.models.comment import Comment
from app.models.activity import Activity
from app.models.custom_view import View
from app.models.project_idea import (
    ProjectIdea,
    ValidationReport,
    ProjectAsset,
)
from app.models.notification import Notification

from app.models.enums import (
    ProjectStatus,
    ProjectHealth,
    ProjectPriority,
    Visibility,
    ResourceType,
    FeatureType,
    FeatureStatus,
    FeatureHealth,
    IssueStatus,
    IssuePriority,
    IssueType,
    TriageStatus,
    ActivityType,
    ViewType,
    ViewVisibility,
    ViewLayout,
    IdeaStatus,
    AssetType,
    AssetStatus,
    NotificationType,
    UserRoleType,
    ReactionTargetType,
    ResourceTargetType,
)

__all__ = [
    "Base",
    "Organization",
    "Team",
    "InviteCode",
    "User",
    "UserRole",
    "Project",
    "ProjectUpdate",
    "ProjectUpdateComment",
    "Resource",
    "Reaction",
    "Feature",
    "Milestone",
    "Issue",
    "Comment",
    "Activity",
    "View",
    "ProjectIdea",
    "ValidationReport",
    "ProjectAsset",
    "Notification",
    # Enums
    "ProjectStatus",
    "ProjectHealth",
    "ProjectPriority",
    "Visibility",
    "ResourceType",
    "FeatureType",
    "FeatureStatus",
    "FeatureHealth",
    "IssueStatus",
    "IssuePriority",
    "IssueType",
    "TriageStatus",
    "ActivityType",
    "ViewType",
    "ViewVisibility",
    "ViewLayout",
    "IdeaStatus",
    "AssetType",
    "AssetStatus",
    "NotificationType",
    "UserRoleType",
    "ReactionTargetType",
    "ResourceTargetType",
    # Association tables
    "team_members",
    "project_members",
    "project_teams",
]
