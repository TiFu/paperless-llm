// API Response Types

// ========== Enums ==========

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

export enum WorkItemStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum DocumentActionType {
  UPDATE_TITLE = 'update_title',
}

// ========== Documents ==========

export interface Document {
  id: string;
  content: string;
  title: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  createdDate: string | null;
  modifiedDate: string | null;
}

// ========== Jobs ==========

export interface JobSubmission {
  documentId: string;
  jobTypes: WorkflowType[];
  requiresApproval?: boolean;
}

export interface BatchJobRequest {
  documents: JobSubmission[];
}

export interface CreatedJob {
  documentId: string;
  jobType: WorkflowType;
  jobId: string;
}

export interface BatchJobResponse {
  submitted: number;
  jobs: CreatedJob[];
}

export interface JobResponse {
  id: string;
  documentId: string;
  jobType: WorkflowType;
  status: JobState;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

// ========== Queue ==========

export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface QueueItem {
  id: string;
  jobId: string;
  documentId: string;
  stepType: StepType;
  jobType: WorkflowType;
  status: WorkItemStatus;
  retryCount: number;
  retryAfter: string | null;
  claimedBy: string | null;
  claimedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  jobState: JobState;
}

export interface QueueItemsResponse {
  items: QueueItem[];
  pagination: {
    limit: number;
    nextCursor?: string;
  };
}

// ========== Approvals ==========

export interface ProposedAction {
  actionType: DocumentActionType;
  oldValue: string;
  newValue: string;
}

export interface ApprovalItem {
  stepId: string;
  jobId: string;
  documentId: string;
  documentTitle: string;
  documentContent: string;
  jobType: WorkflowType;
  proposedActions: ProposedAction[];
  possibleDecisions: string[];
  createdAt: string;
}

export interface ApprovalsResponse {
  items: ApprovalItem[];
  nextCursor: string | null;
}

export interface ApprovalDecisionRequest {
  decision: string;
}

export interface ApprovalDecisionResponse {
  success: boolean;
  message: string;
}

// ========== Prompts ==========

export interface PromptResponse {
  stepType: StepType;
  template: string;
  version: number;
  updatedAt: string;
}

export interface PromptsResponse {
  prompts: PromptResponse[];
}

export interface UpsertPromptRequest {
  template: string;
}

// ========== System ==========

export interface SystemStatus {
  status: 'healthy' | 'degraded';
  timestamp: string;
  components: {
    database: {
      status: string;
    };
  };
}

export interface HealthResponse {
  status: string;
  timestamp: string;
}
