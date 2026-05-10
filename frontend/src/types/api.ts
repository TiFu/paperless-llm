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

// Unified queue item for all automated steps
export interface QueueItem {
  id: string;
  jobId: string;
  documentId: string;
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

export interface JobSubmissionResponse {
  submitted: number;
  jobs: Array<{
    documentId: string;
    jobType: string;
    jobId: string;
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
  documentId: string;
  jobType: WorkflowType;
  status: JobState;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  documentActions: DocumentAction[];
}

export interface JobStep {
  stepId: string;
  stepType: StepType;
  stepStatus: StepStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface JobListResponse {
  jobs: JobResponse[];
  nextCursor: string | null;
}

export interface JobStepsResponse {
  steps: JobStep[];
}

export interface JobStepStats {
  totalSteps: number;
  waitingSteps: number;
  inProgressSteps: number;
  completedSteps: number;
  failedSteps: number;
}

// Approval Types

export interface ApprovalStats {
  pendingCount: number;
}

export interface ApprovalItem {
  stepId: string;
  jobId: string;
  documentId: string;
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

