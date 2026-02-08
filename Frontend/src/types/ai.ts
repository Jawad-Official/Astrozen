export interface ProjectIdeaResponse {
  id: string;
  status: 'draft' | 'validating' | 'validated' | 'confirmed' | 'generating_assets' | 'completed';
  created_at: string;
}

export interface ClarificationResponse {
  next_question?: string;
  is_complete: boolean;
}

export interface MarketAnalysis {
  viability: string;
  target_audience: string;
  competitors: string[];
}

export interface CoreFeature {
  name: string;
  priority: string;
  description: string;
}

export interface TechStack {
  frontend: string;
  backend: string;
  database: string;
  infrastructure: string;
}

export interface PricingModel {
  strategy: string;
  rationale: string;
}

export interface ValidationReportResponse {
  market_analysis: MarketAnalysis;
  core_features: CoreFeature[];
  tech_stack: TechStack;
  pricing_model: PricingModel;
  improvements: string[];
  refined_description: string;
}
