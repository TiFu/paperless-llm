import { Router, Request, Response, NextFunction } from 'express';
import { IEntityDescriptionsRepository } from '../../domain/entityDescriptions/IEntityDescriptionsRepository.js';
import { EntitySyncApplicationService } from '../../application/EntitySyncApplicationService.js';
import { ENTITY_TYPES, EntityType } from '../../domain/entityDescriptions/EntityType.js';
import { ApiError } from '../middleware/errorHandler.js';
import { createChildLogger } from '../../utils/logger.js';
import { LogArea } from '../../utils/LogArea.js';

const VALID_ENTITY_TYPES = ENTITY_TYPES.map(t => t.type) as EntityType[];

export function createEntityDescriptionsRouter(
  repo: IEntityDescriptionsRepository,
  syncService: EntitySyncApplicationService,
): Router {
  const logger = createChildLogger(LogArea.HTTP, 'entity-descriptions-router');
  const router = Router();

  /**
   * GET /api/entity-descriptions
   * Returns all entity types with their entities and descriptions.
   * Response shape is driven by the ENTITY_TYPES registry — all types are always present.
   */
  router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const grouped = await repo.findAllGrouped();

      const entityTypes = ENTITY_TYPES.map(({ type, label }) => {
        let entities: { paperlessId: number; name: string; description: string | null }[];

        if (type === 'tag') {
          entities = grouped.tags.map(t => ({ paperlessId: t.id, name: t.name, description: t.description }));
        } else if (type === 'correspondent') {
          entities = grouped.correspondents.map(c => ({ paperlessId: c.id, name: c.name, description: c.description }));
        } else {
          entities = grouped.documentTypes.map(dt => ({ paperlessId: dt.id, name: dt.name, description: dt.description }));
        }

        return { type, label, entities };
      });

      res.json({ entityTypes });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch entity descriptions');
      next(error);
    }
  });

  /**
   * PUT /api/entity-descriptions/:type/:id
   * Update the description for a single entity.
   */
  router.put('/:type/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type, id } = req.params;

      if (!VALID_ENTITY_TYPES.includes(type as EntityType)) {
        throw new ApiError(400, 'Invalid entity type', `type must be one of: ${VALID_ENTITY_TYPES.join(', ')}`);
      }

      const paperlessId = parseInt(id, 10);
      if (isNaN(paperlessId)) {
        throw new ApiError(400, 'Invalid id', 'id must be a numeric paperless ID');
      }

      const { description } = req.body as { description: string | null };

      await repo.updateDescription(type as EntityType, paperlessId, description ?? null);

      res.json({ success: true });
    } catch (error) {
      logger.error({ error, type: req.params.type, id: req.params.id }, 'Failed to update entity description');
      next(error);
    }
  });

  /**
   * POST /api/entity-descriptions/sync
   * Manually trigger a sync of all entity types from paperless.
   */
  router.post('/sync', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      await syncService.syncAll();
      res.json({ success: true });
    } catch (error) {
      logger.error({ error }, 'Failed to sync entity descriptions');
      next(error);
    }
  });

  return router;
}
