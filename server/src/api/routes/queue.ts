import { Router, Request, Response, NextFunction } from 'express';
import pino from 'pino';
import { TransactionManager } from '../../infrastructure/TransactionManager';
import { WorkItemStatus } from '../../domain/enums/WorkItemStatus';

export function createQueueRouter(txManager: TransactionManager, logger: pino.Logger): Router {
  const router = Router();

  /**
   * GET /api/queue/llm/stats
   * Get LLM queue statistics
   */
  router.get('/llm/stats', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await txManager.execute(async (repos) => {
        return await repos.getLLMWorkQueue().getQueueStats();
      });

      res.json(stats);
    } catch (error) {
      logger.error({ error }, 'Failed to fetch LLM queue stats');
      next(error);
    }
  });

  /**
   * GET /api/queue/llm/items
   * List LLM queue items with cursor-based pagination
   * Query params: limit (default 50, max 100), cursor (optional), status (optional)
   */
  router.get('/llm/items', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);
      const cursor = req.query.cursor as string | undefined;
      const status = req.query.status as WorkItemStatus | undefined;

      // Validate status if provided
      if (status && !Object.values(WorkItemStatus).includes(status)) {
        res.status(400).json({
          type: 'about:blank',
          title: 'Invalid Parameter',
          status: 400,
          detail: `Status must be one of: ${Object.values(WorkItemStatus).join(', ')}`,
        });
        return;
      }

      const result = await txManager.execute(async (repos) => {
        return await repos.getLLMWorkQueue().list(limit, cursor, status);
      });

      res.json({
        items: result.items.map((item) => ({
          id: item.id,
          documentId: item.documentId,
          jobType: item.jobType,
          status: item.status,
          retryCount: item.retryCount,
          retryAfter: item.retryAfter,
          claimedBy: item.claimedBy,
          claimedAt: item.claimedAt,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
        pagination: {
          limit,
          nextCursor: result.nextCursor,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch LLM queue items');
      next(error);
    }
  });

  /**
   * GET /api/queue/document-update/stats
   * Get document update queue statistics
   */
  router.get('/document-update/stats', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await txManager.execute(async (repos) => {
        return await repos.getDocumentUpdateQueue().getQueueStats();
      });

      res.json(stats);
    } catch (error) {
      logger.error({ error }, 'Failed to fetch document update queue stats');
      next(error);
    }
  });

  /**
   * GET /api/queue/document-update/items
   * List document update queue items with cursor-based pagination
   * Query params: limit (default 50, max 100), cursor (optional), status (optional)
   */
  router.get('/document-update/items', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);
      const cursor = req.query.cursor as string | undefined;
      const status = req.query.status as WorkItemStatus | undefined;

      // Validate status if provided
      if (status && !Object.values(WorkItemStatus).includes(status)) {
        res.status(400).json({
          type: 'about:blank',
          title: 'Invalid Parameter',
          status: 400,
          detail: `Status must be one of: ${Object.values(WorkItemStatus).join(', ')}`,
        });
        return;
      }

      const result = await txManager.execute(async (repos) => {
        return await repos.getDocumentUpdateQueue().list(limit, cursor, status);
      });

      res.json({
        items: result.items.map((item) => ({
          id: item.id,
          documentId: item.documentId,
          documentSystem: item.documentSystem,
          actionType: item.actionType,
          actionPayload: item.actionPayload,
          status: item.status,
          retryCount: item.retryCount,
          retryAfter: item.retryAfter,
          claimedBy: item.claimedBy,
          claimedAt: item.claimedAt,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
        pagination: {
          limit,
          nextCursor: result.nextCursor,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch document update queue items');
      next(error);
    }
  });

  return router;
}
