/**
 * Auth Controller
 */

import { Request, Response, NextFunction } from 'express';
import { authService } from '../services';
import { UserModel } from '../models';
import jwt from 'jsonwebtoken';
import {
  validate,
  schemas,
  verifyPassword,
} from '../../../shared/dist/utils';
import { AuthenticatedRequest } from '../../../shared/dist/types';

export class AuthController {
  
  // ============= Register =============
  
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = validate(schemas.register, req.body);
      
      const result = await authService.register(dto);
      
      res.status(201).json({
        success: true,
        message: 'Registration successful. Please verify your email.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ============= Login =============
  
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = validate(schemas.login, req.body);
      const ip = req.ip || req.socket.remoteAddress || '';
      const userAgent = req.get('User-Agent') || '';
      
      // Use auth service for proper login with security features
      const result = await authService.login(dto, ip, userAgent);
      
      res.json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ============= Refresh Token =============
  
  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: { code: 'VAL_001', message: 'Refresh token is required' },
        });
        return;
      }
      
      const tokens = await authService.refreshTokens(refreshToken);
      
      res.json({
        success: true,
        data: tokens,
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ============= Logout =============
  
  async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const sessionId = req.user?.sessionId;
      const { allDevices } = req.body;
      
      if (userId) {
        await authService.logout(userId, sessionId, allDevices === true);
      }
      
      res.json({
        success: true,
        message: allDevices ? 'Logged out from all devices' : 'Logout successful',
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ============= Change Password =============
  
  async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'AUTH_001', message: 'Unauthorized' },
        });
        return;
      }
      
      const dto = validate(schemas.changePassword, req.body);
      
      await authService.changePassword(userId, dto);
      
      res.json({
        success: true,
        message: 'Password changed successfully. Please login again.',
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ============= Forgot Password =============
  
  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = validate(schemas.forgotPassword, req.body);
      
      await authService.requestPasswordReset(dto.email);
      
      res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.',
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ============= Reset Password =============
  
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = validate(schemas.resetPassword, req.body);
      
      await authService.resetPassword(dto.token, dto.password);
      
      res.json({
        success: true,
        message: 'Password reset successful. Please login with your new password.',
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ============= Verify Email =============
  
  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;
      
      if (!token) {
        res.status(400).json({
          success: false,
          error: { code: 'VAL_001', message: 'Verification token is required' },
        });
        return;
      }
      
      await authService.verifyEmail(token);
      
      res.json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ============= Get Sessions =============
  
  async getSessions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'AUTH_001', message: 'Unauthorized' },
        });
        return;
      }
      
      const sessions = await authService.getActiveSessions(userId);
      
      res.json({
        success: true,
        data: sessions,
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ============= Revoke Session =============
  
  async revokeSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { sessionId } = req.params;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'AUTH_001', message: 'Unauthorized' },
        });
        return;
      }
      
      await authService.revokeSession(userId, sessionId);
      
      res.json({
        success: true,
        message: 'Session revoked successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
