import { IDocumentManagementSystem } from '../domain/document/IDocumentManagementSystem.js';
import { IEntityDescriptionsRepository, EntityDescription } from '../domain/entityDescriptions/IEntityDescriptionsRepository.js';
import { EntityType } from '../domain/entityDescriptions/EntityType.js';
import { getLogger } from '../utils/logger.js';

export class EntitySyncApplicationService {
  constructor(
    private readonly dms: IDocumentManagementSystem,
    private readonly repo: IEntityDescriptionsRepository,
  ) {}

  async syncAll(): Promise<void> {
    const logger = getLogger();

    await Promise.all([
      this.syncType('tag', () => this.dms.getTags()),
      this.syncType('correspondent', () => this.dms.getCorrespondents()),
      this.syncType('document_type', () => this.dms.getDocumentTypes()),
    ]);

    logger.debug('Entity descriptions sync completed');
  }

  private async syncType(
    type: EntityType,
    fetch: () => Promise<{ id: number; name: string }[]>,
  ): Promise<void> {
    const logger = getLogger();
    const items = await fetch();

    const entities: EntityDescription[] = items.map(item => ({
      entityType: type,
      paperlessId: item.id,
      name: item.name,
      description: null,
      syncedAt: new Date(),
    }));

    await this.repo.upsertMany(entities);
    await this.repo.deleteByTypeExcluding(type, items.map(i => i.id));

    logger.debug({ type, count: items.length }, 'Synced entity type');
  }
}
