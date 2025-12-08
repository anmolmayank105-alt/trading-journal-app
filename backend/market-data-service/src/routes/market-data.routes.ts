/**
 * Market Data Routes
 */

import { Router } from 'express';
import { marketDataController } from '../controllers';
import { authenticate } from '../middleware';

const router = Router();

// Public routes (no auth required for basic market data)
router.get('/search', marketDataController.searchSymbols.bind(marketDataController) as any);
router.get('/status/:exchange?', marketDataController.getMarketStatus.bind(marketDataController) as any);

// Protected routes
router.use(authenticate as any);

router.get('/quote/:symbol/:exchange?', marketDataController.getQuote.bind(marketDataController) as any);
router.post('/quotes', marketDataController.getQuotes.bind(marketDataController) as any);
router.get('/historical/:symbol/:exchange?', marketDataController.getHistoricalData.bind(marketDataController) as any);
router.get('/gainers/:exchange?', marketDataController.getTopGainers.bind(marketDataController) as any);
router.get('/losers/:exchange?', marketDataController.getTopLosers.bind(marketDataController) as any);
router.get('/ws/stats', marketDataController.getWsStats.bind(marketDataController) as any);

export default router;
