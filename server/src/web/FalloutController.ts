import { ApplicationServiceFactory } from '../application/ApplicationServiceFactory.js';
import { AppMapper } from '../map/Mapper.js';
import type { QueueItem } from './dtos/models/QueueItem.js';

export class FalloutController {
  private queueAppService;
  private auditLogService;

  constructor(appFactory: ApplicationServiceFactory) {
    this.queueAppService = appFactory.createQueueApplicationService();
    this.auditLogService = appFactory.createAuditLogApplicationService();
  }

  /**
   * List fallout items (in_fallout) with audit log attached
   */
  async listFallouts(): Promise<{ items: (QueueItem & { auditLog: any[] })[], count: number }> {
    const enriched = await this.queueAppService.getFallouts(this.auditLogService);
    // Map each enriched fallout item to DTO, preserving auditLog
    const items = enriched.map(item => ({
      ...AppMapper.toQueueItem(item),
      auditLog: AppMapper.toAuditLogEntryList(item.auditLog),
    }));
    return {
      items,
      count: items.length,
    };
  }
}
