import { Router, Request, Response, NextFunction } from 'express';
import { ApplicationServiceFactory } from '../../application/ApplicationServiceFactory.js';
import { createChildLogger } from '../../utils/logger.js';


export function createStepsRouter(appServiceFactory: ApplicationServiceFactory): Router {
    const logger = createChildLogger({ service: 'steps-route' });
    const router = Router();

  /**
   * POST /api/steps/:id/retry
   * Manually retry a step in RETRYING or IN_FALLOUT status
   */
  router.post('/:id/retry', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stepId = req.params.id;

      logger.info({ stepId }, 'Manual retry requested');

      const stepRetryService = appServiceFactory.createStepRetryApplicationService();
      await stepRetryService.retryStep(stepId);

      res.json({ 
        success: true,
        message: `Step ${stepId} has been reset and will be retried`
      });
    } catch (error) {
      logger.error({ error }, 'Failed to retry step');
      next(error);
    }
  });

  /**
   * POST /api/steps/:id/cancel
   * Cancel a step in RETRYING or IN_FALLOUT status, permanently marking it as FAILED
   */
  router.post('/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stepId = req.params.id;

      logger.info({ stepId }, 'Manual cancel requested');

      const stepCancelService = appServiceFactory.createStepCancelApplicationService();
      await stepCancelService.cancelStep(stepId);

      res.json({ 
        success: true,
        message: `Step ${stepId} has been cancelled and marked as failed`
      });
    } catch (error) {
      logger.error({ error }, 'Failed to cancel step');
      next(error);
    }
  });

  return router;
}
