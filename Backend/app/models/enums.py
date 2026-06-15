import enum


class ProjectStatus(str, enum.Enum):
    BACKLOG = "backlog"
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ProjectHealth(str, enum.Enum):
    ON_TRACK = "on_track"
    AT_RISK = "at_risk"
    OFF_TRACK = "off_track"
    NO_UPDATES = "no_updates"


class ProjectPriority(str, enum.Enum):
    URGENT = "urgent"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    NONE = "none"


class Visibility(str, enum.Enum):
    TEAM = "team"
    ORGANIZATION = "organization"


class ResourceType(str, enum.Enum):
    LINK = "link"
    DOCUMENT = "document"


class FeatureType(str, enum.Enum):
    NEW_CAPABILITY = "new_capability"
    ENHANCEMENT = "enhancement"
    EXPERIMENT = "experiment"
    INFRASTRUCTURE = "infrastructure"


class FeatureStatus(str, enum.Enum):
    DISCOVERY = "discovery"
    VALIDATED = "validated"
    IN_BUILD = "in_build"
    IN_REVIEW = "in_review"
    SHIPPED = "shipped"
    ADOPTED = "adopted"
    KILLED = "killed"


class FeatureHealth(str, enum.Enum):
    ON_TRACK = "on_track"
    AT_RISK = "at_risk"
    OFF_TRACK = "off_track"


class IssueStatus(str, enum.Enum):
    BACKLOG = "backlog"
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    CANCELLED = "cancelled"


class IssuePriority(str, enum.Enum):
    URGENT = "urgent"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    NONE = "none"


class IssueType(str, enum.Enum):
    BUG = "bug"
    TASK = "task"
    REFACTOR = "refactor"
    CHORE = "chore"
    TECH_DEBT = "technical_debt"
    INVESTIGATION = "investigation"


class TriageStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    DUPLICATE = "duplicate"


class ActivityType(str, enum.Enum):
    CREATED = "created"
    STATUS_CHANGED = "status_changed"
    PRIORITY_CHANGED = "priority_changed"
    TYPE_CHANGED = "type_changed"
    ASSIGNED = "assigned"
    COMMENT = "comment"


class ViewType(str, enum.Enum):
    ISSUES = "issues"
    PROJECTS = "projects"


class ViewVisibility(str, enum.Enum):
    PERSONAL = "personal"
    TEAM = "team"


class ViewLayout(str, enum.Enum):
    LIST = "list"
    BOARD = "board"


class IdeaStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    CLARIFICATION_NEEDED = "CLARIFICATION_NEEDED"
    READY_FOR_VALIDATION = "READY_FOR_VALIDATION"
    VALIDATED = "VALIDATED"
    BLUEPRINT_GENERATED = "BLUEPRINT_GENERATED"
    COMPLETED = "COMPLETED"


class AssetType(str, enum.Enum):
    PROJECT_MD = "PROJECT_MD"
    PRD = "PRD"
    APP_FLOW = "APP_FLOW"
    TECH_STACK = "TECH_STACK"
    FRONTEND_GUIDELINES = "FRONTEND_GUIDELINES"
    BACKEND_SCHEMA = "BACKEND_SCHEMA"
    IMPLEMENTATION_PLAN = "IMPLEMENTATION_PLAN"
    DIAGRAM_USER_FLOW = "DIAGRAM_USER_FLOW"
    DIAGRAM_KANBAN = "DIAGRAM_KANBAN"


class AssetStatus(str, enum.Enum):
    PENDING = "PENDING"
    GENERATING = "GENERATING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class NotificationType(str, enum.Enum):
    ISSUE_ASSIGNED = "ISSUE_ASSIGNED"
    ISSUE_STATUS_CHANGED = "ISSUE_STATUS_CHANGED"
    ISSUE_COMMENT = "ISSUE_COMMENT"
    ISSUE_MENTION = "ISSUE_MENTION"
    ISSUE_PRIORITY_UPGRADE = "ISSUE_PRIORITY_UPGRADE"
    AI_VALIDATION_READY = "AI_VALIDATION_READY"
    AI_BLUEPRINT_READY = "AI_BLUEPRINT_READY"
    AI_DOC_GENERATED = "AI_DOC_GENERATED"
    AI_ISSUES_CREATED = "AI_ISSUES_CREATED"
    TEAM_INVITE = "TEAM_INVITE"
    TEAM_MEMBER_JOINED = "TEAM_MEMBER_JOINED"
    ORG_ROLE_CHANGED = "ORG_ROLE_CHANGED"


class UserRoleType(str, enum.Enum):
    ADMIN = "admin"
    LEADER = "leader"
    MEMBER = "member"


class ReactionTargetType(str, enum.Enum):
    PROJECT_UPDATE = "project_update"
    PROJECT_UPDATE_COMMENT = "project_update_comment"


class ResourceTargetType(str, enum.Enum):
    PROJECT = "project"
    ISSUE = "issue"
