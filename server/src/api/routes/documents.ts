import { Router, Request, Response, NextFunction } from 'express';
import { ApplicationServiceFactory } from '../../application/ApplicationServiceFactory.js';
import { ApiError } from '../middleware/errorHandler.js';
import { createChildLogger } from '../../utils/logger.js';
import { DocumentController } from '../../web/DocumentController.js';
import { EntityValueType } from '../../application/DocumentApplicationService.js';

export function createDocumentsRouter(appFactory: ApplicationServiceFactory): Router {
  const logger = createChildLogger({ name: "document-router" })
  const router = Router();
  const controller = new DocumentController(appFactory);

  /**
   * GET /api/documents
   * List documents by tag with pagination
   * Query params:
   *   - tag (required)
   *   - limit (optional, default 50, must be 10, 50, or 100)
   *   - cursor (optional, for pagination)
   */
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tag = req.query.tag as string;
      const limitStr = req.query.limit as string | undefined;
      const cursor = req.query.cursor as string | undefined;

      if (!tag) {
        throw new ApiError(400, 'Missing Parameter', 'Query parameter "tag" is required');
      }

      // Validate and parse limit
      const allowedLimits = [10, 50, 100];
      let limit = 50; // default

      if (limitStr) {
        const parsedLimit = parseInt(limitStr, 10);
        if (isNaN(parsedLimit) || !allowedLimits.includes(parsedLimit)) {
          throw new ApiError(
            400,
            'Invalid Parameter',
            'Query parameter "limit" must be 10, 50, or 100'
          );
        }
        limit = parsedLimit;
      }

      const result = await controller.listDocuments(req.user!, tag, limit, cursor);
      res.json(result);
    } catch (error) {
      logger.error({ error, tag: req.query.tag }, 'Failed to fetch documents');
      next(error);
    }
  });

  /**
   * GET /api/documents/tags
   * Get all available tags
   */
  router.get('/tags', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controller.getTags(req.user!);
      res.json(result);
    } catch (error) {
      logger.error({ error }, 'Failed to fetch tags');
      next(error);
    }
  });

  /**
   * GET /api/documents/correspondents
   * Get all available correspondents
   */
  router.get('/correspondents', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controller.getCorrespondents(req.user!);
      res.json(result);
    } catch (error) {
      logger.error({ error }, 'Failed to fetch correspondents');
      next(error);
    }
  });

  /**
   * GET /api/documents/document-types
   * Get all available document types
   */
  router.get('/document-types', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controller.getDocumentTypes(req.user!);
      res.json(result);
    } catch (error) {
      logger.error({ error }, 'Failed to fetch document types');
      next(error);
    }
  });

  const VALID_ENTITY_TYPES: EntityValueType[] = ['tag', 'correspondent', 'document_type'];

  /**
   * GET /api/documents/entity-values/:type
   * Generic endpoint returning id/name pairs for a given entity type.
   * type must be one of: tag, correspondent, document_type
   */
  router.get('/entity-values/:type', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.params;
      if (!VALID_ENTITY_TYPES.includes(type as EntityValueType)) {
        throw new ApiError(400, 'Invalid entity type', `type must be one of: ${VALID_ENTITY_TYPES.join(', ')}`);
      }

      const result = await controller.getEntityValues(req.user!, type as EntityValueType);
      res.json(result);
    } catch (error) {
      logger.error({ error, type: req.params.type }, 'Failed to fetch entity values');
      next(error);
    }
  });

  return router;
}
