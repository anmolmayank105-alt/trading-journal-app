/**
 * Trade Controller
 */

import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { tradeService, TradeQueryOptions } from '../services';
import { validate, schemas, logger } from '../../../shared/dist/utils';
import { AuthenticatedRequest } from '../../../shared/dist/types';

// Helper to validate ObjectId
function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id) && new Types.ObjectId(id).toString() === id;
}

export class TradeController {
  
  // ============= Create Trade =============
  
  async createTrade(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'AUTH_001', message: 'Unauthorized' } });
        return;
      }
      
      logger.info({ body: req.body }, 'Create trade request received');
      const dto = validate(schemas.createTrade, req.body);
      logger.info('Validation passed, creating trade');
      const trade = await tradeService.createTrade(userId, dto);
      
      res.status(201).json({
        success: true,
        message: 'Trade created successfully',
        data: trade,
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ============= Get Trade by ID =============
  
  async getTradeById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { tradeId } = req.params;
      
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'AUTH_001', message: 'Unauthorized' } });
        return;
      }
      
      // Validate tradeId format
      if (!isValidObjectId(tradeId)) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_001', message: 'Invalid trade ID format' } });
        return;
      }
      
      const trade = await tradeService.getTradeById(userId, tradeId);
      
      res.json({
        success: true,
        data: trade,
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ============= Get User Trades =============
  
  async getUserTrades(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'AUTH_001', message: 'Unauthorized' } });
        return;
      }
      
      // Parse query parameters
      const options: TradeQueryOptions = {
        status: req.query.status as any,
        symbol: req.query.symbol as any,
        exchange: req.query.exchange as any,
        segment: req.query.segment as any,
        tradeType: req.query.tradeType as any,
        position: req.query.position as any,
        strategy: req.query.strategy as any,
        from: req.query.from ? new Date(req.query.from as string) : undefined,
        to: req.query.to ? new Date(req.query.to as string) : undefined,
        exitDate: req.query.exitDate ? new Date(req.query.exitDate as string) : undefined,
        minPnL: req.query.minPnL ? parseFloat(req.query.minPnL as string) : undefined,
        maxPnL: req.query.maxPnL ? parseFloat(req.query.maxPnL as string) : undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
        search: req.query.search as string,
      };
      
      if (req.query.tags) {
        options.tags = Array.isArray(req.query.tags) 
          ? req.query.tags as string[]
          : [req.query.tags as string];
      }
      
      const result = await tradeService.getUserTrades(userId, options);
      
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ============= Update Trade =============
  
  async updateTrade(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { tradeId } = req.params;
      
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'AUTH_001', message: 'Unauthorized' } });
        return;
      }
      
      const dto = validate(schemas.updateTrade, req.body);
      const trade = await tradeService.updateTrade(userId, tradeId, dto);
      
      res.json({
        success: true,
        message: 'Trade updated successfully',
        data: trade,
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ============= Exit Trade =============
  
  async exitTrade(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { tradeId } = req.params;
      
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'AUTH_001', message: 'Unauthorized' } });
        return;
      }
      
      const dto = validate(schemas.exitTrade, req.body);
      const trade = await tradeService.exitTrade(userId, tradeId, dto);
      
      res.json({
        success: true,
        message: 'Trade exited successfully',
        data: trade,
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ============= Cancel Trade =============
  
  async cancelTrade(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { tradeId } = req.params;
      
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'AUTH_001', message: 'Unauthorized' } });
        return;
      }
      
      const trade = await tradeService.cancelTrade(userId, tradeId);
      
      res.json({
        success: true,
        message: 'Trade cancelled',
        data: trade,
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ============= Delete Trade =============
  
  async deleteTrade(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { tradeId } = req.params;
      
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'AUTH_001', message: 'Unauthorized' } });
        return;
      }
      
      await tradeService.deleteTrade(userId, tradeId);
      
      res.json({
        success: true,
        message: 'Trade deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ============= Bulk Create Trades =============
  
  async bulkCreateTrades(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'AUTH_001', message: 'Unauthorized' } });
        return;
      }
      
      const { trades, skipDuplicates } = req.body;
      
      if (!Array.isArray(trades) || trades.length === 0) {
        res.status(400).json({ 
          success: false, 
          error: { code: 'VAL_001', message: 'trades array is required' } 
        });
        return;
      }
      
      if (trades.length > 100) {
        res.status(400).json({ 
          success: false, 
          error: { code: 'VAL_001', message: 'Maximum 100 trades per request' } 
        });
        return;
      }
      
      const result = await tradeService.bulkCreateTrades(userId, trades, { skipDuplicates });
      
      res.status(201).json({
        success: true,
        message: 'Bulk trade creation completed',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ============= Get Open Trades =============
  
  async getOpenTrades(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'AUTH_001', message: 'Unauthorized' } });
        return;
      }
      
      const trades = await tradeService.getOpenTrades(userId);
      
      res.json({
        success: true,
        data: trades,
        count: trades.length,
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ============= Get Trade Summary =============
  
  async getTradeSummary(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'AUTH_001', message: 'Unauthorized' } });
        return;
      }
      
      const dateRange = req.query.from && req.query.to
        ? { 
            from: new Date(req.query.from as string), 
            to: new Date(req.query.to as string) 
          }
        : undefined;
      
      const summary = await tradeService.getTradeSummary(userId, dateRange);
      
      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ============= Get Trade Statistics =============
  
  async getTradeStatistics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'AUTH_001', message: 'Unauthorized' } });
        return;
      }
      
      const groupBy = (req.query.groupBy as any) || 'symbol';
      const dateRange = req.query.from && req.query.to
        ? { 
            from: new Date(req.query.from as string), 
            to: new Date(req.query.to as string) 
          }
        : undefined;
      
      const stats = await tradeService.getTradeStatistics(userId, groupBy, dateRange);
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ============= Get Unique Symbols =============
  
  async getUniqueSymbols(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'AUTH_001', message: 'Unauthorized' } });
        return;
      }
      
      const symbols = await tradeService.getUniqueSymbols(userId);
      
      res.json({
        success: true,
        data: symbols,
        count: symbols.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============= Get Strategy Analytics =============
  
  async getStrategyAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'AUTH_001', message: 'Unauthorized' } });
        return;
      }

      const { period } = req.query;
      let dateRange: { from: Date; to: Date } | undefined;

      if (period && period !== 'ALL') {
        const now = new Date();
        const from = new Date();
        
        switch (period) {
          case '1D':
            from.setDate(now.getDate() - 1);
            break;
          case '1W':
            from.setDate(now.getDate() - 7);
            break;
          case '1M':
            from.setMonth(now.getMonth() - 1);
            break;
          case '3M':
            from.setMonth(now.getMonth() - 3);
            break;
          case '1Y':
            from.setFullYear(now.getFullYear() - 1);
            break;
        }
        
        dateRange = { from, to: now };
      }
      
      const analytics = await tradeService.getStrategyAnalytics(userId, dateRange);
      
      res.json({
        success: true,
        data: analytics,
        period: period || 'ALL',
      });
    } catch (error) {
      next(error);
    }
  }

  // ============= Get Mistake Analytics =============
  
  async getMistakeAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'AUTH_001', message: 'Unauthorized' } });
        return;
      }

      const { period } = req.query;
      let dateRange: { from: Date; to: Date } | undefined;

      if (period && period !== 'ALL') {
        const now = new Date();
        const from = new Date();
        
        switch (period) {
          case '1D':
            from.setDate(now.getDate() - 1);
            break;
          case '1W':
            from.setDate(now.getDate() - 7);
            break;
          case '1M':
            from.setMonth(now.getMonth() - 1);
            break;
          case '3M':
            from.setMonth(now.getMonth() - 3);
            break;
          case '1Y':
            from.setFullYear(now.getFullYear() - 1);
            break;
        }
        
        dateRange = { from, to: now };
      }
      
      const analytics = await tradeService.getMistakeAnalytics(userId, dateRange);
      
      res.json({
        success: true,
        data: analytics,
        period: period || 'ALL',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const tradeController = new TradeController();
