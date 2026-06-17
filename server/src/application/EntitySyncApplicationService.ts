import { IEntityDescriptionsRepository, EntityDescription } from '../domain/entityDescriptions/IEntityDescriptionsRepository.js';
import { EntityType } from '../domain/entityDescriptions/EntityType.js';
import { IUsersRepository } from '../domain/auth/IUsersRepository.js';
import { UoWFactory } from '../infrastructure/UoW.js';
import { getLogger } from '../utils/logger.js';

export class EntitySyncApplicationService {
  constructor(
    private readonly usersRepo: IUsersRepository,
    private readonly entityDescRepo: IEntityDescriptionsRepository,
    private readonly uowFactory: UoWFactory,
  ) {}

  async syncAll(): Promise<void> {
    const logger = getLogger();
    const users = await this.usersRepo.findAll();

    if (users.length === 0) {
      logger.debug('No users found, skipping entity sync');
      return;
    }

    await Promise.all(users.map(user => this.syncForUser(user.username)));
    logger.debug({ userCount: users.length }, 'Entity sync completed for all users');
  }

  async syncForUser(username: string): Promise<void> {
    const logger = getLogger();
    const dms = await this.uowFactory.createDMSForUser({ username });

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
