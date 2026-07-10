import { poll } from './wait.js';

export const SERVER_URL = process.env.SERVER_URL ?? 'http://localhost:3000';

export type DocumentField = 'title' | 'tags' | 'correspondent' | 'document_type' | 'created_date';
export type WorkflowType = 'automated' | 'approval';
export type JobState =
  | 'pending'
  | 'llm_processing'
  | 'pending_approval'
  | 'updating_document'
  | 'removing_tags'
  | 'completed'
  | 'failed'
  | 'rejected'
  | 'cleanup_after_rejection'
  | 'cleanup_after_failure';

export interface JobResponse {
  id: string;
  documentId: number;
  jobType: WorkflowType;
  status: JobState;
  errorMessage?: string | null;
}

export interface ApprovalItem {
  stepId: string;
  jobId: string;
  documentId: number;
  possibleDecisions: string[];
}

export type StepStatus = 'waiting' | 'in_progress' | 'completed' | 'failed' | 'retrying' | 'in_fallout';

export interface JobStep {
  stepId: string;
  stepType: string;
  stepStatus: StepStatus;
  children: JobStep[] | null;
}

async function serverFetch(path: string, jwt: string | undefined, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(`${SERVER_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Server API ${init.method ?? 'GET'} ${path} failed: ${response.status} ${body}`);
  }
  return response;
}

/** Logs in via the app's own auth, which transparently authenticates against Paperless and stores a per-user token server-side. */
export async function login(username: string, password: string): Promise<string> {
  const response = await fetch(`${SERVER_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    throw new Error(`Server login failed: ${response.status} ${await response.text()}`);
  }
  const { token } = (await response.json()) as { token: string };
  return token;
}

export async function waitForHealthy(timeoutMs = 60_000): Promise<void> {
  await poll(
    async () => {
      try {
        const response = await fetch(`${SERVER_URL}/health`);
        return response.ok ? true : undefined;
      } catch {
        return undefined;
      }
    },
    { timeoutMs, intervalMs: 2_000, description: 'server /health to return 200' },
  );
}

export async function submitJob(
  jwt: string,
  documentId: number,
  jobType: WorkflowType,
  fields: DocumentField[],
): Promise<JobResponse> {
  const response = await serverFetch('/api/jobs', jwt, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documents: [{ documentId, jobType, fields }] }),
  });
  const { jobs } = (await response.json()) as { jobs: JobResponse[] };
  return jobs[0];
}

/** Lists jobs (single page, newest first) and finds the one for a given Paperless document id. */
export async function findJobByDocumentId(jwt: string, documentId: number): Promise<JobResponse | undefined> {
  const response = await serverFetch('/api/jobs?limit=100', jwt);
  const { jobs } = (await response.json()) as { jobs: JobResponse[] };
  return jobs.find((job) => job.documentId === documentId);
}

export async function waitForJobForDocument(jwt: string, documentId: number, timeoutMs = 60_000): Promise<JobResponse> {
  return poll(() => findJobByDocumentId(jwt, documentId), {
    timeoutMs,
    intervalMs: 2_000,
    description: `a job to be auto-queued for document ${documentId}`,
  });
}

export async function getJob(jwt: string, jobId: string): Promise<JobResponse> {
  const response = await serverFetch(`/api/jobs/${jobId}`, jwt);
  return (await response.json()) as JobResponse;
}

export async function getJobAuditLog(jwt: string, jobId: string): Promise<unknown[]> {
  const response = await serverFetch(`/api/jobs/${jobId}/audit-log`, jwt);
  const { auditLog } = (await response.json()) as { auditLog: unknown[] };
  return auditLog;
}

export async function waitForJobState(jwt: string, jobId: string, states: JobState[], timeoutMs = 60_000): Promise<JobResponse> {
  return poll(
    async () => {
      const job = await getJob(jwt, jobId);
      if (job.status === 'failed' && !states.includes('failed')) {
        throw new Error(`Job ${jobId} failed: ${job.errorMessage ?? 'no error message'}`);
      }
      return states.includes(job.status) ? job : undefined;
    },
    { timeoutMs, intervalMs: 2_000, description: `job ${jobId} to reach state in [${states.join(', ')}]` },
  );
}

export async function findApprovalForJob(jwt: string, jobId: string): Promise<ApprovalItem | undefined> {
  const response = await serverFetch('/api/approvals?limit=100', jwt);
  const { items } = (await response.json()) as { items: ApprovalItem[] };
  return items.find((item) => item.jobId === jobId);
}

export async function waitForApprovalForJob(jwt: string, jobId: string, timeoutMs = 60_000): Promise<ApprovalItem> {
  return poll(() => findApprovalForJob(jwt, jobId), {
    timeoutMs,
    intervalMs: 2_000,
    description: `an approval to become pending for job ${jobId}`,
  });
}

export async function decideApproval(jwt: string, stepId: string, decision: string): Promise<void> {
  await serverFetch(`/api/approvals/${stepId}`, jwt, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision }),
  });
}

export async function getJobSteps(jwt: string, jobId: string): Promise<JobStep[]> {
  const response = await serverFetch(`/api/jobs/${jobId}/steps`, jwt);
  const { steps } = (await response.json()) as { steps: JobStep[] };
  return steps;
}

/** Job steps can be nested (e.g. LLM_GENERATE_FIELDS wraps one child step per requested field). */
function findStepWithStatus(steps: JobStep[], status: StepStatus): JobStep | undefined {
  for (const step of steps) {
    if (step.stepStatus === status) return step;
    const match = step.children && findStepWithStatus(step.children, status);
    if (match) return match;
  }
  return undefined;
}

export async function waitForStepStatus(jwt: string, jobId: string, status: StepStatus, timeoutMs = 60_000): Promise<JobStep> {
  return poll(
    async () => {
      const steps = await getJobSteps(jwt, jobId);
      return findStepWithStatus(steps, status);
    },
    { timeoutMs, intervalMs: 1_000, description: `a step of job ${jobId} to reach status "${status}"` },
  );
}

/** Permanently fails a step stuck in RETRYING or IN_FALLOUT, advancing the job to a terminal FAILURE transition. */
export async function cancelStep(jwt: string, stepId: string): Promise<void> {
  await serverFetch(`/api/steps/${stepId}/cancel`, jwt, { method: 'POST' });
}
