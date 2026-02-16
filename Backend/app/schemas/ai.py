from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
from uuid import UUID
from app.models.project_idea import IdeaStatus, AssetType, AssetStatus


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
    id: str
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


class DocGenerationRequest(BaseModel):
    doc_type: AssetType
    answers: Optional[List[Dict[str, str]]] = None


class DocResponse(BaseModel):
    id: str
    asset_type: AssetType
    content: str
    status: AssetStatus
    r2_path: Optional[str]
    chat_history: Optional[List[Dict[str, str]]] = None

    model_config = {"from_attributes": True}


class DocChatRequest(BaseModel):
    message: str


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