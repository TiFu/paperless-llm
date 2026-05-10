import axios, { AxiosInstance } from 'axios';
import {
  Document,
  QueueStats,
  QueueItem,
  QueueItemsResponse,
  WorkItemStatus,
  BatchJobRequest,
  BatchJobResponse,
  JobResponse,
  WorkflowType,
  StepType,
  ApprovalsResponse,
  ApprovalDecisionRequest,
  ApprovalDecisionResponse,
  PromptsResponse,
  UpsertPromptRequest,
  PromptResponse,
  SystemStatus,
  HealthResponse,
} from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          // Server responded with error status
          const message = error.response.data?.detail || error.response.data?.title || error.message;
          throw new Error(message);
        } else if (error.request) {
          // Request made but no response
          throw new Error('No response from server. Please check if the API is running.');
        } else {
          // Error setting up request
          throw new Error(error.message);
        }
      }
    );
  }

  // ========== Documents ==========
  
  async fetchDocumentsByTag(tag: string): Promise<Document[]> {
    const response = await this.client.get<{ documents: Document[] }>('/api/documents', {
      params: { tag },
    });
    return response.data.documents;
  }

  // ========== Jobs ==========

  async fetchJobTypes(): Promise<WorkflowType[]> {
    const response = await this.client.get<{ jobTypes: WorkflowType[] }>('/api/jobs/types');
    return response.data.jobTypes;
  }

  async submitJobs(request: BatchJobRequest): Promise<BatchJobResponse> {
    const response = await this.client.post<BatchJobResponse>('/api/jobs', request);
    return response.data;
  }

  async fetchJobById(jobId: string): Promise<JobResponse> {
    const response = await this.client.get<{ job: JobResponse }>(`/api/jobs/${jobId}`);
    return response.data.job;
  }

  // ========== Queue (Unified) ==========

  async fetchQueueStats(): Promise<QueueStats> {
    const response = await this.client.get<QueueStats>('/api/queue/stats');
    return response.data;
  }

  async fetchQueueItems(
    limit: number = 50,
    cursor?: string,
    status?: WorkItemStatus
  ): Promise<QueueItemsResponse> {
    const response = await this.client.get<QueueItemsResponse>('/api/queue/items', {
      params: { limit, cursor, status },
    });
    return response.data;
  }

  // ========== Approvals ==========

  async fetchPendingApprovals(limit: number = 50, cursor?: string): Promise<ApprovalsResponse> {
    const response = await this.client.get<ApprovalsResponse>('/api/approvals', {
      params: { limit, cursor },
    });
    return response.data;
  }

  async processApprovalDecision(
    stepId: string,
    request: ApprovalDecisionRequest
  ): Promise<ApprovalDecisionResponse> {
    const response = await this.client.post<ApprovalDecisionResponse>(
      `/api/approvals/${stepId}`,
      request
    );
    return response.data;
  }

  // ========== Prompts ==========

  async fetchPrompts(): Promise<PromptsResponse> {
    const response = await this.client.get<PromptsResponse>('/api/prompts');
    return response.data;
  }

  async upsertPrompt(stepType: StepType, request: UpsertPromptRequest): Promise<PromptResponse> {
    const response = await this.client.put<PromptResponse>(`/api/prompts/${stepType}`, request);
    return response.data;
  }

  // ========== System & Health ==========

  async fetchSystemStatus(): Promise<SystemStatus> {
    const response = await this.client.get<SystemStatus>('/api/system/status');
    return response.data;
  }

  async checkHealth(): Promise<HealthResponse> {
    const response = await this.client.get<HealthResponse>('/health');
    return response.data;
  }
}

export const apiClient = new ApiClient();
