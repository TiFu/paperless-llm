import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserContext } from '../../domain/auth/UserContext.js';
import { ApiError } from './errorHandler.js';

declare global {
  namespace Express {
    interface Request {
      user?: UserContext;
    }
  }
}

export function createAuthMiddleware(jwtSecret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return next(new ApiError(401, 'Missing or invalid Authorization header'));
    }

    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, jwtSecret) as { username: string };
      req.user = { username: payload.username };
      next();
    } catch {
      next(new ApiError(401, 'Invalid or expired token'));
    }
  };
}
