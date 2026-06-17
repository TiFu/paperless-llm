
import { ApplicationServiceFactory } from '../application/ApplicationServiceFactory.js';
import { AppMapper } from '../map/Mapper.js';
import { DOCUMENT_FIELDS, DocumentField } from '../domain/steps/StepFactory.js';
import { WorkflowType } from '../domain/workflows/WorkflowType.js';
import { JobState } from '../domain/job/JobState.js';
import { UserContext } from '../domain/auth/UserContext.js';
import pino from 'pino';
import { createChildLogger } from '../utils/logger.js';

export class JobController {
  private logger: pino.Logger;
  constructor(private readonly appFactory: ApplicationServiceFactory) {
    this.logger = createChildLogger({ "name": "JobController"})
  }

  async getAvailableFields(): Promise<string[]> {
    return [...DOCUMENT_FIELDS];
  }

  async getJobStats(user: UserContext) {
    const jobAppService = this.appFactory.createJobApplicationService();
    const stats = await jobAppService.getJobStats(user);
    return stats;
  }

  async getJobTypes() {
    return { jobTypes: Object.values(WorkflowType) };
  }

  async submitJob(documents: Array<{ documentId: number; jobType: WorkflowType; fields: DocumentField[] }>, user: UserContext) {
    const jobAppService = this.appFactory.createJobApplicationService();
    const createdJobs = await jobAppService.createBulk(documents, user);
    return {
      submitted: createdJobs.length,
      jobs: createdJobs.map(AppMapper.toJobResponse),
    };
  }

  async listJobs(limit: number, user: UserContext, cursor?: string, state?: JobState) {
    const jobAppService = this.appFactory.createJobApplicationService();
    const result = await jobAppService.list(limit, user, cursor, state);
    return {
      jobs: result.items.map(AppMapper.toJobResponse),
      nextCursor: result.nextCursor,
    };
  }

  async getJob(id: string, user: UserContext) {
    const jobAppService = this.appFactory.createJobApplicationService();
    const job = await jobAppService.getById(id, user);
    if (!job) return null;
    return AppMapper.toJobResponse(job);
  }

  async getJobSteps(id: string, user: UserContext) {
    const jobAppService = this.appFactory.createJobApplicationService();
    const job = await jobAppService.getById(id, user);
    if (!job) return null;
    const steps = await jobAppService.getStepsByJobId(id, user);
    return {
      steps: steps.map(AppMapper.toJobStep),
    };
  }

  async getJobAuditLog(id: string, user: UserContext) {
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
