import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/issues', () => ({
  issueService: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));
vi.mock('@/services/projects', () => ({
  projectService: { update: vi.fn() },
}));
vi.mock('@/services/features', () => ({
  featureService: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    createMilestone: vi.fn(),
    updateMilestone: vi.fn(),
    deleteMilestone: vi.fn(),
  },
}));
vi.mock('@/services/teams', () => ({
  teamService: {},
}));
vi.mock('@/services/users', () => ({
  userService: {},
}));

import { useIssueStore } from './issueStore';
import { issueService } from '@/services/issues';
import { featureService } from '@/services/features';
import { Feature } from '@/types/feature';

const issueSvc = vi.mocked(issueService, true);
const featureSvc = vi.mocked(featureService, true);

const baseFeature = (overrides: Partial<Feature> = {}): Feature => ({
  id: 'f1',
  identifier: 'ABC-F1',
  projectId: 'p1',
  name: 'A feature',
  type: 'new_capability',
  status: 'discovery',
  priority: 'none',
  milestones: [],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  ...overrides,
} as Feature);

beforeEach(() => {
  useIssueStore.setState({ issues: [], features: [] });
  vi.clearAllMocks();
});

describe('addIssue / updateIssue / deleteIssue', () => {
  it('prepends the newly created issue', async () => {
    issueSvc.create.mockResolvedValue({ id: 'i1', title: 'New issue' } as any);

    await useIssueStore.getState().addIssue({ title: 'New issue' } as any);

    expect(useIssueStore.getState().issues.map(i => i.id)).toEqual(['i1']);
  });

  it('replaces only the updated issue', async () => {
    useIssueStore.setState({ issues: [{ id: 'i1', title: 'Old' } as any, { id: 'i2', title: 'Other' } as any] });
    issueSvc.update.mockResolvedValue({ id: 'i1', title: 'New title' } as any);

    await useIssueStore.getState().updateIssue('i1', { title: 'New title' } as any);

    const state = useIssueStore.getState();
    expect(state.issues.find(i => i.id === 'i1')?.title).toBe('New title');
    expect(state.issues.find(i => i.id === 'i2')?.title).toBe('Other');
  });

  it('removes the deleted issue', async () => {
    useIssueStore.setState({ issues: [{ id: 'i1' } as any, { id: 'i2' } as any] });
    issueSvc.delete.mockResolvedValue(undefined as any);

    await useIssueStore.getState().deleteIssue('i1');

    expect(useIssueStore.getState().issues.map(i => i.id)).toEqual(['i2']);
  });

  it('re-throws on failure so callers can react (e.g. show a toast)', async () => {
    issueSvc.create.mockRejectedValue(new Error('validation failed'));

    await expect(
      useIssueStore.getState().addIssue({ title: 'Bad issue' } as any)
    ).rejects.toThrow('validation failed');
  });
});

describe('feature milestone actions map the raw (snake_case) API response', () => {
  // Regression test for a Phase 4 audit finding: addFeatureMilestone and
  // toggleFeatureMilestone used to push the raw API response straight into
  // state without mapping it through mapFeatureMilestone, so
  // target_date/feature_id never became targetDate/featureId and the UI
  // silently showed stale/undefined fields until the next full refetch.

  it('addFeatureMilestone maps the created milestone into camelCase', async () => {
    useIssueStore.setState({ features: [baseFeature()] });
    featureSvc.createMilestone.mockResolvedValue({
      id: 'm1', feature_id: 'f1', name: 'Beta launch', target_date: '2026-01-01', completed: false,
    } as any);

    await useIssueStore.getState().addFeatureMilestone('f1', { name: 'Beta launch' });

    const feature = useIssueStore.getState().features.find(f => f.id === 'f1');
    expect(feature?.milestones).toHaveLength(1);
    expect(feature?.milestones?.[0]).toMatchObject({
      id: 'm1', featureId: 'f1', name: 'Beta launch', targetDate: '2026-01-01',
    });
    // The raw snake_case keys must not leak into store state.
    expect((feature?.milestones?.[0] as any).feature_id).toBeUndefined();
    expect((feature?.milestones?.[0] as any).target_date).toBeUndefined();
  });

  it('toggleFeatureMilestone maps the updated milestone into camelCase', async () => {
    useIssueStore.setState({
      features: [baseFeature({
        milestones: [{ id: 'm1', featureId: 'f1', name: 'Beta launch', completed: false } as any],
      })],
    });
    featureSvc.updateMilestone.mockResolvedValue({
      id: 'm1', feature_id: 'f1', name: 'Beta launch', target_date: '2026-01-01', completed: true,
    } as any);

    await useIssueStore.getState().toggleFeatureMilestone('f1', 'm1');

    expect(featureSvc.updateMilestone).toHaveBeenCalledWith('f1', 'm1', { completed: true });
    const feature = useIssueStore.getState().features.find(f => f.id === 'f1');
    expect(feature?.milestones?.[0]).toMatchObject({ id: 'm1', featureId: 'f1', completed: true, targetDate: '2026-01-01' });
  });

  it('updateFeatureMilestone maps the updated milestone into camelCase', async () => {
    useIssueStore.setState({
      features: [baseFeature({
        milestones: [{ id: 'm1', featureId: 'f1', name: 'Old name', completed: false } as any],
      })],
    });
    featureSvc.updateMilestone.mockResolvedValue({
      id: 'm1', feature_id: 'f1', name: 'New name', completed: false,
    } as any);

    await useIssueStore.getState().updateFeatureMilestone('f1', 'm1', { name: 'New name' });

    const feature = useIssueStore.getState().features.find(f => f.id === 'f1');
    expect(feature?.milestones?.[0]).toMatchObject({ id: 'm1', featureId: 'f1', name: 'New name' });
  });

  it('deleteFeatureMilestone removes only the target milestone', async () => {
    useIssueStore.setState({
      features: [baseFeature({
        milestones: [
          { id: 'm1', featureId: 'f1', name: 'Keep', completed: false } as any,
          { id: 'm2', featureId: 'f1', name: 'Remove', completed: false } as any,
        ],
      })],
    });
    featureSvc.deleteMilestone.mockResolvedValue(undefined as any);

    await useIssueStore.getState().deleteFeatureMilestone('f1', 'm2');

    const feature = useIssueStore.getState().features.find(f => f.id === 'f1');
    expect(feature?.milestones?.map(m => m.id)).toEqual(['m1']);
  });
});

describe('addFeature / updateFeature / deleteFeature', () => {
  it('addFeature maps and appends the created feature', async () => {
    featureSvc.create.mockResolvedValue({
      id: 'f1', identifier: 'ABC-F1', project_id: 'p1', name: 'New feature',
      created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
    } as any);

    await useIssueStore.getState().addFeature({ name: 'New feature', projectId: 'p1' } as any);

    const state = useIssueStore.getState();
    expect(state.features).toHaveLength(1);
    expect(state.features[0].projectId).toBe('p1');
  });

  it('deleteFeature removes the feature by id', async () => {
    useIssueStore.setState({ features: [baseFeature({ id: 'f1' }), baseFeature({ id: 'f2' })] });
    featureSvc.delete.mockResolvedValue(undefined as any);

    await useIssueStore.getState().deleteFeature('f1');

    expect(useIssueStore.getState().features.map(f => f.id)).toEqual(['f2']);
  });
});
