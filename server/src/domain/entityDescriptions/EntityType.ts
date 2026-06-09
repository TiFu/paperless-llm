export const ENTITY_TYPES = [
  { type: 'tag',           label: 'Tags' },
  { type: 'correspondent', label: 'Correspondents' },
  { type: 'document_type', label: 'Document Types' },
] as const;

export type EntityType = typeof ENTITY_TYPES[number]['type'];
