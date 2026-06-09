import { EntityType } from './EntityType.js';
import { DescribedAvailableFields } from './IDescribedEntities.js';

export interface EntityDescription {
  entityType: EntityType;
  paperlessId: number;
  name: string;
  description: string | null;
  syncedAt: Date;
}

export interface IEntityDescriptionsRepository {
  findAllGrouped(): Promise<DescribedAvailableFields>;
  findAll(): Promise<EntityDescription[]>;
  upsertMany(entities: EntityDescription[]): Promise<void>;
  deleteByTypeExcluding(type: EntityType, keepIds: number[]): Promise<void>;
  updateDescription(type: EntityType, paperlessId: number, description: string | null): Promise<void>;
}
