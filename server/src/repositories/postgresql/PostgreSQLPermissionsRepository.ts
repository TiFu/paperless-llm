import { PoolClient } from 'pg';
import { ENTITY_TYPES, EntityType } from '../../domain/entityDescriptions/EntityType.js';
import { IPermissionsRepository, ResourceType } from '../../domain/authorization/IPermissionsRepository.js';

export class PostgreSQLPermissionsRepository implements IPermissionsRepository {
  constructor(private readonly client: PoolClient) {}

  async grant(type: ResourceType, objectId: string, username: string): Promise<void> {
    await this.client.query(
      `INSERT INTO permissions (type, username, referenced_object_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (type, username, referenced_object_id) DO NOTHING`,
      [type, username, objectId],
    );
  }

  async revoke(type: ResourceType, objectId: string, username: string): Promise<void> {
    await this.client.query(
      `DELETE FROM permissions WHERE type = $1 AND username = $2 AND referenced_object_id = $3`,
      [type, username, objectId],
    );
  }

  async hasPermission(type: ResourceType, objectId: string, username: string): Promise<boolean> {
    const result = await this.client.query<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM permissions
         WHERE type = $1 AND referenced_object_id = $2 AND username = $3
       ) AS exists`,
      [type, objectId, username],
    );
    return result.rows[0].exists;
  }

  async getOwner(type: ResourceType, objectId: string): Promise<string | null> {
    const result = await this.client.query<{ username: string }>(
      `SELECT username FROM permissions
       WHERE type = $1 AND referenced_object_id = $2
       ORDER BY created_at ASC
       LIMIT 1`,
      [type, objectId],
    );
    return result.rows[0]?.username ?? null;
  }

  async listObjectIdsForUser(type: ResourceType, username: string): Promise<string[]> {
    const result = await this.client.query<{ referenced_object_id: string }>(
      `SELECT referenced_object_id FROM permissions
       WHERE type = $1 AND username = $2`,
      [type, username],
    );
    return result.rows.map(r => r.referenced_object_id);
  }

  async setEntityVisibility(
    username: string,
    entities: Array<{ type: EntityType; paperlessId: number }>,
  ): Promise<void> {
    // Iterate over every known entity type, not just types present in `entities` —
    // a type with zero current items (e.g. all correspondents were deleted in Paperless)
    // still needs its stale visibility rows pruned.
    for (const { type: entityType } of ENTITY_TYPES) {
      const ids = entities.filter(e => e.type === entityType).map(e => e.paperlessId);
      await this.client.query(
        `DELETE FROM entity_visibility WHERE username = $1 AND entity_type = $2 AND paperless_id != ALL($3::int[])`,
        [username, entityType, ids],
      );
      if (ids.length > 0) {
        const values = ids.map((id, i) => `($1, $${i + 3}, $2)`).join(', ');
        await this.client.query(
          `INSERT INTO entity_visibility (username, paperless_id, entity_type)
           VALUES ${values}
           ON CONFLICT DO NOTHING`,
          [username, entityType, ...ids],
        );
      }
    }
  }

  async canSeeEntity(username: string, type: EntityType, paperlessId: number): Promise<boolean> {
    const result = await this.client.query<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM entity_visibility
         WHERE username = $1 AND entity_type = $2 AND paperless_id = $3
       ) AS exists`,
      [username, type, paperlessId],
    );
    return result.rows[0].exists;
  }

  async getVisibleEntityIds(username: string, type: EntityType): Promise<number[]> {
    const result = await this.client.query<{ paperless_id: number }>(
      `SELECT paperless_id FROM entity_visibility WHERE username = $1 AND entity_type = $2`,
      [username, type],
    );
    return result.rows.map(r => r.paperless_id);
  }
}
