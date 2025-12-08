/**
 * Broker Account Controller
 */

import { Response, NextFunction } from 'express';
import { brokerAccountService, zerodhaService, tradeSyncService } from '../services';
import { AuthenticatedRequest } from '@stock-tracker/shared/types';
import { BrokerType } from '../models';

export class BrokerAccountController {
  
  // ============= Get All Accounts =============
  
  async getAccounts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'AUTH_001', message: 'Unauthorized' } });
        return;
      }
      
      const accounts = await brokerAccountService.getUserAccounts(userId);
      
      res.json({
        success: true,
        data: accounts,
        count: accounts.length,
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ============= Get Account by ID =============
  
  async getAccountById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { accountId } = req.params;
      
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'AUTH_001', message: 'Unauthorized' } });
        return;
      }
      
      const account = await brokerAccountService.getById(userId, accountId);
      
      res.json({
        success: true,
        data: account,
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ============= Get Login URL =============
  
  async getLoginUrl(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { broker } = req.params;
      
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'AUTH_001', message: 'Unauthorized' } });
        return;
      }
      
      let loginUrl: string;
      
      switch (broker as BrokerType) {
        case 'zerodha':
          loginUrl = zerodhaService.getLoginUrl();
          break;
        case 'angel':
          // TODO: Implement Angel login URL
          loginUrl = '';
          break;
        case 'upstox':
          // TODO: Implement Upstox login URL
          loginUrl = '';
          break;
        default:
          res.status(400).json({ 
            success: false, 
            error: { code: 'VAL_001', message: `Unsupported broker: ${broker}` } 
          });
          return;
      }
      
      res.json({
        success: true,
        data: { loginUrl, broker },
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ============= Handle OAuth Callback =============
  
  async handleCallback(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { broker } = req.params;
      const { request_token, code } = req.query;
      
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'AUTH_001', message: 'Unauthorized' } });
        return;
      }
      
      let tokenData: any;
      
      switch (broker as BrokerType) {
        case 'zerodha':
          if (!request_token) {
            res.status(400).json({ 
              success: false, 
              error: { code: 'VAL_001', message: 'request_token is required' } 
            });
            return;
          }
          tokenData = await zerodhaService.exchangeToken(request_token as string);
          break;
        default:
          res.status(400).json({ 
            success: false, 
            error: { code: 'VAL_001', message: `Unsupported broker: ${broker}` } 
          });
          return;
      }
      
      // Check if account already exists
      const existingAccount = await brokerAccountService.getByBroker(userId, broker as BrokerType);
      
      if (existingAccount) {
        // Update existing account tokens
        await brokerAccountService.updateTokens(
          userId,
          existingAccount._id.toString(),
          tokenData.accessToken,
          tokenData.refreshToken,
          tokenData.expiresAt
        );
        
        res.json({
          success: true,
          message: 'Broker account reconnected successfully',
          data: { accountId: existingAccount._id.toString() },
        });
      } else {
        // Create new broker account
        const account = await brokerAccountService.create(userId, {
          broker: broker as BrokerType,
          brokerId: tokenData.userId,
          displayName: tokenData.userName || broker,
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
          tokenExpiry: tokenData.expiresAt,
          metadata: {
            clientId: tokenData.userId,
            userName: tokenData.userName,
            email: tokenData.email,
          },
        });
        
        res.status(201).json({
          success: true,
          message: 'Broker account connected successfully',
          data: { accountId: account._id.toString() },
        });
      }
    } catch (error) {
      next(error);
    }
  }
  
  // ============= Disconnect Account =============
  
  async disconnectAccount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { accountId } = req.params;
      
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'AUTH_001', message: 'Unauthorized' } });
        return;
      }
      
      await brokerAccountService.deactivate(userId, accountId);
      
      res.json({
        success: true,
        message: 'Broker account disconnected successfully',
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ============= Sync Trades =============
  
  async syncTrades(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { accountId } = req.params;
      const { syncType, from, to } = req.body;
      
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'AUTH_001', message: 'Unauthorized' } });
        return;
      }
      
      const dateRange = from && to 
        ? { from: new Date(from), to: new Date(to) }
        : undefined;
      
      const result = await tradeSyncService.syncTrades(
        userId,
        accountId,
        syncType || 'full',
        dateRange
      );
      
      res.json({
        success: true,
        message: 'Trade sync completed',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ============= Get Sync Logs =============
  
  async getSyncLogs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { accountId } = req.params;
      const { limit, skip } = req.query;
      
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'AUTH_001', message: 'Unauthorized' } });
        return;
      }
      
      const logs = await tradeSyncService.getSyncLogs(userId, {
        accountId,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        skip: skip ? parseInt(skip as string, 10) : undefined,
      });
      
      res.json({
        success: true,
        data: logs,
        count: logs.length,
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ============= Get Positions =============
  
  async getPositions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { accountId } = req.params;
      
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'AUTH_001', message: 'Unauthorized' } });
        return;
      }
      
      const account = await brokerAccountService.getById(userId, accountId);
      const accessToken = await brokerAccountService.getAccessToken(userId, accountId);
      
      let positions: any;
      
      switch (account.broker) {
        case 'zerodha':
          positions = await zerodhaService.getPositions(accessToken);
          break;
        default:
          res.status(400).json({ 
            success: false, 
            error: { code: 'VAL_001', message: `Positions not supported for: ${account.broker}` } 
          });
          return;
      }
      
      res.json({
        success: true,
        data: positions,
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ============= Get Holdings =============
  
  async getHoldings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { accountId } = req.params;
      
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'AUTH_001', message: 'Unauthorized' } });
        return;
      }
      
      const account = await brokerAccountService.getById(userId, accountId);
      const accessToken = await brokerAccountService.getAccessToken(userId, accountId);
      
      let holdings: any;
      
      switch (account.broker) {
        case 'zerodha':
          holdings = await zerodhaService.getHoldings(accessToken);
          break;
        default:
          res.status(400).json({ 
            success: false, 
            error: { code: 'VAL_001', message: `Holdings not supported for: ${account.broker}` } 
          });
          return;
      }
      
      res.json({
        success: true,
        data: holdings,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const brokerAccountController = new BrokerAccountController();
