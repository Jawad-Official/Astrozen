import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/services/ai.service', () => ({
  aiService: {
    getIdea: vi.fn(),
    listDocuments: vi.fn(),
    generateDoc: vi.fn(),
    validateIdea: vi.fn(),
  },
}));
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));
vi.mock('@/components/Mermaid', () => ({ default: () => null }));
vi.mock('@/components/AIDocChatPanel', () => ({
  AIDocChatPanel: ({ docId }: { docId: string }) => <div data-testid="structured-chat">{docId}</div>,
}));

import AIGeneratorPage from './page';
import { useAIStore } from '@/store/aiStore';
import { aiService } from '@/services/ai.service';

const svc = vi.mocked(aiService, true);

const prd = { id: 'a1', asset_type: 'PRD', content: '# Product Requirements\n\nGoals here.', status: 'COMPLETED', chat_history: [] };

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/ai-generator']}>
      <AIGeneratorPage />
    </MemoryRouter>
  );

const slotStatus = (docType: string) => within(screen.getByTestId(`doc-slot-${docType}`));

beforeEach(() => {
  vi.clearAllMocks();
  useAIStore.getState().reset();
  useAIStore.setState({ phase: 'DOCUMENTATION', ideaId: 'idea-1' });
});

afterEach(cleanup);

describe('AI generator documentation phase', () => {
  it('without Google Drive, generating PRD marks it generated, unlocks App Flow and opens the viewer', async () => {
    // Drive not configured: no Document rows, ever.
    svc.listDocuments.mockResolvedValue({ data: [] } as any);
    svc.getIdea.mockResolvedValue({ data: { id: 'idea-1', raw_input: '', status: 'COMPLETED', assets: [] } } as any);
    svc.generateDoc.mockResolvedValue({ data: prd } as any);

    renderPage();
    await waitFor(() => expect(svc.getIdea).toHaveBeenCalled());

    expect(slotStatus('PRD').getByText('Click to generate')).toBeInTheDocument();
    expect(slotStatus('APP_FLOW').getByText('Locked')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('doc-slot-PRD'));

    await waitFor(() => expect(slotStatus('PRD').getByText('Ready to edit')).toBeInTheDocument());
    expect(slotStatus('APP_FLOW').getByText('Click to generate')).toBeInTheDocument();
    expect(svc.generateDoc).toHaveBeenCalledWith('idea-1', 'PRD');

    // In-app viewer opens with the doc; no Google Docs card or structured chat.
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Goals here.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /apply change/i })).toBeInTheDocument();
    expect(screen.queryByTestId('structured-chat')).not.toBeInTheDocument();
  });

  it('with a Google Doc mirror, selecting the doc shows the structured chat', async () => {
    svc.getIdea.mockResolvedValue({ data: { id: 'idea-1', raw_input: '', status: 'COMPLETED', assets: [prd] } } as any);
    svc.listDocuments.mockResolvedValue({
      data: [{
        id: 'gdoc-1',
        project_id: 'p1',
        drive_file_id: 'drive-1',
        r2_path: 'projects/idea-1/docs/PRD.md',
        title: 'Idea - Product Requirements',
        embed_url: 'https://docs.google.com/document/d/drive-1/edit',
        created_at: '',
        updated_at: '',
      }],
    } as any);

    renderPage();
    await waitFor(() => expect(slotStatus('PRD').getByText('Ready to edit')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('doc-slot-PRD'));

    expect(await screen.findByTestId('structured-chat')).toHaveTextContent('gdoc-1');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
