from pydantic import BaseModel, UUID4
from typing import Optional, List
from datetime import datetime, date
from app.models.issue import (
    IssueStatus,
    IssuePriority,
    IssueType,
    TriageStatus,
    Visibility,
)
from app.models.project import ResourceType


class IssueResourceBase(BaseModel):
    name: str
    url: str
    type: ResourceType


class IssueResourceCreate(IssueResourceBase):
    pass


class IssueResource(IssueResourceBase):
    id: UUID4
    issue_id: UUID4
    created_at: datetime

    class Config:
        from_attributes = True
        use_enum_values = True


class IssueBase(BaseModel):
    title: str
    description: Optional[str] = None
    issue_type: IssueType = IssueType.TASK
    status: IssueStatus = IssueStatus.BACKLOG
    priority: IssuePriority = IssuePriority.NONE
    triage_status: Optional[TriageStatus] = None

    # Organization/Team fields
    team_id: UUID4
    visibility: Visibility = Visibility.TEAM

    feature_id: UUID4
    milestone_id: Optional[UUID4] = None
    assignee_id: Optional[UUID4] = None
    parent_id: Optional[UUID4] = None
    blueprint_node_id: Optional[str] = None
    due_date: Optional[date] = None


class IssueCreate(IssueBase):
    resources: Optional[List[IssueResourceCreate]] = None


class IssueUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    issue_type: Optional[IssueType] = None
    status: Optional[IssueStatus] = None
    priority: Optional[IssuePriority] = None
    triage_status: Optional[TriageStatus] = None
    visibility: Optional[Visibility] = None
    feature_id: Optional[UUID4] = None
    milestone_id: Optional[UUID4] = None
    assignee_id: Optional[UUID4] = None
    parent_id: Optional[UUID4] = None
    blueprint_node_id: Optional[str] = None
    due_date: Optional[date] = None


from app.schemas.user import UserBase


class Issue(IssueBase):
    id: UUID4
    identifier: str
    assignee: Optional[UserBase] = None
    created_at: datetime
    updated_at: datetime
    sub_issues: List["Issue"] = []
    resources: List[IssueResource] = []

    class Config:
        from_attributes = True
        use_enum_values = True


class IssueList(BaseModel):
    issues: List[Issue]
    total: int
