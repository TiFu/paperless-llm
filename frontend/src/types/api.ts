// API Response Types

export interface Document {
  id: number;
  title: string;
  content: string;
  tags?: string[];
  createdDate?: string;
  modifiedDate?: string;
}

export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  inFallout: number;
}

// Unified queue item for all automated steps
export interface QueueItem {
  id: string;
  jobId: string;
  documentId: number;
  stepType: string;
  jobType: string;
  status: WorkItemStatus;
  retryCount: number;
  retryAfter: string | null;
  claimedBy: string | null;
  claimedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  jobState: string;
}

export interface AuditEntry {
  id: string;
  documentId: number;
  documentSystem: string;
  action: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export interface JobSubmission {
  documents: Array<{
    documentId: number;
    jobType: string;
    fields: string[];
  }>;
}

export interface JobSubmissionResponse {
  submitted: number;
  jobs: Array<{
    documentId: number;
    jobType: string;
    id: string;
  }>;
}

export enum WorkItemStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
  IN_FALLOUT = 'in_fallout',
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

export interface DocumentsResponse {
  documents: Document[];
  pagination: PaginationCursor;
}

export interface AuditLogResponse {
  entries: AuditEntry[];
  pagination: PaginationOffset;
}

// Job and Step Types

export enum WorkflowType {
  APPROVAL = 'approval',
  AUTOMATED = 'automated',
}

export enum JobState {
  PENDING = 'pending',
  LLM_PROCESSING = 'llm_processing',
  PENDING_APPROVAL = 'pending_approval',
  UPDATING_DOCUMENT = 'updating_document',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REJECTED = 'rejected',
}

export enum StepType {
  LLM_GENERATE_TITLE = 'LLM_GENERATE_TITLE',
  REQUIRE_APPROVAL = 'REQUIRE_APPROVAL',
  UPDATE_DOCUMENT = 'UPDATE_DOCUMENT',
}

export enum StepStatus {
  WAITING = 'waiting',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
  IN_FALLOUT = 'in_fallout',
}

export interface DocumentAction {
  id: string;
  actionType: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

export interface JobResponse {
  id: string;
  documentId: number;
  jobType: WorkflowType;
  status: JobState;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  documentActions: DocumentAction[];
  document?: {
    id: number;
    title: string | null;
    correspondent: string | null;
    tags: string[],
    documentType: string
    content: string
  } | null;
}

export interface JobStep {
  stepId: string;
  stepType: StepType;
  stepStatus: StepStatus;
  children: JobStep[] | null;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  retryCount: number;
  retryAfter: string | null;
}

export interface JobListResponse {
  jobs: JobResponse[];
  nextCursor: string | null;
}

export interface JobStepsResponse {
  steps: JobStep[];
}

export enum AuditEventType {
  JOB_CREATED = 'JOB_CREATED',
  STEP_CREATED = 'STEP_CREATED',
  STEP_COMPLETED = 'STEP_COMPLETED',
  STEP_FAILED = 'STEP_FAILED',
  STEP_EXECUTED = 'STEP_EXECUTED',
  STEP_MOVED_TO_RETRYING = 'STEP_MOVED_TO_RETRYING',
  STEP_MOVED_TO_FALLOUT = 'STEP_MOVED_TO_FALLOUT',
  APPROVAL_REQUESTED = 'APPROVAL_REQUESTED',
  APPROVAL_APPROVED = 'APPROVAL_APPROVED',
  APPROVAL_REJECTED = 'APPROVAL_REJECTED',
  STEP_MANUALLY_RETRIED = 'STEP_MANUALLY_RETRIED',
  STEP_CANCELLED = 'STEP_CANCELLED',
  STUCK_STEP_RESET = 'STUCK_STEP_RESET',
}

export interface AuditLogEntry {
  id: string;
  jobId: string;
  stepId: string | null;
  eventType: AuditEventType;
  eventTimestamp: string;
  processingStartTime: string | null;
  processingEndTime: string | null;
  processingDurationMs: number | null;
  metadata: Record<string, unknown> | null;
}

export interface JobAuditLogResponse {
  auditLog: AuditLogEntry[];
}

export interface JobStats {
  pending: number;
  llmProcessing: number;
  pendingApproval: number;
  updatingDocument: number;
  completed: number;
  failed: number;
  rejected: number;
}

// Approval Types

export interface ApprovalStats {
  pendingCount: number;
}

// Dashboard Stats (Unified)

export interface DashboardStats {
  queue: QueueStats;
  approvals: ApprovalStats;
  jobs: JobStats;
}

export interface ApprovalItem {
  stepId: string;
  jobId: string;
  documentId: number;
  paperlessUrl: string;
  jobType: string;
  proposedActions: Array<{
    actionType: string;
    oldValue: string;
    newValue: string;
  }>;
  possibleDecisions: string[];
  createdAt: string;
}

export interface ApprovalsResponse {
  items: ApprovalItem[];
  nextCursor: string | null;
}

// Prompt Types

export interface PromptResponse {
  stepType: StepType;
  template: string;
  version: number;
  updatedAt: string;
}

export interface PromptsListResponse {
  prompts: PromptResponse[];
}

// System Health Types

export type ServiceStatus = 'healthy' | 'unhealthy';
export type SystemStatus = 'healthy' | 'degraded';

export interface ComponentHealth {
  status: ServiceStatus;
}

export interface SystemHealthResponse {
  status: SystemStatus;
  timestamp: string;
  components: {
    database: ComponentHealth;
    paperless: ComponentHealth;
    llm: ComponentHealth;
  };
}

