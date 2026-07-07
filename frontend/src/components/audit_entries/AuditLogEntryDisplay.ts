import { ReactNode } from 'react';

export type AuditLogColor = 'success' | 'error' | 'warning' | 'info' | 'grey'

export interface AuditLogEntryDisplay {
  getLabel(): string;
  getColor(): AuditLogColor;
  getIcon(): ReactNode;
  getFields(): Array<{ label: string; value: unknown }>;
  alwaysDisplayFields?: string[];
  /** Fields rendered behind a "Show Prompt" button/dialog instead of inline text. */
  popupFields?: string[];
}
