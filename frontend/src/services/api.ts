import axios, { AxiosInstance } from 'axios';
import {
  Document,
  QueueStats,
  LLMQueueItem,
  DocumentUpdateQueueItem,
  AuditEntry,
  JobSubmission,
  WorkItemStatus,
  QueueItemsResponse,
  AuditLogResponse,
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
  async fetchDocumentsByTag(tag: string): Promise<Document[]> {
    const response = await this.client.get<{ documents: Document[] }>('/api/documents', {
      params: { tag },
    });
    return response.data.documents;
  }

  // Jobs
  async submitJobs(submission: JobSubmission): Promise<void> {
    await this.client.post('/api/jobs', submission);
  }

  async fetchJobTypes(): Promise<string[]> {
    const response = await this.client.get<{ jobTypes: string[] }>('/api/jobs/types');
    return response.data.jobTypes;
  }

  // Queue - LLM
  async fetchLLMQueueStats(): Promise<QueueStats> {
    const response = await this.client.get<QueueStats>('/api/queue/llm/stats');
    return response.data;
  }

  async fetchLLMQueueItems(
    limit: number = 50,
    cursor?: string,
    status?: WorkItemStatus
  ): Promise<QueueItemsResponse<LLMQueueItem>> {
    const response = await this.client.get<QueueItemsResponse<LLMQueueItem>>(
      '/api/queue/llm/items',
      {
        params: { limit, cursor, status },
      }
    );
    return response.data;
  }

  // Queue - Document Update
  async fetchDocUpdateQueueStats(): Promise<QueueStats> {
    const response = await this.client.get<QueueStats>('/api/queue/document-update/stats');
    return response.data;
  }

  async fetchDocUpdateQueueItems(
    limit: number = 50,
    cursor?: string,
    status?: WorkItemStatus
  ): Promise<QueueItemsResponse<DocumentUpdateQueueItem>> {
    const response = await this.client.get<QueueItemsResponse<DocumentUpdateQueueItem>>(
      '/api/queue/document-update/items',
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

  // Health
  async checkHealth(): Promise<{ status: string }> {
    const response = await this.client.get<{ status: string }>('/health');
    return response.data;
  }
}

export const apiClient = new ApiClient();
