import { ApprovalStats } from './ApprovalApplicationService.js';
import { JobStats } from './JobApplicationService.js';
import { QueueStats } from './QueueApplicationService.js';
import { ApplicationServiceFactory } from './ApplicationServiceFactory.js';
import { getLogger } from '../utils/logger.js';

/**
 * Unified dashboard statistics response combining all stats types
 */
export interface DashboardStats {
  queue: QueueStats;
  approvals: ApprovalStats;
  jobs: JobStats;
}

/**
 * DashboardStatsApplicationService - provides unified statistics for dashboard.
 * Aggregates queue, approval, and job statistics in a single response.
 */
export class DashboardStatsApplicationService {
  constructor(private readonly appFactory: ApplicationServiceFactory) {}

  /**
   * Get all dashboard statistics in a single call.
   * Fetches queue, approval, and job stats in parallel for efficiency.
   * @returns Unified dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const logger = getLogger();

    try {
      const queueService = this.appFactory.createQueueApplicationService();
      const approvalService = this.appFactory.createApprovalApplicationService();
      const jobService = this.appFactory.createJobApplicationService();

      // Fetch all stats in parallel for efficiency
      const [queue, approvals, jobs] = await Promise.all([
        queueService.getQueueStats(),
        approvalService.getApprovalStats(),
        jobService.getJobStats(),
      ]);

      return {
        queue,
        approvals,
        jobs,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get dashboard statistics');
      throw error;
    }
  }
}
