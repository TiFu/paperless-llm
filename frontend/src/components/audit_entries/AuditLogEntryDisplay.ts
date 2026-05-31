import { ReactNode } from 'react';
import { AuditLogEntry } from '../../services/api/generated/models/AuditLogEntry';

export type AuditLogColor = 'success' | 'error' | 'warning' | 'info' | 'grey'

export interface AuditLogEntryDisplay {
  getLabel(): string;
  getColor(): AuditLogColor;
  getIcon(): ReactNode;
  getFields(): Array<{ label: string; value: any }>;
  alwaysDisplayFields?: string[];
}
