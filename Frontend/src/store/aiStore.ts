import { create } from 'zustand';
import { aiService } from '@/services/ai.service';
import { toast } from 'sonner';

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
  frontend: string[];
  backend: string[];
  infrastructure: string[];
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
  improvements: string[];
  core_features: Feature[];
  tech_stack: TechStack;
  pricing_model: PricingModel;
}

export interface FlowNode {
  id: string;
  label: string;
  type: string;
  subtasks: string[];
  status: string;
}

export interface Blueprint {
  user_flow_mermaid: string;
  kanban_features: { title: string; status: string; priority: string }[];
  nodes?: FlowNode[];
}

export interface Doc {
  id: string;
  asset_type: string;
  content: string;
}

interface AIStore {
  phase: Phase;
  ideaId: string | null;
  rawInput: string;
  questions: string[];
  answers: { question: string, answer: string }[];
  currentQuestionIndex: number;
  validationReport: ValidationReport | null;
  blueprint: Blueprint | null;
  docs: Doc[];
  
  // Loading & Progress
  isGenerating: boolean;
  generationMessage: string | null;
  
  // Actions
  setRawInput: (input: string) => void;
  reset: () => void;
  
  submitIdea: () => Promise<void>;
  answerQuestion: (answer: string) => Promise<void>;
  validateIdea: (feedback?: string) => Promise<void>;
  generateBlueprint: () => Promise<void>;
  generateDoc: (type: string) => Promise<void>;
  chatDoc: (type: string, message: string) => Promise<void>;
  generateIssues: (nodeId: string) => Promise<void>;
  updateValidationReport: (report: ValidationReport) => void;
  acceptImprovements: (acceptedIndices: number[]) => Promise<void>;
  selectedImprovementIndices: number[];
  setSelectedImprovements: (indices: number[]) => void;
}

