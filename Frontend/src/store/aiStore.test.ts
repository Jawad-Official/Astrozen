import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/ai.service', () => ({
  aiService: {
    submitIdea: vi.fn(),
    answerQuestions: vi.fn(),
    validateIdea: vi.fn(),
    updateValidationReport: vi.fn(),
    generateBlueprint: vi.fn(),
    generateDoc: vi.fn(),
    chatDoc: vi.fn(),
    generateIssuesForNode: vi.fn(),
    acceptImprovementsAndRevalidate: vi.fn(),
    listDocuments: vi.fn(),
    applyChange: vi.fn(),
    syncDocument: vi.fn(),
    deleteDocument: vi.fn(),
  },
}));
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { useAIStore } from './aiStore';
import { aiService } from '@/services/ai.service';
import { toast } from 'sonner';

const svc = vi.mocked(aiService, true);

beforeEach(() => {
  useAIStore.getState().reset();
  vi.clearAllMocks();
});

describe('submitIdea', () => {
  it('moves to CLARIFICATION when the backend asks for it', async () => {
    useAIStore.getState().setRawInput('a marketplace for widgets');
    svc.submitIdea.mockResolvedValue({
      data: { id: 'idea-1', status: 'CLARIFICATION_NEEDED', clarification_questions: ['Who is this for?'] },
    } as any);

    await useAIStore.getState().submitIdea();

    const state = useAIStore.getState();
    expect(state.ideaId).toBe('idea-1');
    expect(state.phase).toBe('CLARIFICATION');
    expect(state.questions).toEqual(['Who is this for?']);
    expect(state.isGenerating).toBe(false);
  });

  it('auto-triggers validation when no clarification is needed', async () => {
    useAIStore.getState().setRawInput('a very clear idea');
    svc.submitIdea.mockResolvedValue({ data: { id: 'idea-2', status: 'VALIDATED' } } as any);
    svc.validateIdea.mockResolvedValue({ data: { market_feasibility: { pillars: [], score: 80, analysis: '' }, improvements: [], core_features: [], tech_stack: {}, pricing_model: { type: 'Subscription', tiers: [] } } } as any);

    await useAIStore.getState().submitIdea();

    expect(svc.validateIdea).toHaveBeenCalledWith('idea-2', undefined);
  });

  it('is a no-op on empty input', async () => {
    useAIStore.getState().setRawInput('   ');
    await useAIStore.getState().submitIdea();
    expect(svc.submitIdea).not.toHaveBeenCalled();
  });

  it('surfaces a toast and stops generating on failure', async () => {
    useAIStore.getState().setRawInput('an idea');
    svc.submitIdea.mockRejectedValue(new Error('down'));

    await useAIStore.getState().submitIdea();

    expect(toast.error).toHaveBeenCalled();
    expect(useAIStore.getState().isGenerating).toBe(false);
  });
});

describe('answerQuestion', () => {
  it('advances to the next question without calling the backend', async () => {
    useAIStore.setState({ questions: ['Q1', 'Q2'], currentQuestionIndex: 0, answers: [], ideaId: 'idea-1' });

    await useAIStore.getState().answerQuestion('answer to Q1');

    const state = useAIStore.getState();
    expect(state.currentQuestionIndex).toBe(1);
    expect(state.answers).toEqual([{ question: 'Q1', answer: 'answer to Q1' }]);
    expect(svc.answerQuestions).not.toHaveBeenCalled();
  });

  it('submits all answers and moves to VALIDATION on the last question', async () => {
    useAIStore.setState({ questions: ['Q1'], currentQuestionIndex: 0, answers: [], ideaId: 'idea-1' });
    svc.answerQuestions.mockResolvedValue({} as any);
    svc.validateIdea.mockResolvedValue({ data: { market_feasibility: { pillars: [], score: 50, analysis: '' }, improvements: [], core_features: [], tech_stack: {}, pricing_model: { type: 'Subscription', tiers: [] } } } as any);

    await useAIStore.getState().answerQuestion('final answer');

    expect(svc.answerQuestions).toHaveBeenCalledWith('idea-1', [{ question: 'Q1', answer: 'final answer' }]);
    expect(useAIStore.getState().phase).toBe('VALIDATION');
  });
});

describe('generateBlueprint', () => {
  it('preserves a kanban_parse_error flag from the backend response', async () => {
    useAIStore.setState({ ideaId: 'idea-1', validationReport: null });
    svc.generateBlueprint.mockResolvedValue({
      data: { user_flow_mermaid: '', kanban_features: [], kanban_parse_error: true },
    } as any);

    await useAIStore.getState().generateBlueprint();

    const state = useAIStore.getState();
    expect(state.blueprint?.kanban_parse_error).toBe(true);
    expect(state.phase).toBe('BLUEPRINT');
  });

  it('is a no-op without an ideaId', async () => {
    useAIStore.setState({ ideaId: null });
    await useAIStore.getState().generateBlueprint();
    expect(svc.generateBlueprint).not.toHaveBeenCalled();
  });
});

describe('deleteDocument', () => {
  it('removes the document and clears activeDocumentId if it was selected', async () => {
    useAIStore.setState({
      documents: [{ id: 'd1' } as any, { id: 'd2' } as any],
      activeDocumentId: 'd1',
    });
    svc.deleteDocument.mockResolvedValue({} as any);

    await useAIStore.getState().deleteDocument('d1');

    const state = useAIStore.getState();
    expect(state.documents.map(d => d.id)).toEqual(['d2']);
    expect(state.activeDocumentId).toBeNull();
  });
});

describe('acceptImprovements', () => {
  it('clears selectedImprovementIndices and stores the revalidated report', async () => {
    useAIStore.setState({ ideaId: 'idea-1', selectedImprovementIndices: [0, 2] });
    const revalidated = { market_feasibility: { pillars: [], score: 90, analysis: '' }, improvements: [], core_features: [], tech_stack: {}, pricing_model: { type: 'Subscription', tiers: [] } };
    svc.acceptImprovementsAndRevalidate.mockResolvedValue({ data: revalidated } as any);

    await useAIStore.getState().acceptImprovements([0, 2]);

    const state = useAIStore.getState();
    expect(state.validationReport).toEqual(revalidated);
    expect(state.selectedImprovementIndices).toEqual([]);
  });
});
