
import { Router, Request, Response, NextFunction } from 'express';
import { ApplicationServiceFactory } from '../../application/ApplicationServiceFactory.js';
import { createChildLogger } from '../../utils/logger.js';
import { StepController } from '../../web/StepController.js';

export function createStepsRouter(appServiceFactory: ApplicationServiceFactory): Router {
  const router = Router();
  const controller = new StepController(appServiceFactory);

  /**
   * POST /api/steps/:id/retry
   * Manually retry a step in RETRYING or IN_FALLOUT status
   */
  router.post('/:id/retry', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stepId = req.params.id;
      const result = await controller.retryStep(stepId);
      res.json(result);
    } catch (error) {
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
      const result = await controller.cancelStep(stepId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
