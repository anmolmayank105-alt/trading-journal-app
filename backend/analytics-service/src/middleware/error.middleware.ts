/**
 * Error Handler Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '@stock-tracker/shared/utils';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error({
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  }, 'Unhandled error');

  res.status(500).json({
    success: false,
    error: {
      code: 'SRV_001',
      message: 'Internal server error',
    },
  });
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
};
