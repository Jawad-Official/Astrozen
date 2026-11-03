import { describe, expect, it } from 'vitest';
import type { Doc, DocumentMeta } from '@/services/ai.service';
import { getDocSlots, getDocumentType } from './docState';

const asset = (asset_type: string, content = '# Doc'): Doc => ({
  id: `asset-${asset_type}`,
  asset_type,
  content,
  status: 'COMPLETED',
});

const googleDoc = (title: string, r2_path = ''): DocumentMeta => ({
  id: `gdoc-${title}`,
  project_id: 'p1',
  drive_file_id: 'drive-1',
  r2_path,
  title,
  embed_url: 'https://docs.google.com/document/d/drive-1/edit',
  created_at: '',
  updated_at: '',
});

const byId = (slots: ReturnType<typeof getDocSlots>) => Object.fromEntries(slots.map((s) => [s.id, s]));

describe('getDocSlots', () => {
  it('locks everything but PRD when nothing is generated', () => {
    const slots = getDocSlots([], []);
    expect(slots.map((s) => [s.id, s.isGenerated, s.isLocked])).toEqual([
      ['PRD', false, false],
      ['APP_FLOW', false, true],
      ['TECH_STACK', false, true],
      ['FRONTEND_GUIDELINES', false, true],
      ['BACKEND_SCHEMA', false, true],
      ['IMPLEMENTATION_PLAN', false, true],
    ]);
  });

  it('marks PRD generated and unlocks App Flow from assets alone (no Google Drive)', () => {
    const slots = byId(getDocSlots([asset('PRD')], []));
    expect(slots.PRD.isGenerated).toBe(true);
    expect(slots.PRD.asset?.asset_type).toBe('PRD');
    expect(slots.PRD.googleDoc).toBeNull();
    expect(slots.APP_FLOW.isLocked).toBe(false);
    expect(slots.APP_FLOW.isGenerated).toBe(false);
    expect(slots.TECH_STACK.isLocked).toBe(true);
  });

  it('ignores empty assets and non-doc assets', () => {
    const slots = byId(getDocSlots([asset('PRD', '   '), asset('KANBAN', '[]')], []));
    expect(slots.PRD.isGenerated).toBe(false);
    expect(slots.APP_FLOW.isLocked).toBe(true);
  });

  it('attaches the Google Doc mirror when one exists', () => {
    const gdoc = googleDoc('My idea - Product Requirements', 'ideas/1/docs/PRD.md');
    const slots = byId(getDocSlots([asset('PRD')], [gdoc]));
    expect(slots.PRD.googleDoc?.id).toBe(gdoc.id);
    expect(slots.APP_FLOW.isLocked).toBe(false);
  });

  it('still counts a Google Doc as generated when assets are not loaded', () => {
    const slots = byId(getDocSlots([], [googleDoc('Product Requirements Generated')]));
    expect(slots.PRD.isGenerated).toBe(true);
    expect(slots.PRD.asset).toBeNull();
    expect(slots.APP_FLOW.isLocked).toBe(false);
  });

  it('keeps order: a later doc stays locked if the one before it is missing', () => {
    const slots = byId(getDocSlots([asset('PRD'), asset('TECH_STACK')], []));
    expect(slots.APP_FLOW.isLocked).toBe(false);
    expect(slots.TECH_STACK.isGenerated).toBe(true);
    expect(slots.TECH_STACK.isLocked).toBe(true);
  });
});

describe('getDocumentType', () => {
  it('matches by label or doc id in title / R2 key', () => {
    expect(getDocumentType({ title: 'Idea - App Flow', r2_path: '' })).toBe('APP_FLOW');
    expect(getDocumentType({ title: 'Untitled', r2_path: 'ideas/x/BACKEND_SCHEMA.md' })).toBe('BACKEND_SCHEMA');
    expect(getDocumentType({ title: 'Something else', r2_path: '' })).toBeUndefined();
  });
});
