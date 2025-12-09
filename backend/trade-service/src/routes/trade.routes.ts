/**
 * Trade Routes
 */

import { Router } from 'express';
import { tradeController } from '../controllers';
import { authenticate } from '../middleware';

const router = Router();

// All routes require authentication
router.use(authenticate as any);

// Trade CRUD routes
router.post('/', tradeController.createTrade.bind(tradeController) as any);
router.get('/', tradeController.getUserTrades.bind(tradeController) as any);
router.get('/open', tradeController.getOpenTrades.bind(tradeController) as any);
router.get('/summary', tradeController.getTradeSummary.bind(tradeController) as any);
router.get('/statistics', tradeController.getTradeStatistics.bind(tradeController) as any);
router.get('/symbols', tradeController.getUniqueSymbols.bind(tradeController) as any);

// Analytics routes
router.get('/analytics/strategy', tradeController.getStrategyAnalytics.bind(tradeController) as any);
router.get('/analytics/mistakes', tradeController.getMistakeAnalytics.bind(tradeController) as any);

router.get('/:tradeId', tradeController.getTradeById.bind(tradeController) as any);
router.put('/:tradeId', tradeController.updateTrade.bind(tradeController) as any);
router.delete('/:tradeId', tradeController.deleteTrade.bind(tradeController) as any);

// Trade actions
router.post('/:tradeId/exit', tradeController.exitTrade.bind(tradeController) as any);
router.post('/:tradeId/cancel', tradeController.cancelTrade.bind(tradeController) as any);

// Bulk operations
router.post('/bulk', tradeController.bulkCreateTrades.bind(tradeController) as any);

export default router;
