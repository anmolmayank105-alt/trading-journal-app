/**
 * Auth Middleware
 */

import { Response, NextFunction } from 'express';
import { authService } from '../services';
import { AuthenticatedRequest, UserRole } from '@stock-tracker/shared/types';
import { logger } from '@stock-tracker/shared/utils';

// ============= Authenticate =============

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_001', message: 'No token provided' },
      });
      return;
    }
    
    const token = authHeader.substring(7);
    const payload = authService.validateAccessToken(token);
    
    req.user = payload;
    next();
  } catch (error) {
    logger.error('Authentication failed', { error });
    res.status(401).json({
      success: false,
      error: { code: 'AUTH_002', message: 'Invalid or expired token' },
    });
  }
};

// ============= Optional Auth =============

export const optionalAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = authService.validateAccessToken(token);
      req.user = payload;
    }
    
    next();
  } catch (error) {
    // Continue without user for optional auth
    next();
  }
};

// ============= Require Role =============

export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_001', message: 'Unauthorized' },
      });
      return;
    }
    
    if (!req.user.roles.some(r => roles.includes(r))) {
      res.status(403).json({
        success: false,
        error: { code: 'AUTH_003', message: 'Insufficient permissions' },
      });
      return;
    }
    
    next();
  };
};

// ============= Require Admin =============

export const requireAdmin = requireRole('admin' as UserRole);

// ============= Require Premium =============

export const requirePremium = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: { code: 'AUTH_001', message: 'Unauthorized' },
    });
    return;
  }
  
  if (!req.user.roles.includes('admin' as UserRole) && !req.user.roles.includes('premium' as UserRole)) {
    res.status(403).json({
      success: false,
      error: { code: 'AUTH_004', message: 'Premium subscription required' },
    });
    return;
  }
  
  next();
};
