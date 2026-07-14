import { Router, Request, Response, NextFunction } from 'express';
import { query, param } from 'express-validator';
import { UoWFactory } from '../../infrastructure/UoW.js';
import { ApiError } from '../middleware/errorHandler.js';
import { createChildLogger } from '../../utils/logger.js';
import { LogArea } from '../../utils/LogArea.js';

export function createWorkerExecutionsRouter(uowFactory: UoWFactory): Router {
  const logger = createChildLogger(LogArea.HTTP, 'worker-executions-router');
  const router = Router();

  /**
   * GET /api/worker-executions
   * Lists worker executions, most recent first, with optional filters.
   */
  router.get(
    '/',
    [
      query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100').toInt(),
      query('cursor').optional().isString().withMessage('cursor must be a string'),
      query('workerType').optional().isString().withMessage('workerType must be a string'),
      query('status').optional().isString().withMessage('status must be a string'),
    ],
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const limit = (req.query.limit as number | undefined) || 50;
        const cursor = req.query.cursor as string | undefined;
        const workerType = req.query.workerType as string | undefined;
        const status = req.query.status as string | undefined;

        await using uow = await uowFactory.createSystemUoW();
        await uow.start();
        const result = await uow.getWorkerExecutions().listExecutions(limit, cursor, workerType, status);
        await uow.commit();

        res.json({ executions: result.items, nextCursor: result.nextCursor });
      } catch (error) {
        logger.error({ error }, 'Failed to list worker executions');
        next(error);
      }
    },
  );

  /**
   * GET /api/worker-executions/:id
   * Returns a single execution with its associated items.
   */
  router.get(
    '/:id',
    [param('id').isString().notEmpty().withMessage('id must be a non-empty string')],
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await using uow = await uowFactory.createSystemUoW();
        await uow.start();
        const execution = await uow.getWorkerExecutions().getExecutionById(req.params.id);
        if (!execution) {
          throw new ApiError(404, 'Worker execution not found');
        }
        const items = await uow.getWorkerExecutions().listItemsForExecution(req.params.id);
        await uow.commit();

        res.json({ ...execution, items });
      } catch (error) {
        logger.error({ error, id: req.params.id }, 'Failed to fetch worker execution');
        next(error);
      }
    },
  );

  return router;
}
