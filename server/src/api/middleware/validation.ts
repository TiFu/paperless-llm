import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ApiError } from './errorHandler.js';

/**
 * Middleware to check validation results from express-validator
 * Throws ApiError if validation fails
 */
export function validateRequest(req: Request, _res: Response, next: NextFunction): void {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors
      .array()
      .map((err) => `${err.type === 'field' ? err.path : 'unknown'}: ${err.msg}`)
      .join(', ');

    throw new ApiError(400, 'Validation Error', errorMessages);
  }

  next();
}
