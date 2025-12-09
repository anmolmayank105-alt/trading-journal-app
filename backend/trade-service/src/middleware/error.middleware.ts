/**
 * Error Handling Middleware
 */

import { Request, Response, NextFunction } from 'express';
import {
  AppError,
  ValidationError,
  NotFoundError,
  logger,
} from '../../../shared/dist/utils';
import { ZodError } from 'zod';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log error
  logger.error({
    err,
    method: req.method,
    url: req.url,
    body: req.body,
  }, 'Request error');
  
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VAL_001',
        message: 'Validation failed',
        details: err.issues.map((e) => ({
          field: String(e.path.join('.')),
          message: e.message,
        })),
      },
    });
    return;
  }
  
  // Handle custom application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    });
    return;
  }
  
  // Handle MongoDB duplicate key error
  if ((err as any).code === 11000) {
    res.status(409).json({
      success: false,
      error: {
        code: 'DUP_001',
        message: 'Duplicate entry',
      },
    });
    return;
  }
  
  // Handle MongoDB validation error
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: {
        code: 'VAL_001',
        message: err.message,
      },
    });
    return;
  }
  
  // Handle MongoDB CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      error: {
        code: 'VAL_002',
        message: 'Invalid ID format',
      },
    });
    return;
  }
  
  // Default server error
  res.status(500).json({
    success: false,
    error: {
      code: 'SRV_001',
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message,
    },
  });
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
};
