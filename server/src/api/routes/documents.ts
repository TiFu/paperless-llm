import { Router, Request, Response, NextFunction } from 'express';
import pino from 'pino';
import { PaperlessService } from '../../services/PaperlessService.js';
import { TransactionManager } from '../../infrastructure/TransactionManager.js';
import { ApiError } from '../middleware/errorHandler.js';
import { createChildLogger } from '../../utils/logger.js';

export function createDocumentsRouter(
  paperlessService: PaperlessService,
  txManager: TransactionManager,
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
      let inProgressIds: string[] = [];
      if (documentIds.length > 0) {
        await using context = await txManager.createContext();
        await context.start();
        const repos = context.getRepositoryRegistry();
        inProgressIds = await repos.getJobs().filterInProgressDocuments(documentIds);
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

  return router;
}
