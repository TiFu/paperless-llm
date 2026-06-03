import { ApplicationServiceFactory } from '../application/ApplicationServiceFactory.js';
import type { QueueItemsResponse } from './dtos/models/QueueItemsResponse.js';

import { AppMapper } from '../map/Mapper.js';
import { QueueStats } from './dtos/models/QueueStats.js';

export class QueueController {
  private queueAppService;

  constructor(appFactory: ApplicationServiceFactory) {
    this.queueAppService = appFactory.createQueueApplicationService();
  }

  async getQueueStats(): Promise<QueueStats> {
    return this.queueAppService.getQueueStats();
  }

  /**
   * List queue items with pagination and optional status filter (default: all)
   */
  async listQueueItems(limit: number = 50, cursor?: string, status?: string): Promise<QueueItemsResponse> {
    const { items, nextCursor } = await this.queueAppService.getQueueItems(limit, cursor, status);
    return {
      items: AppMapper.toQueueItemList(items),
      pagination: {
        limit,
        nextCursor,
      },
    };
  }
}
