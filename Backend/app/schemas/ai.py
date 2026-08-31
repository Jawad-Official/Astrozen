from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
from uuid import UUID
from app.models.project_idea import IdeaStatus, AssetType, AssetStatus
from app.models.issue import IssueStatus, IssuePriority
from app.models.feature import FeatureStatus


class IdeaSubmit(BaseModel):
    raw_input: str
    name: Optional[str] = None


class ClarificationAnswer(BaseModel):
    question: str
    answer: str


class IdeaUpdate(BaseModel):
    clarifications: Optional[List[ClarificationAnswer]] = None
    refined_description: Optional[str] = None


class IdeaResponse(BaseModel):
    id: Union[str, UUID]
    project_id: Optional[Union[str, UUID]] = None
    raw_input: str
    status: IdeaStatus
    clarification_questions: Optional[List[Dict[str, Any]]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class Pillar(BaseModel):
    name: str
    status: str
    reason: str


class MarketFeasibility(BaseModel):
    score: int
    analysis: str
    pillars: List[Pillar]


class FeatureItem(BaseModel):
    name: str
    description: str
    type: str


class PricingTier(BaseModel):
    name: str
    price: str
    features: List[str]


class PricingModel(BaseModel):
    type: str
    tiers: List[PricingTier]

    model_config = {"from_attributes": True}


class ValidationReportResponse(BaseModel):
    market_feasibility: MarketFeasibility
    improvements: List[str]
    core_features: List[FeatureItem]
    tech_stack: Dict[str, List[str]]
    pricing_model: PricingModel

    model_config = {"from_attributes": True}


class FlowNode(BaseModel):
    id: str
    label: str
    type: str
    x: int
    y: int
    subtasks: List[str]
    status: str


class FlowEdge(BaseModel):
    from_field: str = Field(alias="from")
    to: str
    label: str


class KanbanFeature(BaseModel):
    id: Union[str, UUID]
    title: str
    status: str
    priority: str
    description: str


class BlueprintResponse(BaseModel):
    user_flow_mermaid: str
    kanban_features: List[KanbanFeature]
    nodes: Optional[List[FlowNode]] = []
    edges: Optional[List[FlowEdge]] = []

    model_config = {"from_attributes": True}


class BlueprintSaveNode(BaseModel):
    """A single node in a manually-edited blueprint (e.g. after dragging to
    reposition). Deliberately more lenient than FlowNode - the frontend only
    guarantees `id`, and round-trips whatever other fields it already had."""

    model_config = {"extra": "allow"}

    id: str
    label: Optional[str] = None
    type: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None
    subtasks: Optional[List[str]] = None
    status: Optional[str] = None


class BlueprintSaveEdge(BaseModel):
    model_config = {"extra": "allow", "populate_by_name": True}

    from_field: Optional[str] = Field(default=None, alias="from")
    to: Optional[str] = None
    label: Optional[str] = None


class BlueprintSaveRequest(BaseModel):
    """Body for PUT /idea/{idea_id}/blueprint. `user_flow_mermaid` is the
    diagram source text rendered client-side by Mermaid - bounding its type
    and length here is a defense-in-depth measure alongside Mermaid's own
    'strict' securityLevel and DOMPurify sanitization on the render side."""

    nodes: List[BlueprintSaveNode] = []
    edges: List[BlueprintSaveEdge] = []
    user_flow_mermaid: str = Field(default="", max_length=20000)


class DocGenerationRequest(BaseModel):
    doc_type: AssetType
    answers: Optional[List[Dict[str, str]]] = None


class DocResponse(BaseModel):
    id: Union[str, UUID]
    asset_type: AssetType
    content: str
    status: AssetStatus
    r2_path: Optional[str]
    chat_history: Optional[List[Dict[str, str]]] = None

    model_config = {"from_attributes": True}


class DocumentMeta(BaseModel):
    id: UUID
    project_id: Optional[UUID]
    drive_file_id: str
    r2_path: str
    title: str
    embed_url: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocChatRequest(BaseModel):
    message: str


class ApplyDocumentChangeRequest(BaseModel):
    find: str
    replace: str


class DocQuestion(BaseModel):
    question: str
    suggestion: Optional[str] = None


class DocQuestionsResponse(BaseModel):
    has_questions: bool
    questions: List[DocQuestion]


class ProgressDashboard(BaseModel):
    idea_id: str
    phases: Dict[str, Any]
    overall_progress: int
    next_steps: List[str]


class RegenerateFieldRequest(BaseModel):
    field_name: str
    feedback: str


class RegenerateSectionRequest(BaseModel):
    section_content: str
    user_message: str


class BlueprintNodeIssueSummary(BaseModel):
    id: str
    identifier: str
    title: str
    status: IssueStatus
    priority: IssuePriority


class BlueprintNodeFeatureSummary(BaseModel):
    id: str
    name: str
    status: FeatureStatus


class BlueprintNodeStats(BaseModel):
    total_issues: int
    done_issues: int


class BlueprintNodeDetailsResponse(BaseModel):
    node_id: str
    completion: int
    stats: BlueprintNodeStats
    issues: List[BlueprintNodeIssueSummary]
    features: List[BlueprintNodeFeatureSummary]


class IdeaDetailsAsset(BaseModel):
    """One processed ProjectAsset row. extra='allow' since asset content
    parsing is dynamic (JSON vs legacy mermaid-string content)."""

    model_config = {"extra": "allow"}

    id: str
    asset_type: str
    content: Optional[str] = None
    status: str
    chat_history: Optional[Any] = None


class IdeaDetailsResponse(BaseModel):
    """Full idea detail response (GET /idea/{idea_id}). Deliberately
    lenient (extra='allow', loosely-typed nested dicts) on
    validation_report/blueprint since both are assembled server-side from
    dynamically-parsed JSON asset content with an evolving shape - this
    documents and types the known top-level fields without risking
    silently dropping fields the frontend depends on."""

    model_config = {"extra": "allow"}

    id: str
    raw_input: str
    refined_description: Optional[str] = None
    status: IdeaStatus
    clarification_questions: Optional[Any] = None
    validation_report: Optional[Dict[str, Any]] = None
    assets: List[IdeaDetailsAsset] = []
    blueprint: Optional[Dict[str, Any]] = None
