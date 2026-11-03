import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, within } from '@testing-library/react';
import { DocumentationSection } from './DocumentationSection';
import { DocViewerDialog } from './DocViewerDialog';
import { Doc } from './types';

const prd: Doc = {
  id: 'd1',
  asset_type: 'PRD',
  content: '# PRD\n\n## Goals\n\n| a | b |\n|---|---|\n| 1 | 2 |',
  status: 'COMPLETED',
  chat_history: [],
};

const renderSection = (docs: Doc[], overrides: Partial<Parameters<typeof DocumentationSection>[0]> = {}) => {
  const props = {
    docs,
    docAnalysis: {},
    busyDocType: null,
    handleOpenDoc: vi.fn(),
    handleDownloadDoc: vi.fn(async () => {}),
    handleGenerateDocFlow: vi.fn(async () => {}),
    handleUploadClick: vi.fn(),
    openAnalysis: vi.fn(),
    ...overrides,
  };
  render(<DocumentationSection {...props} />);
  return props;
};

afterEach(cleanup);

const card = (docType: string) => document.querySelector(`[data-doc-type="${docType}"]`) as HTMLElement;

describe('DocumentationSection', () => {
  it('locks later docs until the previous one exists', () => {
    renderSection([]);
    const generateButtons = screen.getAllByRole('button', { name: /generate/i });
    // PRD is first and unlocked; the other five wait for their predecessor.
    expect(generateButtons[0]).toBeEnabled();
    expect(generateButtons.slice(1).every((b) => (b as HTMLButtonElement).disabled)).toBe(true);
    expect(screen.getByText(/Create Product Requirements first/i)).toBeInTheDocument();
  });

  it('opens a generated doc and unlocks the next one', () => {
    const props = renderSection([prd]);
    fireEvent.click(within(card('PRD')).getByRole('button', { name: /open/i }));
    expect(props.handleOpenDoc).toHaveBeenCalledWith('PRD');

    fireEvent.click(within(card('APP_FLOW')).getByRole('button', { name: /generate/i }));
    expect(props.handleGenerateDocFlow).toHaveBeenCalledWith('APP_FLOW');
    expect(screen.getByText('1 / 6')).toBeInTheDocument();
  });

  it('shows progress on the busy card and blocks other actions', () => {
    renderSection([], { busyDocType: 'PRD' });
    expect(screen.getByText(/Working on it/i)).toBeInTheDocument();
    const uploads = screen.getAllByRole('button', { name: /upload/i });
    expect(uploads.every((b) => (b as HTMLButtonElement).disabled)).toBe(true);
  });
});

describe('DocViewerDialog', () => {
  it('renders markdown (including tables) and sends edit requests', async () => {
    const onChat = vi.fn(async () => true);
    render(
      <DocViewerDialog
        doc={prd}
        open
        onOpenChange={() => {}}
        busy={null}
        onChat={onChat}
        onRewriteSelection={vi.fn(async () => true)}
        onRegenerate={vi.fn()}
        onDownload={vi.fn()}
        onReplace={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: 'Goals' })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/What should change/i), { target: { value: 'Add KPIs' } });
    fireEvent.click(screen.getByRole('button', { name: /apply change/i }));
    expect(onChat).toHaveBeenCalledWith('Add KPIs');
  });
});
