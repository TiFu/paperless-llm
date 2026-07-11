import { ApplicationServiceFactory } from '../application/ApplicationServiceFactory.js';
import type { QueueItemsResponse } from './dtos/models/QueueItemsResponse.js';
import { AppMapper } from '../map/Mapper.js';
import { QueueStats } from './dtos/models/QueueStats.js';
import { UserContext } from '../domain/auth/UserContext.js';

export class QueueController {
  private queueAppService;

  constructor(appFactory: ApplicationServiceFactory) {
    this.queueAppService = appFactory.createQueueApplicationService();
  }

  async getQueueStats(user: UserContext): Promise<QueueStats> {
    return this.queueAppService.getQueueStats(user);
  }

  async listQueueItems(user: UserContext, limit: number = 50, cursor?: string, status?: string, includeAuditLog: boolean = false): Promise<QueueItemsResponse> {
    const { items, nextCursor } = await this.queueAppService.getQueueItems(user, limit, cursor, status, includeAuditLog);
    return {
      items: AppMapper.toQueueItemList(items),
      pagination: { limit, nextCursor },
    };
  }
}
