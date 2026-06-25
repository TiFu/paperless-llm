import { Pool, PoolClient } from 'pg';
import { IEntityDescriptionsRepository, EntityDescription } from '../../domain/entityDescriptions/IEntityDescriptionsRepository.js';
import { EntityType, ENTITY_TYPES } from '../../domain/entityDescriptions/EntityType.js';
import { DescribedAvailableFields } from '../../domain/entityDescriptions/IDescribedEntities.js';

export class PostgreSQLEntityDescriptionsRepository implements IEntityDescriptionsRepository {
  constructor(private readonly pool: Pool | PoolClient) {}

  async findAllGrouped(): Promise<DescribedAvailableFields> {
    const result = await this.pool.query<{
      entity_type: EntityType;
      paperless_id: number;
      name: string;
      description: string | null;
      synced_at: Date;
    }>(`SELECT entity_type, paperless_id, name, description, synced_at FROM entity_descriptions ORDER BY name`);

    const tags = result.rows
      .filter(r => r.entity_type === 'tag')
      .map(r => ({ id: r.paperless_id, name: r.name, description: r.description }));

    const correspondents = result.rows
      .filter(r => r.entity_type === 'correspondent')
      .map(r => ({ id: r.paperless_id, name: r.name, description: r.description }));

    const documentTypes = result.rows
      .filter(r => r.entity_type === 'document_type')
      .map(r => ({ id: r.paperless_id, name: r.name, description: r.description }));

    return { tags, correspondents, documentTypes };
  }

  async findAll(): Promise<EntityDescription[]> {
    const result = await this.pool.query<{
      entity_type: EntityType;
      paperless_id: number;
      name: string;
      description: string | null;
      synced_at: Date;
    }>(`SELECT entity_type, paperless_id, name, description, synced_at FROM entity_descriptions ORDER BY entity_type, name`);

    return result.rows.map(r => ({
      entityType: r.entity_type,
      paperlessId: r.paperless_id,
      name: r.name,
      description: r.description,
      syncedAt: r.synced_at,
    }));
  }

  async upsertMany(entities: EntityDescription[]): Promise<void> {
    if (entities.length === 0) return;

    const values = entities.map((e, i) => {
      const base = i * 3;
      return `($${base + 1}, $${base + 2}, $${base + 3})`;
    }).join(', ');

    const params = entities.flatMap(e => [e.entityType, e.paperlessId, e.name]);

    await this.pool.query(
      `INSERT INTO entity_descriptions (entity_type, paperless_id, name)
       VALUES ${values}
       ON CONFLICT (entity_type, paperless_id)
       DO UPDATE SET name = EXCLUDED.name, synced_at = NOW()`,
      params,
    );
  }

  async deleteByTypeExcluding(type: EntityType, keepIds: number[]): Promise<void> {
    if (keepIds.length === 0) {
      await this.pool.query(
        `DELETE FROM entity_descriptions WHERE entity_type = $1`,
        [type],
      );
      return;
    }

    const placeholders = keepIds.map((_, i) => `$${i + 2}`).join(', ');
    await this.pool.query(
      `DELETE FROM entity_descriptions WHERE entity_type = $1 AND paperless_id NOT IN (${placeholders})`,
      [type, ...keepIds],
    );
  }

  async updateDescription(type: EntityType, paperlessId: number, description: string | null): Promise<void> {
    await this.pool.query(
      `UPDATE entity_descriptions SET description = $1 WHERE entity_type = $2 AND paperless_id = $3`,
      [description, type, paperlessId],
    );
  }
}
