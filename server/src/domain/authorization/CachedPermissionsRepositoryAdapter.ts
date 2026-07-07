import { IPermissionsRepository, ResourceType } from './IPermissionsRepository.js';
import { EntityType } from '../entityDescriptions/EntityType.js';

export class CachedPermissionsRepositoryAdapter implements IPermissionsRepository {
  private readonly idsCache = new Map<string, string[]>();
  private readonly visibleEntityCache = new Map<string, number[]>();
  private readonly canSeeCache = new Map<string, boolean>();

  constructor(private readonly inner: IPermissionsRepository) {}

  async listObjectIdsForUser(type: ResourceType, username: string): Promise<string[]> {
    const key = `${type}:${username}`;
    if (!this.idsCache.has(key)) {
      this.idsCache.set(key, await this.inner.listObjectIdsForUser(type, username));
    }
    return this.idsCache.get(key)!;
  }

  async getVisibleEntityIds(username: string, type: EntityType): Promise<number[]> {
    const key = `${username}:${type}`;
    if (!this.visibleEntityCache.has(key)) {
      this.visibleEntityCache.set(key, await this.inner.getVisibleEntityIds(username, type));
    }
    return this.visibleEntityCache.get(key)!;
  }

  async canSeeEntity(username: string, type: EntityType, paperlessId: number): Promise<boolean> {
    const key = `${username}:${type}:${paperlessId}`;
    if (!this.canSeeCache.has(key)) {
      this.canSeeCache.set(key, await this.inner.canSeeEntity(username, type, paperlessId));
    }
    return this.canSeeCache.get(key)!;
  }

  grant(type: ResourceType, objectId: string, username: string): Promise<void> {
    return this.inner.grant(type, objectId, username);
  }

  revoke(type: ResourceType, objectId: string, username: string): Promise<void> {
    return this.inner.revoke(type, objectId, username);
  }

  hasPermission(type: ResourceType, objectId: string, username: string): Promise<boolean> {
    return this.inner.hasPermission(type, objectId, username);
  }

  getOwner(type: ResourceType, objectId: string): Promise<string | null> {
    return this.inner.getOwner(type, objectId);
  }

  setEntityVisibility(username: string, entities: Array<{ type: EntityType; paperlessId: number }>): Promise<void> {
    return this.inner.setEntityVisibility(username, entities);
  }
}
