import { Request, Response, NextFunction } from 'express';
import pino from 'pino';

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly title: string,
    public readonly detail?: string,
    public readonly type: string = 'about:blank',
  ) {
    super(detail || title);
    this.name = 'ApiError';
  }
}

/**
 * Global error handler middleware that converts errors to RFC 7807 Problem Details format
 */
export function errorHandler(logger: pino.Logger) {
  return (err: Error, req: Request, res: Response, _next: NextFunction): void => {
    // Log the error
    logger.error(
      {
        error: err,
        path: req.path,
        method: req.method,
        body: req.body,
        response: res.json
      },
      'API error occurred',
    );

    // Handle known API errors
    if (err instanceof ApiError) {
      const problem: ProblemDetails = {
        type: err.type,
        title: err.title,
        status: err.status,
        detail: err.detail,
        instance: req.path,
      };

      res.status(err.status).json(problem);
      return;
    }

    // Handle validation errors from express-validator
    if (err.name === 'ValidationError') {
      const problem: ProblemDetails = {
        type: 'about:blank',
        title: 'Validation Error',
        status: 400,
        detail: err.message,
        instance: req.path,
      };

      res.status(400).json(problem);
      return;
    }

    // Handle unknown errors
    const problem: ProblemDetails = {
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An unexpected error occurred',
      instance: req.path,
    };

    res.status(500).json(problem);
  };
}