export const useAIStore = create<AIStore>((set, get) => ({
  phase: 'INPUT',
  ideaId: null,
  rawInput: '',
  questions: [],
  answers: [],
  currentQuestionIndex: 0,
  validationReport: null,
  blueprint: null,
  docs: [],
  isGenerating: false,
  generationMessage: null,
  selectedImprovementIndices: [],

  setRawInput: (input) => set({ rawInput: input }),
  setSelectedImprovements: (indices) => set({ selectedImprovementIndices: indices }),
  
  reset: () => set({
    phase: 'INPUT',
    ideaId: null,
    rawInput: '',
    questions: [],
    answers: [],
    currentQuestionIndex: 0,
    validationReport: null,
    blueprint: null,
    docs: [],
    isGenerating: false,
    generationMessage: null,
  }),

  submitIdea: async () => {
    const { rawInput } = get();
    if (!rawInput.trim()) return;

    set({ isGenerating: true, generationMessage: 'Analyzing your idea...' });
    try {
      const res = await aiService.submitIdea(rawInput);
      set({ ideaId: res.data.id });

      if (res.data.status === 'CLARIFICATION_NEEDED') {
        set({
          questions: res.data.clarification_questions || [],
          phase: 'CLARIFICATION',
          isGenerating: false,
          generationMessage: null
        });
      } else {
        set({ phase: 'VALIDATION' });
        // Auto-trigger validation if no clarification needed
        get().validateIdea();
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || "Failed to submit idea";
      toast.error(errorMessage);
      set({ isGenerating: false, generationMessage: null });
    }
  },

  answerQuestion: async (answer) => {
    const { questions, currentQuestionIndex, answers, ideaId } = get();
    const newAnswers = [...answers, { question: questions[currentQuestionIndex], answer }];
    set({ answers: newAnswers });

    if (currentQuestionIndex < questions.length - 1) {
      set({ currentQuestionIndex: currentQuestionIndex + 1 });
    } else {
      set({ isGenerating: true, generationMessage: 'Processing your answers...' });
      try {
        await aiService.answerQuestions(ideaId!, newAnswers);
        set({ phase: 'VALIDATION' });
        get().validateIdea();
      } catch (error: any) {
        const errorMessage = error?.response?.data?.detail || error?.message || "Failed to save answers";
        toast.error(errorMessage);
        set({ isGenerating: false, generationMessage: null });
      }
    }
  },

  validateIdea: async (feedback?: string) => {
    const { ideaId } = get();
    if (!ideaId) return;

    set({ isGenerating: true, generationMessage: feedback ? 'Regenerating analysis...' : 'Validating your idea...' });
    try {
      const res = await aiService.validateIdea(ideaId, feedback);
      console.log('Validation report received:', res.data);
      console.log('Validation report keys:', Object.keys(res.data || {}));
      console.log('market_feasibility:', res.data?.market_feasibility);
      console.log('improvements:', res.data?.improvements);
      console.log('core_features:', res.data?.core_features);
      console.log('tech_stack:', res.data?.tech_stack);
      console.log('pricing_model:', res.data?.pricing_model);
      set({
        validationReport: res.data,
        isGenerating: false,
        generationMessage: null
      });
      if (feedback) toast.success("Analysis regenerated with your feedback");
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || "Validation failed";
      toast.error(errorMessage);
      set({ isGenerating: false, generationMessage: null });
    }
  },

  updateValidationReport: (report) => set({ validationReport: report }),

  generateBlueprint: async () => {
    const { ideaId, validationReport } = get();
    if (!ideaId) return;

    set({ isGenerating: true, generationMessage: 'Generating visual blueprint...' });
    try {
      if (validationReport) {
        // Save manual edits silently
        await aiService.updateValidationReport(ideaId, validationReport);
      }
      const res = await aiService.generateBlueprint(ideaId);
      set({
        blueprint: res.data,
        phase: 'BLUEPRINT',
        isGenerating: false,
        generationMessage: null
      });
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || "Blueprint generation failed";
      toast.error(errorMessage);
      set({ isGenerating: false, generationMessage: null });
    }
  },

  generateDoc: async (type) => {
    const { ideaId } = get();
    if (!ideaId) return;

    set({ isGenerating: true, generationMessage: `Generating ${type.replace('_', ' ')}...` });
    try {
      const res = await aiService.generateDoc(ideaId, type);
      set((state) => ({
        docs: [...state.docs, res.data],
        isGenerating: false,
        generationMessage: null
      }));
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || `Failed to generate ${type}`;
      toast.error(errorMessage);
      set({ isGenerating: false, generationMessage: null });
    }
  },

  chatDoc: async (type, message) => {
    const { ideaId } = get();
    if (!ideaId) return;

    set({ isGenerating: true, generationMessage: 'Updating document...' });
    try {
      const res = await aiService.chatDoc(ideaId, type, message);
      set((state) => ({
        docs: state.docs.map(d => d.asset_type === type ? res.data : d),
        isGenerating: false,
        generationMessage: null
      }));
      toast.success("Document updated");
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || "Failed to update document";
      toast.error(errorMessage);
      set({ isGenerating: false, generationMessage: null });
    }
  },

  generateIssues: async (nodeId) => {
    const { ideaId } = get();
    if (!ideaId) return;

    set({ isGenerating: true, generationMessage: `Generating issues for ${nodeId}...` });
    try {
      await aiService.generateIssuesForNode(ideaId, nodeId);
      toast.success(`Successfully generated and linked issues for ${nodeId}`);
      set({ isGenerating: false, generationMessage: null });
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || "Failed to generate issues";
      toast.error(errorMessage);
      set({ isGenerating: false, generationMessage: null });
    }
  },

  acceptImprovements: async (acceptedIndices) => {
    const { ideaId } = get();
    if (!ideaId) return;

    set({ isGenerating: true, generationMessage: 'Applying improvements and re-validating...' });
    try {
      const res = await aiService.acceptImprovementsAndRevalidate(ideaId, acceptedIndices);
      set({
        validationReport: res.data,
        selectedImprovementIndices: [],
        isGenerating: false,
        generationMessage: null
      });
      toast.success(`Successfully applied ${acceptedIndices.length} improvements and re-validated!`);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || "Failed to apply improvements";
      toast.error(errorMessage);
      set({ isGenerating: false, generationMessage: null });
    }
  }
}));
