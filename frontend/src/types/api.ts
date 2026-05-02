// API Response Types

export interface Document {
  id: string;
  title: string;
  content: string;
}

export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface LLMQueueItem {
  id: string;
  documentId: string;
  jobType: string;
  status: WorkItemStatus;
  retryCount: number;
  retryAfter: string | null;
  claimedBy: string | null;
  claimedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentUpdateQueueItem {
  id: string;
  documentId: string;
  documentSystem: string;
  actionType: string;
  actionPayload: Record<string, unknown>;
  status: WorkItemStatus;
  retryCount: number;
  retryAfter: string | null;
  claimedBy: string | null;
  claimedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEntry {
  id: string;
  documentId: string;
  documentSystem: string;
  action: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export interface JobSubmission {
  documents: Array<{
    documentId: string;
    jobTypes: string[];
  }>;
}

export enum WorkItemStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface PaginationCursor {
  limit: number;
  nextCursor: string | null;
}

export interface PaginationOffset {
  limit: number;
  offset: number;
  total: number;
}

export interface QueueItemsResponse<T> {
  items: T[];
  pagination: PaginationCursor;
}

export interface AuditLogResponse {
  entries: AuditEntry[];
  pagination: PaginationOffset;
}
