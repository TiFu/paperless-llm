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
   * List queue items with pagination and status filter (default: in_fallout)
   */
  async listQueueItems(limit: number = 50, cursor?: string, status: string = 'in_fallout'): Promise<QueueItemsResponse> {
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
