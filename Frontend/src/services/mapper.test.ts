import { describe, it, expect } from 'vitest';
import {
  mapIssue,
  mapFeature,
  mapFeatureMilestone,
  mapProject,
  mapProjectUpdate,
  mapComment,
  mapActivity,
  mapMilestone,
  mapUser,
  RawIssue,
  RawFeature,
  RawProject,
  RawProjectUpdate,
  RawIssueComment,
  RawActivity,
  RawMilestone,
  RawUser,
  RawFeatureMilestone,
} from './mapper';

describe('mapIssue', () => {
  it('lowercases enum-like fields and maps snake_case to camelCase', () => {
    const raw: RawIssue = {
      id: '1', identifier: 'ABC-1', title: 'Fix bug',
      issue_type: 'BUG', status: 'IN_PROGRESS', priority: 'HIGH',
      team_id: 'team-1', feature_id: 'feat-1', milestone_id: 'mile-1',
      assignee_id: 'user-1', parent_id: 'parent-1',
      assignee: { first_name: 'Ada', last_name: 'Lovelace' },
      triage_status: 'TRIAGED',
      due_date: '2026-01-01T00:00:00Z',
      created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-02T00:00:00Z',
    };

    const mapped = mapIssue(raw);

    expect(mapped.issueType).toBe('bug');
    expect(mapped.status).toBe('in_progress');
    expect(mapped.priority).toBe('high');
    expect(mapped.teamId).toBe('team-1');
    expect(mapped.featureId).toBe('feat-1');
    expect(mapped.assignee).toBe('user-1');
    expect(mapped.assigneeName).toBe('Ada Lovelace');
    expect(mapped.dueDate).toEqual(new Date('2026-01-01T00:00:00Z'));
  });

  it('handles missing optional fields without throwing', () => {
    const raw: RawIssue = {
      id: '1', identifier: 'ABC-1', title: 'No assignee',
      team_id: 'team-1', feature_id: 'feat-1',
      created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-02T00:00:00Z',
    };

    const mapped = mapIssue(raw);

    expect(mapped.assignee).toBeUndefined();
    expect(mapped.assigneeName).toBeUndefined();
    expect(mapped.dueDate).toBeUndefined();
  });
});

describe('mapFeature', () => {
  it('maps fields and only keeps top-level (non-sub) milestones', () => {
    const milestones: RawFeatureMilestone[] = [
      { id: 'm1', feature_id: 'f1', name: 'Top level', completed: false },
      { id: 'm2', feature_id: 'f1', parent_id: 'm1', name: 'Sub milestone', completed: false },
    ];
    const raw: RawFeature = {
      id: 'f1', identifier: 'ABC-F1', project_id: 'p1', name: 'A feature',
      status: 'IN_PROGRESS', priority: 'HIGH', health: 'AT_RISK',
      milestones,
      created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-02T00:00:00Z',
    };

    const mapped = mapFeature(raw);

    expect(mapped.status).toBe('in_progress');
    expect(mapped.priority).toBe('high');
    expect(mapped.health).toBe('at_risk');
    expect(mapped.milestones).toHaveLength(1);
    expect(mapped.milestones?.[0].id).toBe('m1');
  });
});

describe('mapFeatureMilestone', () => {
  it('maps a raw milestone 1:1 into camelCase', () => {
    const raw: RawFeatureMilestone = {
      id: 'm1', feature_id: 'f1', parent_id: 'f0', name: 'Milestone', description: 'desc',
      target_date: '2026-01-01', completed: true,
    };

    expect(mapFeatureMilestone(raw)).toEqual({
      id: 'm1', featureId: 'f1', parentId: 'f0', name: 'Milestone', description: 'desc',
      targetDate: '2026-01-01', completed: true,
    });
  });
});

describe('mapProject', () => {
  it('normalizes members/teams whether given as plain ids or objects', () => {
    const raw: RawProject = {
      id: 'p1', name: 'Project', icon: '🚀', color: '#fff',
      status: 'IN_PROGRESS', health: 'ON_TRACK', priority: 'HIGH',
      lead_id: 'u1', lead: { first_name: 'Grace', last_name: 'Hopper' },
      members: ['u1', { id: 'u2' }, { user_id: 'u3' }],
      teams: ['t1', { id: 't2' }],
      created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-02T00:00:00Z',
    };

    const mapped = mapProject(raw);

    expect(mapped.members).toEqual(['u1', 'u2', 'u3']);
    expect(mapped.teams).toEqual(['t1', 't2']);
    expect(mapped.leadName).toBe('Grace Hopper');
    expect(mapped.status).toBe('in_progress');
  });

  it('drops member/team entries with no usable id', () => {
    const raw: RawProject = {
      id: 'p1', name: 'Project', icon: '🚀', color: '#fff',
      members: [{}],
      created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-02T00:00:00Z',
    };

    expect(mapProject(raw).members).toEqual([]);
  });
});

describe('mapProjectUpdate', () => {
  it('groups reactions by emoji and maps nested comments', () => {
    const raw: RawProjectUpdate = {
      id: 'u1', project_id: 'p1', content: 'An update', author_id: 'a1',
      author: { first_name: 'Ada', last_name: 'Lovelace' },
      created_at: '2025-01-01T00:00:00Z',
      comments: [
        { id: 'c1', content: 'nice', author_id: 'a2', created_at: '2025-01-01T00:00:00Z' },
      ],
      reactions: [
        { emoji: '👍', user_id: 'a1' },
        { emoji: '👍', user_id: 'a2' },
        { emoji: '🎉', user_id: 'a1' },
      ],
    };

    const mapped = mapProjectUpdate(raw);

    expect(mapped.authorName).toBe('Ada Lovelace');
    expect(mapped.comments).toHaveLength(1);
    expect(mapped.reactions).toEqual([
      { emoji: '👍', users: ['a1', 'a2'] },
      { emoji: '🎉', users: ['a1'] },
    ]);
  });
});

describe('mapComment / mapActivity / mapMilestone / mapUser', () => {
  it('mapComment maps author name when present', () => {
    const raw: RawIssueComment = {
      id: 'c1', issue_id: 'i1', content: 'hi', author_id: 'a1',
      author: { first_name: 'Ada', last_name: 'Lovelace' },
      created_at: '2025-01-01T00:00:00Z',
    };
    expect(mapComment(raw).authorName).toBe('Ada Lovelace');
  });

  it('mapActivity maps old/new values through', () => {
    const raw: RawActivity = {
      id: 'ac1', issue_id: 'i1', type: 'status_change', actor_id: 'a1',
      old_value: 'todo', new_value: 'done', created_at: '2025-01-01T00:00:00Z',
    };
    const mapped = mapActivity(raw);
    expect(mapped.oldValue).toBe('todo');
    expect(mapped.newValue).toBe('done');
  });

  it('mapMilestone converts target_date to a Date only when present', () => {
    const withDate: RawMilestone = { id: 'm1', name: 'M', completed: false, target_date: '2026-01-01' };
    const withoutDate: RawMilestone = { id: 'm2', name: 'M2', completed: false };
    expect(mapMilestone(withDate).targetDate).toEqual(new Date('2026-01-01'));
    expect(mapMilestone(withoutDate).targetDate).toBeUndefined();
  });

  it('mapUser builds fullName from first/last name', () => {
    const raw: RawUser = {
      id: 'u1', email: 'ada@example.com', first_name: 'Ada', last_name: 'Lovelace',
      is_active: true, role: 'member', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
    };
    expect(mapUser(raw).fullName).toBe('Ada Lovelace');
  });
});
