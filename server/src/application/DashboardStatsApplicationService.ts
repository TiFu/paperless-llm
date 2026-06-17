import { ApprovalStats } from './ApprovalApplicationService.js';
import { JobStats } from './JobApplicationService.js';
import { QueueStats } from './QueueApplicationService.js';
import { ApplicationServiceFactory } from './ApplicationServiceFactory.js';
import { UserContext } from '../domain/auth/UserContext.js';
import { getLogger } from '../utils/logger.js';

export interface DashboardStats {
  queue: QueueStats;
  approvals: ApprovalStats;
  jobs: JobStats;
}

export class DashboardStatsApplicationService {
  constructor(private readonly appFactory: ApplicationServiceFactory) {}

  async getDashboardStats(user: UserContext): Promise<DashboardStats> {
    const logger = getLogger();

    try {
      const queueService = this.appFactory.createQueueApplicationService();
      const approvalService = this.appFactory.createApprovalApplicationService();
      const jobService = this.appFactory.createJobApplicationService();

      const [queue, approvals, jobs] = await Promise.all([
        queueService.getQueueStats(user),
        approvalService.getApprovalStats(user),
        jobService.getJobStats(user),
      ]);

      return { queue, approvals, jobs };
    } catch (error) {
      logger.error({ error }, 'Failed to get dashboard statistics');
      throw error;
    }
  }
}
