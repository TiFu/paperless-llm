import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import pino from 'pino';
import { TransactionManager } from '../../infrastructure/TransactionManager';
import { validateRequest } from '../middleware/validation';
import { ApiError } from '../middleware/errorHandler';
import { JobStatus } from '../../domain/enums/JobStatus';

export function createApprovalsRouter(
  txManager: TransactionManager,
  logger: pino.Logger,
): Router {
  const router = Router();

  /**
   * GET /api/approvals
   * List pending approval items
   */
  router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await txManager.execute(async (repos) => {
        return repos.getApprovalQueue().getPending();
      });

      res.json({ items });
    } catch (error) {
      logger.error({ error }, 'Failed to list pending approvals');
      next(error);
    }
  });

  /**
   * GET /api/approvals/:id
   * Get a specific approval item
   */
  router.get(
    '/:id',
    [param('id').isInt({ min: 1 }).withMessage('id must be a positive integer')],
    validateRequest,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const item = await txManager.execute(async (repos) => {
          return repos.getApprovalQueue().getById(req.params.id);
        });

        if (!item) {
          throw new ApiError(404, 'Approval item not found');
        }

        res.json(item);
      } catch (error) {
        logger.error({ error, id: req.params.id }, 'Failed to get approval item');
        next(error);
      }
    },
  );

  /**
   * POST /api/approvals/:id/approve
   * Approve an item and move it to document update queue
   */
  router.post(
    '/:id/approve',
    [
      param('id').isInt({ min: 1 }).withMessage('id must be a positive integer'),
      body('reviewedBy').isString().notEmpty().withMessage('reviewedBy is required'),
    ],
    validateRequest,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { reviewedBy } = req.body;
        const approvalId = req.params.id;

        await txManager.execute(async (repos) => {
          // Get the approval item
          const approvalItem = await repos.getApprovalQueue().getById(approvalId);
          
          if (!approvalItem) {
            throw new ApiError(404, 'Approval item not found');
          }

          if (approvalItem.status !== 'pending') {
            throw new ApiError(400, `Cannot approve item with status: ${approvalItem.status}`);
          }

          // Mark as approved
          await repos.getApprovalQueue().markApproved(approvalId, reviewedBy);

          // Move to document update queue with job_id for tracking
          await repos.getDocumentUpdateQueue().insert(
            approvalItem.documentId,
            approvalItem.documentSystem,
            approvalItem.actionType,
            approvalItem.actionPayload,
            approvalItem.jobId, // Pass job ID for end-to-end tracking
          );
          
          // Update job status to updating_document
          await repos.getJobs().updateStatus(approvalItem.jobId, JobStatus.UPDATING_DOCUMENT);

          // Log success in audit log
          await repos.getAuditLog().insert(
            approvalItem.documentId,
            approvalItem.jobId,
            approvalItem.actionType,
            null, // No before value for approvals
            approvalItem.actionPayload,
            'success',
            null,
          );
        });

        logger.info({ approvalId, reviewedBy }, 'Approval item approved');
        res.json({ success: true, message: 'Item approved and queued for update' });
      } catch (error) {
        logger.error({ error, id: req.params.id }, 'Failed to approve item');
        next(error);
      }
    },
  );

  /**
   * POST /api/approvals/:id/reject
   * Reject an item
   */
  router.post(
    '/:id/reject',
    [
      param('id').isInt({ min: 1 }).withMessage('id must be a positive integer'),
      body('reviewedBy').isString().notEmpty().withMessage('reviewedBy is required'),
      body('reason').isString().notEmpty().withMessage('reason is required'),
    ],
    validateRequest,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { reviewedBy, reason } = req.body;
        const approvalId = req.params.id;

        await txManager.execute(async (repos) => {
          // Get the approval item
          const approvalItem = await repos.getApprovalQueue().getById(approvalId);
          
          if (!approvalItem) {
            throw new ApiError(404, 'Approval item not found');
          }

          if (approvalItem.status !== 'pending') {
            throw new ApiError(400, `Cannot reject item with status: ${approvalItem.status}`);
          }
          
          // Update job status to rejected
          await repos.getJobs().updateStatus(approvalItem.jobId, JobStatus.REJECTED, reason);

          // Mark as rejected
          await repos.getApprovalQueue().markRejected(approvalId, reviewedBy, reason);

          // Log failure in audit log
          await repos.getAuditLog().insert(
            approvalItem.documentId,
            approvalItem.jobId,
            approvalItem.actionType,
            null,
            approvalItem.actionPayload,
            'failed',
            `Rejected by ${reviewedBy}: ${reason}`,
          );
        });

        logger.info({ approvalId, reviewedBy, reason }, 'Approval item rejected');
        res.json({ success: true, message: 'Item rejected' });
      } catch (error) {
        logger.error({ error, id: req.params.id }, 'Failed to reject item');
        next(error);
      }
    },
  );

  return router;
}
