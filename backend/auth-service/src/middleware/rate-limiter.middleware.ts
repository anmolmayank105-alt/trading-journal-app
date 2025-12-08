/**
 * Rate Limiter Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '@stock-tracker/shared/utils';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

// In-memory store (use Redis in production)
const requestStore = new Map<string, RequestRecord>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestStore.entries()) {
    if (record.resetTime < now) {
      requestStore.delete(key);
    }
  }
}, 60000); // Clean every minute

export const createRateLimiter = (options: RateLimitOptions) => {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later.',
  } = options;
  
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    
    let record = requestStore.get(key);
    
    if (!record || record.resetTime < now) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      requestStore.set(key, record);
      next();
      return;
    }
    
    record.count++;
    
    if (record.count > maxRequests) {
      logger.warn('Rate limit exceeded', { ip: req.ip, path: req.path });
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT',
          message,
          retryAfter: Math.ceil((record.resetTime - now) / 1000),
        },
      });
      return;
    }
    
    next();
  };
};

// Pre-configured rate limiters
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: process.env.NODE_ENV === 'development' ? 100 : 10,
  message: 'Too many login attempts, please try again in 15 minutes.',
});

export const registerRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: process.env.NODE_ENV === 'development' ? 100 : 5,
  message: 'Too many registration attempts, please try again later.',
});

export const generalRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
});
