import { apiClient as api } from '@/lib/api-client';

// Document types and order
export const DOC_ORDER = ["PRD", "APP_FLOW", "TECH_STACK", "FRONTEND_GUIDELINES", "BACKEND_SCHEMA", "IMPLEMENTATION_PLAN"];

// 6 Core Pillars
export const CORE_PILLARS = [
  "Market Demand",
  "Technical Feasibility",
  "Business Model",
  "Competition",
  "User Experience",
  "Scalability"
];

export interface Pillar {
  name: string;
  status: string;
  reason: string;
}

export interface MarketFeasibility {
  score: number;
  analysis: string;
  pillars: Pillar[];
}

export interface FeatureItem {
  name: string;
  description: string;
  type: string;
}

export interface PricingTier {
  name: string;
  price: string;
  features: string[];
}

export interface PricingModel {
  type: string;
  tiers: PricingTier[];
}

export interface ValidationReport {
  market_feasibility: MarketFeasibility;
  improvements: string[];
  core_features: FeatureItem[];
  tech_stack: {
    frontend: string[];
    backend: string[];
    infrastructure: string[];
  };
  pricing_model: PricingModel;
}

export interface FlowNode {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
  subtasks: string[];
  status: string;
}

export interface FlowEdge {
  from_field: string;
  to: string;
  label: string;
}

export interface KanbanFeature {
  id: string;
  title: string;
  status: string;
  priority: string;
  description: string;
}

export interface Blueprint {
  user_flow_mermaid: string;
  kanban_features: KanbanFeature[];
  nodes?: FlowNode[];
  edges?: FlowEdge[];
}

export interface Doc {
  id: string;
  asset_type: string;
  content: string;
  status: string;
  r2_path?: string;
  chat_history?: Array<{ role: string; content: string }>;
}

export interface DocQuestion {
  id: string;
  question: string;
  suggestion?: string;
  optional?: boolean;
}

export interface ProgressDashboard {
  idea_id: string;
  phases: {
    input: { completed: boolean; progress: number };
    clarification: { completed: boolean; progress: number };
    validation: { completed: boolean; progress: number };
    blueprint: { completed: boolean; progress: number };
    documentation: {
      completed: number;
      total: number;
      progress: number;
    };
  };
  overall_progress: number;
  next_steps: string[];
}

export const aiService = {
  submitIdea: (raw_input: string, project_id?: string, name?: string) =>
    api.post('/ai/idea/submit', { raw_input, name }, { params: { project_id } }),

  suggestAnswer: (ideaId: string, questionIndex: number) =>
    api.post(`/ai/idea/${ideaId}/suggest/${questionIndex}`),

  answerQuestions: (ideaId: string, answers: { question: string; answer: string }[]) =>
    api.post(`/ai/idea/${ideaId}/answer`, answers),

  validateIdea: (ideaId: string, feedback?: string) =>
    api.post(`/ai/idea/${ideaId}/validate${feedback ? `?feedback=${encodeURIComponent(feedback)}` : ''}`),

  updateValidationReport: (ideaId: string, report: Partial<ValidationReport>) =>
    api.put(`/ai/idea/${ideaId}/validate`, report),

  regenerateValidationField: (ideaId: string, fieldName: string, feedback: string) =>
    api.post(`/ai/idea/${ideaId}/validate/regenerate-field`, { field_name: fieldName, feedback }),

  acceptImprovementsAndRevalidate: (ideaId: string, acceptedImprovements: number[]) =>
    api.post(`/ai/idea/${ideaId}/validate/accept-improvements`, acceptedImprovements),

  generateBlueprint: (ideaId: string) =>
    api.post<{ user_flow_mermaid: string; kanban_features: KanbanFeature[]; nodes?: FlowNode[]; edges?: FlowEdge[] }>(`/ai/idea/${ideaId}/blueprint`),

  saveBlueprint: (ideaId: string, blueprint: Partial<Blueprint>) =>
    api.put(`/ai/idea/${ideaId}/blueprint`, blueprint),

  getDocQuestions: (ideaId: string, docType: string) =>
    api.get<{ has_questions: boolean; questions: DocQuestion[] }>(`/ai/idea/${ideaId}/doc/${docType}/questions`),

  generateDoc: (ideaId: string, docType: string, answers?: Array<{ question: string; answer: string }>) =>
    api.post<Doc>(`/ai/idea/${ideaId}/doc/${docType}`, { answers }),

  uploadDoc: (ideaId: string, docType: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/ai/idea/${ideaId}/doc/upload?doc_type=${docType}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  syncBlueprint: (ideaId: string) =>
    api.post(`/ai/idea/${ideaId}/blueprint/sync`),

  chatDoc: (ideaId: string, docType: string, message: string) =>
    api.post<Doc>(`/ai/idea/${ideaId}/doc/${docType}/chat`, { message }),

  regenerateDocSection: (ideaId: string, docType: string, sectionContent: string, userMessage: string) =>
    api.post<Doc>(`/ai/idea/${ideaId}/doc/${docType}/regenerate-section`, {
      section_content: sectionContent,
      user_message: userMessage
    }),

  getIdea: (ideaId: string) =>
    api.get<{
      id: string;
      raw_input: string;
      refined_description?: string;
      status: string;
      clarification_questions?: Array<{ question: string; answer?: string; suggestion?: string }>;
      validation_report?: ValidationReport;
      assets?: Doc[];
    }>(`/ai/idea/${ideaId}`),

  getProjectIdeas: (projectId: string) =>
    api.get<{ ideas: Array<{ id: string; raw_input: string; refined_description?: string; status: string; created_at?: string; updated_at?: string; has_validation_report: boolean }> }>(`/ai/ideas/${projectId}`),

  getProgress: (ideaId: string) =>
    api.get<ProgressDashboard>(`/ai/idea/${ideaId}/progress`),

  getDocOrder: () =>
    api.get<{ order: string[] }>(`/ai/doc-order`),

  getCorePillars: () =>
    api.get<{ pillars: string[] }>(`/ai/pillars`),

  convertToProject: (ideaId: string, teamId: string) =>
    api.post(`/ai/idea/${ideaId}/convert`, { team_id: teamId }),

  generateIssuesForNode: (ideaId: string, nodeId: string) =>
    api.post(`/ai/idea/${ideaId}/blueprint/node/${nodeId}/issues`),

  getNodeDetails: (ideaId: string, nodeId: string) =>
    api.get<{
      node_id: string;
      completion: number;
      stats: { total_issues: number; done_issues: number };
      issues: Array<{ id: string; identifier: string; title: string; status: string; priority: string }>;
      features: Array<{ id: string; name: string; status: string }>;
    }>(`/ai/idea/${ideaId}/blueprint/node/${nodeId}/details`),

  linkIssueToNode: (ideaId: string, nodeId: string, issueId: string) =>
    api.post(`/ai/idea/${ideaId}/blueprint/node/${nodeId}/link-issue`, null, { params: { issue_id: issueId } }),

  unlinkIssueFromNode: (ideaId: string, nodeId: string, issueId: string) =>
    api.post(`/ai/idea/${ideaId}/blueprint/node/${nodeId}/unlink-issue`, null, { params: { issue_id: issueId } })
};