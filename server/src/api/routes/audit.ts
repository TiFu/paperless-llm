import { Router, Request, Response, NextFunction } from 'express';
import { query } from 'express-validator';
import pino from 'pino';
import { TransactionManager } from '../../infrastructure/TransactionManager';
import { validateRequest } from '../middleware/validation';

export function createAuditRouter(txManager: TransactionManager, logger: pino.Logger): Router {
  const router = Router();

  /**
   * GET /api/audit
   * Get audit log entries with optional filters
   */
  router.get(
    '/',
    [
      query('documentId').optional().isString().withMessage('documentId must be a string'),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('limit must be between 1 and 100')
        .toInt(),
      query('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('offset must be >= 0')
        .toInt(),
    ],
    validateRequest,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { documentId, limit = 50, offset = 0 } = req.query;

        const entries = await txManager.execute(async (repos) => {
          const auditRepo = repos.getAuditLog();

          if (documentId) {
            return await auditRepo.getByDocumentId(documentId as string);
          } else {
            return await auditRepo.getAll(Number(limit), Number(offset));
          }
        });

        res.json({
          entries: entries.map((e) => ({
            id: e.id,
            documentId: e.documentId,
            documentSystem: e.documentSystem,
            jobType: e.jobType,
            actionType: e.actionType,
            beforeValue: e.beforeValue,
            afterValue: e.afterValue,
            status: e.status,
            errorMessage: e.errorMessage,
            createdAt: e.createdAt,
          })),
          pagination: {
            limit: Number(limit),
            offset: Number(offset),
            count: entries.length,
          },
        });
      } catch (error) {
        logger.error({ error }, 'Failed to fetch audit entries');
        next(error);
      }
    },
  );

  return router;
}
