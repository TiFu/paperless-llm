import axios, { AxiosInstance } from 'axios';
import {
  Document,
  DocumentsResponse,
  QueueStats,
  QueueItem,
  JobSubmission,
  JobSubmissionResponse,
  WorkItemStatus,
  QueueItemsResponse,
  AuditLogResponse,
  JobState,
  JobResponse,
  JobListResponse,
  JobStepsResponse,
  ApprovalsResponse,
  PromptsListResponse,
  PromptResponse,
  SystemHealthResponse,
  ApprovalStats,
  JobStats,
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

  // Documents
  async fetchDocumentsByTag(
    tag: string,
    limit?: number,
    cursor?: string
  ): Promise<DocumentsResponse> {
    const params: Record<string, string> = { tag };
    if (limit !== undefined) {
      params.limit = limit.toString();
    }
    if (cursor) {
      params.cursor = cursor;
    }
    
    const response = await this.client.get<DocumentsResponse>('/api/documents', { params });
    return response.data;
  }

  // Jobs
  async submitJobs(submission: JobSubmission): Promise<JobSubmissionResponse> {
    const response = await this.client.post<JobSubmissionResponse>('/api/jobs', submission);
    return response.data;
  }

  async fetchJobTypes(): Promise<string[]> {
    const response = await this.client.get<{ jobTypes: string[] }>('/api/jobs/types');
    return response.data.jobTypes;
  }

  async fetchJobs(
    limit: number = 20,
    cursor?: string,
    state?: JobState
  ): Promise<JobListResponse> {
    const response = await this.client.get<JobListResponse>('/api/jobs', {
      params: { limit, cursor, state },
    });
    return response.data;
  }

  async fetchJobById(id: string): Promise<JobResponse> {
    const response = await this.client.get<{ job: JobResponse }>(`/api/jobs/${id}`);
    return response.data.job;
  }

  async fetchJobSteps(jobId: string): Promise<JobStepsResponse> {
    const response = await this.client.get<JobStepsResponse>(`/api/jobs/${jobId}/steps`);
    return response.data;
  }

  async fetchJobStats(): Promise<JobStats> {
    const response = await this.client.get<JobStats>('/api/jobs/stats');
    return response.data;
  }

  // Queue - Unified API for all automated steps
  async fetchQueueStats(): Promise<QueueStats> {
    const response = await this.client.get<QueueStats>('/api/queue/stats');
    return response.data;
  }

  async fetchQueueItems(
    limit: number = 50,
    cursor?: string,
    status?: WorkItemStatus
  ): Promise<QueueItemsResponse<QueueItem>> {
    const response = await this.client.get<QueueItemsResponse<QueueItem>>(
      '/api/queue/items',
      {
        params: { limit, cursor, status },
      }
    );
    return response.data;
  }

  // Audit Log
  async fetchAuditLog(
    documentId?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<AuditLogResponse> {
    const response = await this.client.get<AuditLogResponse>('/api/audit', {
      params: { documentId, limit, offset },
    });
    return response.data;
  }

  // Approvals
  async fetchPendingApprovals(
    limit: number = 50,
    cursor?: string
  ): Promise<ApprovalsResponse> {
    const response = await this.client.get<ApprovalsResponse>('/api/approvals', {
      params: { limit, cursor },
    });
    return response.data;
  }

  async fetchApprovalStats(): Promise<ApprovalStats> {
    const response = await this.client.get<ApprovalStats>('/api/approvals/stats');
    return response.data;
  }

  async processApprovalDecision(
    stepId: string,
    decision: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await this.client.post<{ success: boolean; message: string }>(
      `/api/approvals/${stepId}`,
      { decision }
    );
    return response.data;
  }

  // Prompts
  async fetchPrompts(): Promise<PromptsListResponse> {
    const response = await this.client.get<PromptsListResponse>('/api/prompts');
    return response.data;
  }

  async updatePrompt(
    stepType: string,
    template: string
  ): Promise<PromptResponse> {
    const response = await this.client.put<PromptResponse>(
      `/api/prompts/${stepType}`,
      { template }
    );
    return response.data;
  }

  // Health
  async checkHealth(): Promise<{ status: string }> {
    const response = await this.client.get<{ status: string }>('/health');
    return response.data;
  }

  async fetchSystemStatus(): Promise<SystemHealthResponse> {
    const response = await this.client.get<SystemHealthResponse>('/api/system/status');
    return response.data;
  }

  // Steps
  async retryStep(stepId: string): Promise<{ success: boolean; message: string }> {
    const response = await this.client.post<{ success: boolean; message: string }>(
      `/api/steps/${stepId}/retry`
    );
    return response.data;
  }

  async cancelStep(stepId: string): Promise<{ success: boolean; message: string }> {
    const response = await this.client.post<{ success: boolean; message: string }>(
      `/api/steps/${stepId}/cancel`
    );
    return response.data;
  }
}

export const apiClient = new ApiClient();
