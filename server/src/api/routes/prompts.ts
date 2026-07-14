import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { ApplicationServiceFactory } from '../../application/ApplicationServiceFactory.js';
import { ApiError } from '../middleware/errorHandler.js';
import { createChildLogger } from '../../utils/logger.js';
import { LogArea } from '../../utils/LogArea.js';
import { PromptController } from '../../web/PromptController.js';
import { UpdatePromptRequest } from '../../web/dtos/models/UpdatePromptRequest.js';
import { StepType } from '../../web/dtos/models/StepType.js';


export function createPromptsRouter(appFactory: ApplicationServiceFactory): Router {
  const promptController = new PromptController(appFactory);
  const logger = createChildLogger(LogArea.HTTP, 'prompt-router');
  const router = Router();

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await promptController.listPrompts(req.user!);
      res.json(result);
    } catch (error) {
      logger.error({ error }, 'Failed to fetch prompts');
      next(error);
    }
  });

  router.put(
    '/:stepType',
    [
      body('template')
        .isString()
        .notEmpty()
        .withMessage('template must be a non-empty string'),
    ],
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { stepType } = req.params;
        const body: UpdatePromptRequest = req.body;

        if (!Object.values(StepType).includes(stepType as StepType)) {
          throw new ApiError(
            400,
            'Invalid Step Type',
            `Step type must be one of: ${Object.values(StepType).join(', ')}`,
          );
        }

        const result = await promptController.updatePrompt(stepType as StepType, body, req.user!);
        res.json(result);
      } catch (error) {
        logger.error({ error, stepType: req.params.stepType }, 'Failed to update prompt');
        next(error);
      }
    },
  );

  return router;
}
