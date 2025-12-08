/**
 * User Routes
 */

import { Router } from 'express';
import { userController } from '../controllers';
import { authenticate } from '../middleware';

const router = Router();

// ============= Protected Routes =============

// Get user profile
router.get('/profile', authenticate as any, userController.getProfile.bind(userController) as any);

// Update user profile
router.patch('/profile', authenticate as any, userController.updateProfile.bind(userController) as any);

// Delete account
router.delete('/account', authenticate as any, userController.deleteAccount.bind(userController) as any);

export default router;
