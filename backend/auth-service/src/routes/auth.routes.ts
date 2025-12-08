/**
 * Auth Routes
 */

import { Router } from 'express';
import { authController } from '../controllers';
import { authenticate, authRateLimiter, registerRateLimiter } from '../middleware';

const router = Router();

// ============= Public Routes =============

// Register new user
router.post('/register', registerRateLimiter, authController.register.bind(authController));

// Login
router.post('/login', authRateLimiter, authController.login.bind(authController));

// Refresh token
router.post('/refresh', authController.refreshToken.bind(authController));

// Forgot password
router.post('/forgot-password', authRateLimiter, authController.forgotPassword.bind(authController));

// Reset password
router.post('/reset-password', authController.resetPassword.bind(authController));

// Verify email
router.get('/verify-email/:token', authController.verifyEmail.bind(authController));


// ============= Protected Routes =============

// Logout
router.post('/logout', authenticate as any, authController.logout.bind(authController) as any);

// Change password
router.post('/change-password', authenticate as any, authController.changePassword.bind(authController) as any);

// Get active sessions
router.get('/sessions', authenticate as any, authController.getSessions.bind(authController) as any);

// Revoke a session
router.delete('/sessions/:sessionId', authenticate as any, authController.revokeSession.bind(authController) as any);

export default router;
