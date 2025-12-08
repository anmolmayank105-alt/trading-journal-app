/**
 * Authentication Middleware for Broker Service
 */

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config';
import { AuthenticatedRequest, TokenPayload } from '@stock-tracker/shared/types';
import { logger } from '@stock-tracker/shared/utils';

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_001',
          message: 'Access token is required',
        },
      });
      return;
    }
    
    const token = authHeader.substring(7);
    
    try {
      const payload = jwt.verify(token, jwtConfig.accessSecret, {
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      }) as TokenPayload;
      
      req.user = payload;
      next();
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_002',
            message: 'Access token expired',
          },
        });
        return;
      }
      
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_003',
          message: 'Invalid access token',
        },
      });
    }
  } catch (error) {
    logger.error({ error }, 'Authentication error');
    res.status(500).json({
      success: false,
      error: {
        code: 'SRV_001',
        message: 'Authentication failed',
      },
    });
  }
};
