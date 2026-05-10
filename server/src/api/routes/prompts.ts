import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import pino from 'pino';
import { ApplicationServiceFactory } from '../../application/ApplicationServiceFactory.js';
import { validateRequest } from '../middleware/validation.js';
import { ApiError } from '../middleware/errorHandler.js';
import { StepType } from '../../domain/steps/IStep.js';
import { createChildLogger } from '../../utils/logger.js';


export function createPromptsRouter(appFactory: ApplicationServiceFactory): Router {
  const logger = createChildLogger({ name: "prompt-router"})
  const router = Router();

  /**
   * GET /api/prompts
   * List all prompts
   */
  router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const promptAppService = appFactory.createPromptApplicationService();
      const prompts = await promptAppService.getAllPrompts();

      res.json({
        prompts: prompts.map((p) => ({
          stepType: p.stepType,
          template: p.template,
          version: p.version,
          updatedAt: p.updatedAt,
        })),
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch prompts');
      next(error);
    }
  });

  /**
   * PUT /api/prompts/:stepType
   * Update or create a prompt for a specific step type
   */
  router.put(
    '/:stepType',
    [
      body('template')
        .isString()
        .notEmpty()
        .withMessage('template must be a non-empty string'),
    ],
    validateRequest,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { stepType } = req.params;
        const { template } = req.body;

        // Validate step type
        if (!Object.values(StepType).includes(stepType as StepType)) {
          throw new ApiError(
            400,
            'Invalid Step Type',
            `Step type must be one of: ${Object.values(StepType).join(', ')}`,
          );
        }

        const promptAppService = appFactory.createPromptApplicationService();
        const prompt = await promptAppService.upsertPrompt(stepType as StepType, template);

        logger.info({ stepType, version: prompt.version }, 'Prompt updated');

        res.json({
          stepType: prompt.stepType,
          template: prompt.template,
          version: prompt.version,
          updatedAt: prompt.updatedAt,
        });
      } catch (error) {
        logger.error({ error, stepType: req.params.stepType }, 'Failed to update prompt');
        next(error);
      }
    },
  );

  return router;
}
