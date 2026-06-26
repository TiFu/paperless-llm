import { IEntityDescriptionsRepository, EntityDescription } from '../domain/entityDescriptions/IEntityDescriptionsRepository.js';
import { EntityType } from '../domain/entityDescriptions/EntityType.js';
import { IUsersRepository } from '../domain/auth/IUsersRepository.js';
import { UoWFactory } from '../infrastructure/UoW.js';
import { getLogger } from '../utils/logger.js';

export interface EntitySyncResult {
  items: Array<{ username: string; outcome: 'success' | 'failed'; errorMessage?: string; startedAt: Date; finishedAt: Date }>;
}

export class EntitySyncApplicationService {
  constructor(
    private readonly usersRepo: IUsersRepository,
    private readonly entityDescRepo: IEntityDescriptionsRepository,
    private readonly uowFactory: UoWFactory,
  ) {}

  async syncAll(): Promise<EntitySyncResult> {
    const logger = getLogger();
    const users = await this.usersRepo.findAll();

    if (users.length === 0) {
      logger.debug('No users found, skipping entity sync');
      return { items: [] };
    }

    const results = await Promise.allSettled(
      users.map(async user => {
        const startedAt = new Date();
        await this.syncForUser(user.username);
        return { username: user.username, startedAt };
      }),
    );

    const items = results.map((result, idx) => {
      const username = users[idx].username;
      const finishedAt = new Date();
      if (result.status === 'fulfilled') {
        return { username, outcome: 'success' as const, startedAt: result.value.startedAt, finishedAt };
      }
      const error = result.reason;
      logger.error({ error, username }, 'Entity sync failed for user');
      return {
        username,
        outcome: 'failed' as const,
        errorMessage: error instanceof Error ? error.message : String(error),
        startedAt: finishedAt,
        finishedAt,
      };
    });

    logger.debug({ userCount: users.length }, 'Entity sync completed for all users');
    return { items };
  }

  async syncForUser(username: string): Promise<void> {
    const logger = getLogger();
    await using uow = await this.uowFactory.createUoW({ username })
    const dms = await uow.getDMS()

    const [tags, correspondents, documentTypes] = await Promise.all([
      dms.getTags(),
      dms.getCorrespondents(),
      dms.getDocumentTypes(),
    ]);

    const entities: EntityDescription[] = [
      ...tags.map(t => ({ entityType: 'tag' as EntityType, paperlessId: t.id, name: t.name, description: null, syncedAt: new Date() })),
      ...correspondents.map(c => ({ entityType: 'correspondent' as EntityType, paperlessId: c.id, name: c.name, description: null, syncedAt: new Date() })),
      ...documentTypes.map(dt => ({ entityType: 'document_type' as EntityType, paperlessId: dt.id, name: dt.name, description: null, syncedAt: new Date() })),
    ];
    await this.entityDescRepo.upsertMany(entities);

    const visibilityEntries = [
      ...tags.map(t => ({ type: 'tag' as EntityType, paperlessId: t.id })),
      ...correspondents.map(c => ({ type: 'correspondent' as EntityType, paperlessId: c.id })),
      ...documentTypes.map(dt => ({ type: 'document_type' as EntityType, paperlessId: dt.id })),
    ];
    await using context = await this.uowFactory.createSystemUoW();
    await context.start();
    await context.getPermissions().setEntityVisibility(username, visibilityEntries);
    await context.commit();

    logger.debug(
      { username, tags: tags.length, correspondents: correspondents.length, documentTypes: documentTypes.length },
      'Entity sync completed for user',
    );
  }
}
