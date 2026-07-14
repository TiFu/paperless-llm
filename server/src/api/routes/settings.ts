import { Router, Request, Response, NextFunction } from 'express';
import { ApplicationServiceFactory } from '../../application/ApplicationServiceFactory.js';
import { createChildLogger } from '../../utils/logger.js';
import { LogArea } from '../../utils/LogArea.js';
import { SettingsController } from '../../web/SettingsController.js';
import { UpdateSettingsRequest } from '../../web/dtos/models/UpdateSettingsRequest.js';

export function createSettingsRouter(appFactory: ApplicationServiceFactory): Router {
  const settingsController = new SettingsController(appFactory);
  const logger = createChildLogger(LogArea.HTTP, 'settings-router');
  const router = Router();

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await settingsController.getSettings(req.user!);
      res.json(result);
    } catch (error) {
      logger.error({ error }, 'Failed to fetch settings');
      next(error);
    }
  });

  router.put('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body: UpdateSettingsRequest = req.body;
      const result = await settingsController.updateSettings(body, req.user!);
      res.json(result);
    } catch (error) {
      logger.error({ error }, 'Failed to update settings');
      next(error);
    }
  });

  return router;
}
