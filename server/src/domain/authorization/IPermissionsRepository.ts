import { EntityType } from '../entityDescriptions/EntityType.js';

export type ResourceType = 'job' | 'prompt' | 'settings';

// 'settings' is a singleton resource (there's only ever one app_settings row),
// not a per-instance one like a job — this well-known UUID stands in for it
// since permissions.referenced_object_id is NOT NULL.
export const SETTINGS_RESOURCE_ID = '00000000-0000-0000-0000-000000000001';

export interface IPermissionsRepository {
  // UUID-keyed resource permissions (jobs, etc.)
  grant(type: ResourceType, objectId: string, username: string): Promise<void>;
  revoke(type: ResourceType, objectId: string, username: string): Promise<void>;
  hasPermission(type: ResourceType, objectId: string, username: string): Promise<boolean>;
  getOwner(type: ResourceType, objectId: string): Promise<string | null>;
  listObjectIdsForUser(type: ResourceType, username: string): Promise<string[]>;

  // Entity visibility (Paperless entities per user)
  setEntityVisibility(username: string, entities: Array<{ type: EntityType; paperlessId: number }>): Promise<void>;
  canSeeEntity(username: string, type: EntityType, paperlessId: number): Promise<boolean>;
  getVisibleEntityIds(username: string, type: EntityType): Promise<number[]>;
}
