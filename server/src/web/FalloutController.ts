import { ApplicationServiceFactory } from '../application/ApplicationServiceFactory.js';
import { AppMapper } from '../map/Mapper.js';
import type { QueueItem } from './dtos/models/QueueItem.js';
import type { AuditLogEntry } from './dtos/models/AuditLogEntry.js';
import { UserContext } from '../domain/auth/UserContext.js';

export class FalloutController {
  private queueAppService;
  private auditLogService;

  constructor(appFactory: ApplicationServiceFactory) {
    this.queueAppService = appFactory.createQueueApplicationService();
    this.auditLogService = appFactory.createAuditLogApplicationService();
  }

  async listFallouts(user: UserContext): Promise<{ items: (QueueItem & { auditLog: AuditLogEntry[] })[], count: number }> {
    const enriched = await this.queueAppService.getFallouts(user, this.auditLogService);
    const items = enriched.map(item => ({
      ...AppMapper.toQueueItem(item),
      auditLog: AppMapper.toAuditLogEntryList(item.auditLog),
    }));
    return { items, count: items.length };
  }
}
