import { Router, Request, Response, NextFunction } from 'express';
import pino from 'pino';
import { PaperlessService } from '../../services/PaperlessService.js';
import { ApiError } from '../middleware/errorHandler.js';

export function createDocumentsRouter(
  paperlessService: PaperlessService,
  logger: pino.Logger,
): Router {
  const router = Router();

  /**
   * GET /api/documents
   * List documents by tag
   * Query params: tag (required)
   */
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tag = req.query.tag as string;

      if (!tag) {
        throw new ApiError(400, 'Missing Parameter', 'Query parameter "tag" is required');
      }

      const documents = await paperlessService.getDocumentsByTag(tag);

      res.json({
        documents: documents,
      });
    } catch (error) {
      logger.error({ error, tag: req.query.tag }, 'Failed to fetch documents');
      next(error);
    }
  });

  return router;
}
