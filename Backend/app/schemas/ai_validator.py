from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from uuid import UUID
from app.models.project_idea import IdeaStatus

class ProjectIdeaCreate(BaseModel):
    raw_input: str
    project_id: Optional[UUID] = None

class ProjectIdeaResponse(BaseModel):
    id: UUID
    project_id: Optional[UUID]
    status: IdeaStatus
    created_at: Any

class ClarificationAnswer(BaseModel):
    answer: str
    history: Optional[List[Dict[str, str]]] = []

class ClarificationResponse(BaseModel):
    next_question: Optional[str]
    is_complete: bool
    total_estimated_questions: int = 7
    current_question_index: int = 0

class MarketAnalysis(BaseModel):
    viability: str
    target_audience: str
    competitors: List[str]
    pillar_scores: Optional[Dict[str, str]] = None

class CoreFeature(BaseModel):
    name: str
    priority: str
    description: str

class TechStack(BaseModel):
    frontend: str
    backend: str
    database: str
    infrastructure: str

class PricingModel(BaseModel):
    strategy: str
    rationale: str

class ValidationReportResponse(BaseModel):
    market_analysis: MarketAnalysis
    core_features: List[CoreFeature]
    tech_stack: TechStack
    pricing_model: PricingModel
    improvements: List[str]
    refined_description: str
