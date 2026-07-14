import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { ApplicationServiceFactory } from '../../application/ApplicationServiceFactory.js';
import { ApiError } from '../middleware/errorHandler.js';
import { decodeCursor } from '../../domain/common/Cursor.js';
import { createChildLogger } from '../../utils/logger.js';
import { LogArea } from '../../utils/LogArea.js';



export function createApprovalsRouter(
  appFactory: ApplicationServiceFactory,
): Router {
  const logger = createChildLogger(LogArea.HTTP, 'approvals-router');
  const router = Router();

  router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const approvalAppService = appFactory.createApprovalApplicationService();
      const stats = await approvalAppService.getApprovalStats(req.user!);
      res.json(stats);
    } catch (error) {
      logger.error({ error }, 'Failed to get approval stats');
      next(error);
    }
  });

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const cursorParam = req.query.cursor as string | undefined;

      let cursor = undefined;
      if (cursorParam) {
        cursor = decodeCursor(cursorParam);
        if (!cursor) {
          throw new ApiError(400, 'Invalid cursor parameter');
        }
      }

      const approvalAppService = appFactory.createApprovalApplicationService();
      const result = await approvalAppService.listPendingApprovals(req.user!, limit, cursor);
      res.json(result);
    } catch (error) {
      logger.error({ error }, 'Failed to list pending approvals');
      next(error);
    }
  });

  router.post(
    '/:stepId',
    [
      param('stepId').isUUID().withMessage('stepId must be a valid UUID'),
      body('decision').isString().notEmpty().withMessage('decision is required'),
    ],
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { stepId } = req.params;
        const { decision, actions } = req.body;

        const approvalAppService = appFactory.createApprovalApplicationService();
        await approvalAppService.processApprovalDecision(stepId, decision, req.user!, actions);

        logger.info({ stepId, decision }, 'Approval decision processed');
        res.json({ success: true, message: 'Decision processed' });
      } catch (error) {
        logger.error({ error, stepId: req.params.stepId }, 'Failed to process approval decision');
        next(error);
      }
    },
  );

  return router;
}
