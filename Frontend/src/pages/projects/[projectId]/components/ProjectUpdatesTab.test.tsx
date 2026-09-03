import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectUpdatesTab } from './ProjectUpdatesTab';
import { Project } from '@/types/issue';

// Smoke test for one of the presentational components extracted from
// pages/projects/[projectId]/page.tsx during Phase 5c - confirms it
// renders with a realistic prop set instead of throwing (missing prop,
// bad import, wrong prop name after the mechanical extraction).

const baseProject: Project = {
  id: 'p1',
  name: 'Test Project',
  icon: '🚀',
  color: '#000',
  status: 'in_progress',
  health: 'on_track',
  priority: 'high',
  members: [],
  teams: [],
  milestones: [],
  updates: [],
  resources: [],
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
} as Project;

const noop = async () => {};

describe('ProjectUpdatesTab', () => {
  it('renders the update composer and an empty timeline without crashing', () => {
    render(
      <ProjectUpdatesTab
        project={baseProject}
        selectedHealth="on_track"
        setSelectedHealth={vi.fn()}
        updateContent=""
        setUpdateContent={vi.fn()}
        handleAddUpdate={noop}
        sortedUpdates={[]}
        user={null}
        currentUser="user-1"
        handleDeleteUpdate={noop}
        handleUpdateUpdate={noop}
        handleAddUpdateComment={noop}
        handleDeleteUpdateComment={noop}
        toggleUpdateReaction={noop}
        toggleUpdateCommentReaction={noop}
      />
    );

    expect(screen.getByPlaceholderText('Write a project update...')).toBeInTheDocument();
  });

  it('renders a posted update from sortedUpdates', () => {
    render(
      <ProjectUpdatesTab
        project={baseProject}
        selectedHealth="on_track"
        setSelectedHealth={vi.fn()}
        updateContent=""
        setUpdateContent={vi.fn()}
        handleAddUpdate={noop}
        sortedUpdates={[{
          id: 'u1', projectId: 'p1', content: 'Shipped the new dashboard', author: 'user-1',
          createdAt: new Date('2025-01-01T00:00:00Z'), comments: [], reactions: [],
        } as any]}
        user={null}
        currentUser="user-1"
        handleDeleteUpdate={noop}
        handleUpdateUpdate={noop}
        handleAddUpdateComment={noop}
        handleDeleteUpdateComment={noop}
        toggleUpdateReaction={noop}
        toggleUpdateCommentReaction={noop}
      />
    );

    expect(screen.getByText('Shipped the new dashboard')).toBeInTheDocument();
  });
});
