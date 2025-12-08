/**
 * Market Data Controller
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '@stock-tracker/shared/types';
import { marketDataService, webSocketService } from '../services';
import { logger } from '@stock-tracker/shared/utils';

class MarketDataController {
  /**
   * Get quote for a symbol
   */
  async getQuote(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { symbol, exchange } = req.params;

      if (!symbol) {
        res.status(400).json({
          success: false,
          error: { code: 'VAL_001', message: 'Symbol is required' },
        });
        return;
      }

      const quote = await marketDataService.getQuote(symbol, exchange || 'NSE');

      res.json({
        success: true,
        data: quote,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error getting quote');
      res.status(500).json({
        success: false,
        error: { code: 'SRV_001', message: 'Failed to get quote' },
      });
    }
  }

  /**
   * Get quotes for multiple symbols
   */
  async getQuotes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { symbols } = req.body;

      if (!symbols || !Array.isArray(symbols)) {
        res.status(400).json({
          success: false,
          error: { code: 'VAL_001', message: 'Symbols array is required' },
        });
        return;
      }

      const quotes = await marketDataService.getQuotes(symbols);

      res.json({
        success: true,
        data: quotes,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error getting quotes');
      res.status(500).json({
        success: false,
        error: { code: 'SRV_001', message: 'Failed to get quotes' },
      });
    }
  }

  /**
   * Get market status
   */
  async getMarketStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { exchange } = req.params;
      const status = await marketDataService.getMarketStatus(exchange || 'NSE');

      res.json({
        success: true,
        data: status,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error getting market status');
      res.status(500).json({
        success: false,
        error: { code: 'SRV_001', message: 'Failed to get market status' },
      });
    }
  }

  /**
   * Get historical data
   */
  async getHistoricalData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { symbol, exchange } = req.params;
      const { interval, from, to } = req.query;

      if (!symbol || !interval || !from || !to) {
        res.status(400).json({
          success: false,
          error: { code: 'VAL_001', message: 'Symbol, interval, from, and to are required' },
        });
        return;
      }

      const validIntervals = ['1m', '5m', '15m', '30m', '1h', '1d', '1w', '1M'];
      if (!validIntervals.includes(interval as string)) {
        res.status(400).json({
          success: false,
          error: { code: 'VAL_001', message: 'Invalid interval' },
        });
        return;
      }

      const data = await marketDataService.getHistoricalData(
        symbol,
        exchange || 'NSE',
        interval as any,
        new Date(from as string),
        new Date(to as string)
      );

      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error getting historical data');
      res.status(500).json({
        success: false,
        error: { code: 'SRV_001', message: 'Failed to get historical data' },
      });
    }
  }

  /**
   * Search symbols
   */
  async searchSymbols(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { q } = req.query;

      if (!q || typeof q !== 'string') {
        res.status(400).json({
          success: false,
          error: { code: 'VAL_001', message: 'Search query is required' },
        });
        return;
      }

      const results = await marketDataService.searchSymbols(q);

      res.json({
        success: true,
        data: results,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error searching symbols');
      res.status(500).json({
        success: false,
        error: { code: 'SRV_001', message: 'Failed to search symbols' },
      });
    }
  }

  /**
   * Get top gainers
   */
  async getTopGainers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { exchange } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      const gainers = await marketDataService.getTopGainers(exchange || 'NSE', limit);

      res.json({
        success: true,
        data: gainers,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error getting top gainers');
      res.status(500).json({
        success: false,
        error: { code: 'SRV_001', message: 'Failed to get top gainers' },
      });
    }
  }

  /**
   * Get top losers
   */
  async getTopLosers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { exchange } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      const losers = await marketDataService.getTopLosers(exchange || 'NSE', limit);

      res.json({
        success: true,
        data: losers,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error getting top losers');
      res.status(500).json({
        success: false,
        error: { code: 'SRV_001', message: 'Failed to get top losers' },
      });
    }
  }

  /**
   * Get WebSocket stats
   */
  async getWsStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const stats = webSocketService.getStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error getting WebSocket stats');
      res.status(500).json({
        success: false,
        error: { code: 'SRV_001', message: 'Failed to get WebSocket stats' },
      });
    }
  }
}

export const marketDataController = new MarketDataController();
