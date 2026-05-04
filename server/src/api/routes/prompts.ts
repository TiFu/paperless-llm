import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import pino from 'pino';
import { TransactionManager } from '../../infrastructure/TransactionManager';
import { validateRequest } from '../middleware/validation';
import { ApiError } from '../middleware/errorHandler';
import { WorkflowType } from '../../domain/workflows/WorkflowType';

export function createPromptsRouter(txManager: TransactionManager, logger: pino.Logger): Router {
  const router = Router();

  /**
   * GET /api/prompts
   * List all prompts
   */
  router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const prompts = await txManager.execute(async (repos) => {
        const promptRepo = repos.getPrompts();
        
        // Fetch prompts for all job types
        const promptPromises = Object.values(WorkflowType).map((jobType) =>
          promptRepo.getByJobType(jobType),
        );
        
        const results = await Promise.all(promptPromises);
        return results.filter(Boolean);
      });

      res.json({
        prompts: prompts.filter((p) => p != null).map((p) => ({
          jobType: p.jobType,
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
   * PUT /api/prompts/:jobType
   * Update or create a prompt for a specific job type
   */
  router.put(
    '/:jobType',
    [
      body('template')
        .isString()
        .notEmpty()
        .withMessage('template must be a non-empty string'),
    ],
    validateRequest,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { jobType } = req.params;
        const { template } = req.body;

        // Validate job type
        if (!Object.values(WorkflowType).includes(jobType as WorkflowType)) {
          throw new ApiError(
            400,
            'Invalid Job Type',
            `Job type must be one of: ${Object.values(WorkflowType).join(', ')}`,
          );
        }

        const prompt = await txManager.execute(async (repos) => {
          const promptRepo = repos.getPrompts();
          return await promptRepo.upsert(jobType as WorkflowType, template);
        });

        logger.info({ jobType, version: prompt.version }, 'Prompt updated');

        res.json({
          jobType: prompt.jobType,
          template: prompt.template,
          version: prompt.version,
          updatedAt: prompt.updatedAt,
        });
      } catch (error) {
        logger.error({ error, jobType: req.params.jobType }, 'Failed to update prompt');
        next(error);
      }
    },
  );

  return router;
}
