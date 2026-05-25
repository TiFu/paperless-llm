import { Router, Request, Response, NextFunction } from 'express';
import pino from 'pino';
import { PaperlessService } from '../../services/PaperlessService.js';
import { ApiError } from '../middleware/errorHandler.js';
import { createChildLogger } from '../../utils/logger.js';
import { UoWFactory } from '../../infrastructure/UoW.js';
import { IDocumentManagementSystem } from '../../domain/document/IDocumentManagementSystem.js';

export function createDocumentsRouter(
  paperlessService: IDocumentManagementSystem,
  uowFactory: UoWFactory,
): Router {
  const logger = createChildLogger({ name: "document-router"})

  const router = Router();

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

      // 1. Fetch paginated documents from Paperless
      const paginatedResult = await paperlessService.getDocumentsByTag(tag, limit, cursor);

      // 2. Extract document IDs
      const documentIds = paginatedResult.documents.map(doc => doc.id);

      // 3. Query database to find which documents have jobs in progress
      let inProgressIds: number[] = [];
      if (documentIds.length > 0) {
        await using context = await uowFactory.createUoW();
        await context.start();
        inProgressIds = await context.getJobs().filterInProgressDocuments(documentIds);
      }

      // 4. Filter out documents that are currently being processed
      const availableDocuments = paginatedResult.documents.filter(
        doc => !inProgressIds.includes(doc.id)
      );

      res.json({
        documents: availableDocuments,
        pagination: {
          limit,
          nextCursor: paginatedResult.nextCursor,
        },
      });
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
      const tags = await paperlessService.getTags();
      res.json({ tags });
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
      const correspondents = await paperlessService.getCorrespondents();
      res.json({ correspondents });
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
      const documentTypes = await paperlessService.getDocumentTypes();
      res.json({ documentTypes });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch document types');
      next(error);
    }
  });

  return router;
}
