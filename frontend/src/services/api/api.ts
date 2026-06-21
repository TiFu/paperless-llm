import { StepType } from './generated/models/StepType';
import {
  createConfiguration,
  Configuration,
  DocumentsApi,
  JobsApi,
  ApprovalsApi,
  PromptsApi,
  QueueApi,
  StatsApi,
  StepsApi,
  HealthApi,
  EntityDescriptionsApi,
  AuthApi,
  WorkflowType,
  BatchJobRequestDocumentsInnerFieldsEnum,
  EntityValueType,
} from './generated';
import { BearerAuthAuthentication } from './generated/auth/auth';
import { PromiseMiddleware } from './generated/middleware';
import { getToken, emitUnauthorized } from '../auth/tokenStorage';

declare global {
  interface Window {
    __APP_CONFIG__?: { apiBaseUrl?: string };
  }
}

const API_BASE_URL = window.__APP_CONFIG__?.apiBaseUrl ?? 'http://localhost:3000/api';


import { RequestContext } from './generated';

const bearerAuth = new BearerAuthAuthentication({ getToken: () => getToken() ?? '' });

const unauthorizedMiddleware: PromiseMiddleware = {
  pre: async context => context,
  post: async context => {
    if (context.httpStatusCode === 401) {
      emitUnauthorized();
    }
    return context;
  },
};

