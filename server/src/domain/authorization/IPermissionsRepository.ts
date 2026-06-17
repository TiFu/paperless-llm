import { EntityType } from '../entityDescriptions/EntityType.js';

export type ResourceType = 'job' | 'prompt';

export interface IPermissionsRepository {
  // UUID-keyed resource permissions (jobs, etc.)
  grant(type: ResourceType, objectId: string, username: string): Promise<void>;
  hasPermission(type: ResourceType, objectId: string, username: string): Promise<boolean>;
  getOwner(type: ResourceType, objectId: string): Promise<string | null>;
  listObjectIdsForUser(type: ResourceType, username: string): Promise<string[]>;

  // Entity visibility (Paperless entities per user)
  setEntityVisibility(username: string, entities: Array<{ type: EntityType; paperlessId: number }>): Promise<void>;
  canSeeEntity(username: string, type: EntityType, paperlessId: number): Promise<boolean>;
  getVisibleEntityIds(username: string, type: EntityType): Promise<number[]>;
}
