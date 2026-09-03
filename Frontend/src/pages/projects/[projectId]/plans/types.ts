export type Phase = 'INPUT' | 'CLARIFICATION' | 'VALIDATION' | 'BLUEPRINT' | 'DOCUMENTATION';

export interface Pillar {
  name: string;
  status: string;
  reason: string;
}

export interface Feature {
  name: string;
  description: string;
  type: string;
}

export interface TechStack {
  frontend?: string[];
  backend?: string[];
  database?: string[];
  infrastructure?: string[];
}

export interface PricingTier {
  name: string;
  price: string;
  annual_price?: string;
  features: string[];
}

export interface PricingModel {
  type: string;
  recommended_type?: string;
  reasoning?: string;
  tiers: PricingTier[];
}

export interface ValidationReport {
  market_feasibility: {
    pillars: Pillar[];
    score: number;
    analysis: string;
  };
  core_features: Feature[];
  tech_stack: TechStack;
  pricing_model: PricingModel;
  improvements: string[];
}

export interface BlueprintNode {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
  subtasks?: string[];
  status?: string;
  completion?: number;
}

export interface BlueprintEdge {
  from: string;
  to: string;
  label?: string;
}

export interface Blueprint {
  user_flow_mermaid: string;
  kanban_features: { title: string; status: string; priority: string }[];
  nodes?: BlueprintNode[];
  edges?: BlueprintEdge[];
  /** True when the stored kanban asset content couldn't be parsed - render
   * an explicit "couldn't load" state instead of treating this as "no
   * kanban items yet". */
  kanban_parse_error?: boolean;
}

export interface DocQuestion {
  id: string;
  question: string;
  suggestion?: string;
  optional?: boolean;
}

export interface Doc {
  id: string;
  asset_type: string;
  content: string;
  chat_history?: Array<{ role: string; content: string }>;
  status?: string;
}