const config: Configuration = createConfiguration({
  baseServer: {
    makeRequestContext: (endpoint, httpMethod) => {
      const base = API_BASE_URL.replace(/\/+$/, '');
      const ep = endpoint.replace(/^\//, '');
      // The generated API expects a RequestContext object
      return new RequestContext(`${base}/${ep}`, httpMethod);
    },
  },
  authMethods: {
    default: bearerAuth,
    bearerAuth: { tokenProvider: { getToken: () => getToken() ?? '' } },
  },
  promiseMiddleware: [unauthorizedMiddleware],
});

const documentsApi = new DocumentsApi(config);
const jobsApi = new JobsApi(config);
const approvalsApi = new ApprovalsApi(config);
const promptsApi = new PromptsApi(config);
const queueApi = new QueueApi(config);
const statsApi = new StatsApi(config);
const stepsApi = new StepsApi(config);
const healthApi = new HealthApi(config);
const entityDescriptionsApi = new EntityDescriptionsApi(config);
const authApi = new AuthApi(config);

function normalizeError(error: any): Error {
      if (error?.response?.data?.detail) return new Error(error.response.data.detail);
      if (error?.response?.data?.title) return new Error(error.response.data.title);
      if (error?.body?.detail) return new Error(error.body.detail);
      if (error?.body?.title) return new Error(error.body.title);
      if (error?.message) return new Error(error.message);
      return new Error('Unknown API error');
}

export const apiClient = {
  // Auth
  async login(username: string, password: string) {
    try {
      return await authApi.authLoginPost({ username, password });
    } catch (e) {
      throw normalizeError(e);
    }
  },
  async fetchMe() {
    try {
      return await authApi.authMeGet();
    } catch (e) {
      throw normalizeError(e);
    }
  },

  // Documents
  async fetchDocumentsByTag(tag: string, limit?: number, cursor?: string) {
    try {
      return await documentsApi.listDocuments(tag, limit, cursor);
    } catch (e) {
      throw normalizeError(e);
    }
  },
  async fetchEntityValues(type: EntityValueType) {
    try {
      return await documentsApi.getEntityValues(type);
    } catch (e) {
      throw normalizeError(e);
    }
  },

  // Jobs
  async submitJobs(submission: Array<{ documentId: number, jobType: WorkflowType, fields: BatchJobRequestDocumentsInnerFieldsEnum[] }>) {
    try {
      return await jobsApi.submitJob({ documents: submission });
    } catch (e) {
      throw normalizeError(e);
    }
  },
  async fetchJobs(limit: number = 20, cursor?: string, state?: any) {
    try {
      return await jobsApi.listJobs(limit, cursor, state);
    } catch (e) {
      throw normalizeError(e);
    }
  },
  async fetchJobById(id: string) {
    try {
      return await jobsApi.getJob(id);
    } catch (e) {
      throw normalizeError(e);
    }
  },
  async fetchJobSteps(id: string) {
    try {
      return await jobsApi.getJobSteps(id);
    } catch (e) {
      throw normalizeError(e);
    }
  },
  async fetchJobAuditLog(id: string) {
    try {
      return await jobsApi.getJobAuditLog(id);
    } catch (e) {
      throw normalizeError(e);
    }
  },
  async fetchJobTypes() {
    try {
      const res = await jobsApi.getJobTypes();
      return res.jobTypes;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  // Approvals
  async fetchPendingApprovals(limit: number = 50, cursor?: string) {
    try {
      return await approvalsApi.listApprovals(limit, cursor);
    } catch (e) {
      throw normalizeError(e);
    }
  },
  async fetchApprovalStats() {
    try {
      return await approvalsApi.getApprovalStats();
    } catch (e) {
      throw normalizeError(e);
    }
  },
  async processApprovalDecision(
    stepId: string,
    decision: string,
    actions?: { id: string; newValue: string | null }[]
  ) {
    try {
      return await approvalsApi.makeApprovalDecision(stepId, { decision, actions });
    } catch (e) {
      throw normalizeError(e);
    }
  },

  // Prompts
  async fetchPrompts() {
    try {
      return await promptsApi.listPrompts();
    } catch (e) {
      throw normalizeError(e);
    }
  },
  async updatePrompt(stepType: string, template: string) {
    try {
      return await promptsApi.updatePrompt(stepType as StepType, { template });
    } catch (e) {
      throw normalizeError(e);
    }
  },

  // Document Fields
  async fetchDocumentFields() {
    try {
      return await jobsApi.getAvailableFields();
    } catch (e) {
      throw normalizeError(e);
    }
  },

  // Queue
  async fetchQueueStats() {
    try {
      return await queueApi.getQueueStats();
    } catch (e) {
      throw normalizeError(e);
    }
  },
  async fetchQueueItems(limit: number = 50, cursor?: string, status?: any) {
    try {
      return await queueApi.listQueueItems(limit, cursor, status);
    } catch (e) {
      throw normalizeError(e);
    }
  },

  // Stats
  async fetchDashboardStats() {
    try {
      return await statsApi.statsDashboardGet();
    } catch (e) {
      throw normalizeError(e);
    }
  },

  // Steps
  async retryStep(id: string) {
    try {
      return await stepsApi.retryStep(id);
    } catch (e) {
      throw normalizeError(e);
    }
  },
  async cancelStep(id: string) {
    try {
      return await stepsApi.cancelStep(id);
    } catch (e) {
      throw normalizeError(e);
    }
  },

  // Health
  async fetchSystemStatus() {
    try {
      return await healthApi.getSystemStatus();
    } catch (e) {
      throw normalizeError(e);
    }
  },
  async checkHealth() {
    try {
      return await healthApi.getHealth();
    } catch (e) {
      throw normalizeError(e);
    }
  },

  // Entity Descriptions
  async fetchEntityDescriptions() {
    try {
      return await entityDescriptionsApi.entityDescriptionsGet();
    } catch (e) {
      throw normalizeError(e);
    }
  },
  async updateEntityDescription(type: 'tag' | 'correspondent' | 'document_type', paperlessId: number, description: string | null) {
    try {
      return await entityDescriptionsApi.entityDescriptionsTypeIdPut(type, paperlessId, { description });
    } catch (e) {
      throw normalizeError(e);
    }
  },
  async syncEntityDescriptions() {
    try {
      return await entityDescriptionsApi.entityDescriptionsSyncPost();
    } catch (e) {
      throw normalizeError(e);
    }
  },

  // Audit Log (Job-level)
  async fetchAuditLog({ stepId }: { stepId: string }) {
    // This is a placeholder; adjust as needed for your actual API
    // If you have a dedicated audit log endpoint, use it here
    throw new Error('fetchAuditLog not implemented: check your OpenAPI spec for the correct endpoint.');
  },
};
