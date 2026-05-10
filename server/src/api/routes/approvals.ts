import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import pino from 'pino';
import { ApplicationServiceFactory } from '../../application/ApplicationServiceFactory';
import { validateRequest } from '../middleware/validation';
import { ApiError } from '../middleware/errorHandler';
import { decodeCursor } from '../../domain/common/Cursor';

export function createApprovalsRouter(
  appFactory: ApplicationServiceFactory,
  logger: pino.Logger,
): Router {
  const router = Router();

  /**
   * GET /api/approvals
   * List all pending approval items with full context
   * Query params:
   *   - limit: Maximum number of items to return (default: 50)
   *   - cursor: Base64-encoded cursor for pagination (optional)
   */
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const cursorParam = req.query.cursor as string | undefined;
      
      // Decode cursor if provided
      let cursor = undefined;
      if (cursorParam) {
        cursor = decodeCursor(cursorParam);
        if (!cursor) {
          throw new ApiError(400, 'Invalid cursor parameter');
        }
      }
      
      const approvalAppService = appFactory.createApprovalApplicationService();
      const result = await approvalAppService.listPendingApprovals(limit, cursor);

      res.json(result);
    } catch (error) {
      logger.error({ error }, 'Failed to list pending approvals');
      next(error);
    }
  });

  /**
   * POST /api/approvals/:stepId
   * Make a decision on an approval item
   * Body: { decision: string } - must be one of the possibleDecisions for the step
   */
  router.post(
    '/:stepId',
    [
      param('stepId').isUUID().withMessage('stepId must be a valid UUID'),
      body('decision').isString().notEmpty().withMessage('decision is required'),
    ],
    validateRequest,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { stepId } = req.params;
        const { decision } = req.body;

        const approvalAppService = appFactory.createApprovalApplicationService();
        await approvalAppService.processApprovalDecision(stepId, decision);

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
