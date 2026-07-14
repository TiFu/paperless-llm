
import { ApplicationServiceFactory } from '../application/ApplicationServiceFactory.js';
import { AppMapper } from '../map/Mapper.js';
import { DOCUMENT_FIELDS, DocumentField } from '../domain/steps/StepFactory.js';
import { WorkflowType } from '../domain/workflows/WorkflowType.js';
import { JobState } from '../domain/job/JobState.js';
import { UserContext } from '../domain/auth/UserContext.js';
import { JobStats } from '../application/JobApplicationService.js';
import { JobResponse } from './dtos/models/JobResponse.js';
import { JobStep } from './dtos/models/JobStep.js';
import type { AuditLogEntry } from './dtos/models/AuditLogEntry.js';

type JobResponseDto = JobResponse & { paperlessUrl: string };

export class JobController {
  private readonly paperlessBaseUrl: string;
  constructor(private readonly appFactory: ApplicationServiceFactory) {
    this.paperlessBaseUrl = appFactory.getPaperlessBaseUrl();
  }

  async getAvailableFields(): Promise<string[]> {
    return [...DOCUMENT_FIELDS];
  }

  async getJobStats(user: UserContext): Promise<JobStats> {
    const jobAppService = this.appFactory.createJobApplicationService();
    const stats = await jobAppService.getJobStats(user);
    return stats;
  }

  async getJobTypes(): Promise<{ jobTypes: WorkflowType[] }> {
    return { jobTypes: Object.values(WorkflowType) };
  }

  async submitJob(documents: Array<{ documentId: number; jobType: WorkflowType; fields: DocumentField[] }>, user: UserContext): Promise<{ submitted: number; jobs: JobResponseDto[] }> {
    const jobAppService = this.appFactory.createJobApplicationService();
    const createdJobs = await jobAppService.createBulk(documents, user);
    return {
      submitted: createdJobs.length,
      jobs: createdJobs.map(job => AppMapper.toJobResponse(job, this.paperlessBaseUrl)),
    };
  }

  async listJobs(limit: number, user: UserContext, cursor?: string, state?: JobState): Promise<{ jobs: JobResponseDto[]; nextCursor: string | null }> {
    const jobAppService = this.appFactory.createJobApplicationService();
    const result = await jobAppService.list(limit, user, cursor, state);
    return {
      jobs: result.items.map(job => AppMapper.toJobResponse(job, this.paperlessBaseUrl)),
      nextCursor: result.nextCursor,
    };
  }

  async getJob(id: string, user: UserContext): Promise<JobResponseDto | null> {
    const jobAppService = this.appFactory.createJobApplicationService();
    const job = await jobAppService.getById(id, user);
    if (!job) return null;
    return AppMapper.toJobResponse(job, this.paperlessBaseUrl);
  }

  async getJobSteps(id: string, user: UserContext): Promise<{ steps: JobStep[] } | null> {
    const jobAppService = this.appFactory.createJobApplicationService();
    const job = await jobAppService.getById(id, user);
    if (!job) return null;
    const steps = await jobAppService.getStepsByJobId(id, user);
    return {
      steps: steps.map(AppMapper.toJobStep),
    };
  }

  async getJobAuditLog(id: string, user: UserContext): Promise<{ auditLog: AuditLogEntry[] } | null> {
    const jobAppService = this.appFactory.createJobApplicationService();
    const job = await jobAppService.getById(id, user);
    if (!job) return null;
    const auditLogService = this.appFactory.createAuditLogApplicationService();
    const auditLog = await auditLogService.getAuditLogForJobById(id);
    return {
      auditLog: AppMapper.toAuditLogEntryList(auditLog),
    };
  }
}
