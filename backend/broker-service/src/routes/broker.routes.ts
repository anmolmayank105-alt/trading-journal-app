/**
 * Broker Routes
 */

import { Router } from 'express';
import { brokerAccountController } from '../controllers';
import { authenticate } from '../middleware';

const router = Router();

// All routes require authentication
router.use(authenticate as any);

// Broker accounts
router.get('/', brokerAccountController.getAccounts.bind(brokerAccountController) as any);
router.get('/:accountId', brokerAccountController.getAccountById.bind(brokerAccountController) as any);
router.delete('/:accountId', brokerAccountController.disconnectAccount.bind(brokerAccountController) as any);

// OAuth
router.get('/:broker/login', brokerAccountController.getLoginUrl.bind(brokerAccountController) as any);
router.get('/:broker/callback', brokerAccountController.handleCallback.bind(brokerAccountController) as any);

// Sync
router.post('/:accountId/sync', brokerAccountController.syncTrades.bind(brokerAccountController) as any);
router.get('/:accountId/sync-logs', brokerAccountController.getSyncLogs.bind(brokerAccountController) as any);

// Live data
router.get('/:accountId/positions', brokerAccountController.getPositions.bind(brokerAccountController) as any);
router.get('/:accountId/holdings', brokerAccountController.getHoldings.bind(brokerAccountController) as any);

export default router;
