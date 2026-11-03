import type { Doc, DocumentMeta } from '@/services/ai.service';

export const TECHNICAL_DOCS = [
  { id: 'PRD', label: 'Product Requirements', description: 'Scope, goals, users, and acceptance criteria.' },
  { id: 'APP_FLOW', label: 'App Flow', description: 'Screens, routes, and primary user journeys.' },
  { id: 'TECH_STACK', label: 'Tech Stack', description: 'Frameworks, services, libraries, and constraints.' },
  { id: 'FRONTEND_GUIDELINES', label: 'Frontend Guidelines', description: 'UI patterns, states, accessibility, and behavior.' },
  { id: 'BACKEND_SCHEMA', label: 'Backend Schema', description: 'Data models, APIs, integrations, and storage.' },
  { id: 'IMPLEMENTATION_PLAN', label: 'Implementation Plan', description: 'Milestones, dependencies, and execution order.' },
] as const;

export const TECHNICAL_DOC_IDS: readonly string[] = TECHNICAL_DOCS.map((d) => d.id);

const normalizeDocText = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');

/**
 * Work out which technical doc a Google Doc mirror (`Document` row) belongs
 * to. The row has no doc_type column, so match on its title / R2 key.
 */
export const getDocumentType = (document: Pick<DocumentMeta, 'title' | 'r2_path'>) => {
  const haystack = normalizeDocText(`${document.title ?? ''} ${document.r2_path ?? ''}`);
  return TECHNICAL_DOCS.find((doc) => {
    const id = normalizeDocText(doc.id);
    const label = normalizeDocText(doc.label);
    return haystack.includes(id) || haystack.includes(label);
  })?.id;
};

/** True when the idea has a stored, non-empty asset for this doc type. */
export const hasDocAsset = (docs: Doc[], docType: string) =>
  docs.some((d) => d.asset_type === docType && !!d.content?.trim());

export interface DocSlotState {
  id: string;
  label: string;
  description: string;
  /** The generated / uploaded doc, stored as a ProjectAsset. Source of truth. */
  asset: Doc | null;
  /** Optional Google Docs mirror. Only exists when Drive is configured. */
  googleDoc: DocumentMeta | null;
  isGenerated: boolean;
  isLocked: boolean;
}

/**
 * Generated/locked state for each technical doc, in order.
 *
 * A doc counts as generated when its ProjectAsset exists, whether or not the
 * backend also copied it to Google Docs. A Google Doc on its own (no asset in
 * the list, e.g. assets not loaded yet) still counts, so a configured Drive
 * never shows less than before. Each doc unlocks once the previous one is
 * generated.
 */
export const getDocSlots = (docs: Doc[], documents: DocumentMeta[]): DocSlotState[] => {
  const slots: DocSlotState[] = [];
  TECHNICAL_DOCS.forEach((doc, i) => {
    const asset = docs.find((d) => d.asset_type === doc.id && !!d.content?.trim()) ?? null;
    const googleDoc = documents.find((d) => getDocumentType(d) === doc.id) ?? null;
    const isGenerated = !!asset || !!googleDoc;
    const isLocked = i > 0 && !slots[i - 1].isGenerated;
    slots.push({ ...doc, asset, googleDoc, isGenerated, isLocked });
  });
  return slots;
};
