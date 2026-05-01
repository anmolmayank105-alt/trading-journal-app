/**
 * User Controller
 */

import { Response, NextFunction } from 'express';
import { userService } from '../services';
import { AuthenticatedRequest } from '@stock-tracker/shared/types';

export class UserController {
  
  // ============= Get Profile =============
  
  async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'AUTH_001', message: 'Unauthorized' },
        });
        return;
      }
      
      const profile = await userService.getProfile(userId);
      
      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ============= Update Profile =============
  
  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'AUTH_001', message: 'Unauthorized' },
        });
        return;
      }
      
      const profile = await userService.updateProfile(userId, req.body);
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ============= Delete Account =============
  
  async deleteAccount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'AUTH_001', message: 'Unauthorized' },
        });
        return;
      }
      
      await userService.deleteAccount(userId);
      
      res.json({
        success: true,
        message: 'Account deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
