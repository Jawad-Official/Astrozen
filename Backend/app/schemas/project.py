from pydantic import BaseModel, UUID4
from typing import Optional, List
from datetime import datetime, date
from app.models.project import ProjectStatus, ProjectHealth, ProjectPriority, Visibility
from app.schemas.user import UserBase, UserInDB
from app.schemas.team import Team as TeamSchema


class ProjectBase(BaseModel):
    name: str
    icon: str
    color: str
    description: Optional[str] = None
    status: ProjectStatus = ProjectStatus.BACKLOG
    health: ProjectHealth = ProjectHealth.NO_UPDATES
    priority: ProjectPriority = ProjectPriority.NONE
    is_favorite: bool = False
    
    # New fields
    team_id: Optional[UUID4] = None
    visibility: Visibility = Visibility.TEAM
    
    start_date: Optional[date] = None
    target_date: Optional[date] = None


class ProjectCreate(ProjectBase):
    lead_id: Optional[UUID4] = None
    member_ids: Optional[List[UUID4]] = []
    team_ids: Optional[List[UUID4]] = []


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    health: Optional[ProjectHealth] = None
    priority: Optional[ProjectPriority] = None
    is_favorite: Optional[bool] = None
    team_id: Optional[UUID4] = None
    visibility: Optional[Visibility] = None
    lead_id: Optional[UUID4] = None
    start_date: Optional[date] = None
    target_date: Optional[date] = None
    member_ids: Optional[List[UUID4]] = None
    team_ids: Optional[List[UUID4]] = None





# Milestone schemas
class MilestoneBase(BaseModel):
    name: str
    description: Optional[str] = None
    target_date: Optional[date] = None
    completed: bool = False


class MilestoneCreate(MilestoneBase):
    pass


class MilestoneUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    target_date: Optional[date] = None
    completed: Optional[bool] = None


class Milestone(MilestoneBase):
    id: UUID4
    project_id: UUID4
    created_at: datetime
    
    class Config:
        from_attributes = True
        use_enum_values = True


class ProjectUpdateBase(BaseModel):
    project_id: UUID4
    health: ProjectHealth
    content: str


class ProjectUpdateCreate(ProjectUpdateBase):
    pass


class ProjectUpdateCommentBase(BaseModel):
    update_id: UUID4
    content: str
    parent_id: Optional[UUID4] = None


class ProjectUpdateCommentCreate(ProjectUpdateCommentBase):
    pass


class ProjectUpdateCommentReactionBase(BaseModel):
    comment_id: UUID4
    emoji: str


class ProjectUpdateCommentReactionCreate(ProjectUpdateCommentReactionBase):
    pass


class ProjectUpdateCommentReaction(ProjectUpdateCommentReactionBase):
    id: UUID4
    user_id: UUID4
    user: Optional[UserBase] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ProjectUpdateComment(ProjectUpdateCommentBase):
    id: UUID4
    author_id: UUID4
    author: Optional[UserBase] = None
    reactions: List[ProjectUpdateCommentReaction] = []
    created_at: datetime

    class Config:
        from_attributes = True


class ProjectUpdateReactionBase(BaseModel):
    update_id: UUID4
    emoji: str


class ProjectUpdateReactionCreate(ProjectUpdateReactionBase):
    pass


class ProjectUpdateReaction(ProjectUpdateReactionBase):
    id: UUID4
    user_id: UUID4
    user: Optional[UserBase] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ProjectUpdateLog(ProjectUpdateBase):
    id: UUID4
    author_id: UUID4
    author: Optional[UserBase] = None
    comments: List[ProjectUpdateComment] = []
    reactions: List[ProjectUpdateReaction] = []
    created_at: datetime

    class Config:
        from_attributes = True
        use_enum_values = True


class ProjectResourceBase(BaseModel):
    name: str
    url: str
    type: str # ResourceType enum as string


class ProjectResourceCreate(ProjectResourceBase):
    pass


class ProjectResource(ProjectResourceBase):
    id: UUID4
    project_id: UUID4
    created_at: datetime

    class Config:
        from_attributes = True
        use_enum_values = True


class Project(ProjectBase):
    id: UUID4
    lead_id: Optional[UUID4] = None
    lead: Optional[UserBase] = None
    members: List[UserInDB] = []
    teams: List[TeamSchema] = []
    updates: List[ProjectUpdateLog] = []
    resources: List[ProjectResource] = []
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
        use_enum_values = True
