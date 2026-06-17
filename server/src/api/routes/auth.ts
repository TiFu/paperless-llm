import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../../web/AuthController.js';
import { AuthApplicationService } from '../../application/AuthApplicationService.js';
import { IPaperlessAuthService } from '../../domain/auth/IPaperlessAuthService.js';
import { IUsersRepository } from '../../domain/auth/IUsersRepository.js';
import { AuthConfig } from '../../config/AppConfig.js';
import { UoWFactory } from '../../infrastructure/UoW.js';
import { ApiError } from '../middleware/errorHandler.js';
import { createAuthMiddleware } from '../middleware/authenticate.js';

export function createAuthRouter(
  paperlessAuth: IPaperlessAuthService,
  usersRepo: IUsersRepository,
  uowFactory: UoWFactory,
  authConfig: AuthConfig,
): Router {
  const router = Router();
  const service = new AuthApplicationService(paperlessAuth, usersRepo, uowFactory, authConfig);
  const controller = new AuthController(service);
  const authMiddleware = createAuthMiddleware(authConfig.jwtSecret);

  router.post(
    '/login',
    [
      body('username').isString().notEmpty().withMessage('username is required'),
      body('password').isString().notEmpty().withMessage('password is required'),
    ],
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { username, password } = req.body;
        const result = await controller.login(username, password);
        res.json(result);
      } catch (error: any) {
        if (error?.message === 'Invalid Paperless credentials') {
          return next(new ApiError(401, 'Invalid credentials'));
        }
        next(error);
      }
    },
  );

  router.get('/me', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return next(new ApiError(401, 'Unauthorized'));
      res.json(controller.me(req.user));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
