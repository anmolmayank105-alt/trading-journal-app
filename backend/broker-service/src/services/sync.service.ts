/**
 * Trade Sync Service
 */

import { Types } from 'mongoose';
import { SyncLogModel, SyncLogDocument, SyncStatus, SyncType, BrokerType } from '../models';
import { brokerAccountService } from './broker-account.service';
import { zerodhaService, ZerodhaTrade } from './zerodha.service';
import { logger } from '@stock-tracker/shared/utils';
import axios from 'axios';

const TRADE_SERVICE_URL = process.env.TRADE_SERVICE_URL || 'http://localhost:3002';

export interface SyncResult {
  syncLogId: string;
  status: SyncStatus;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errors: string[];
  duration: number;
}

export class TradeSyncService {
  
  // ============= Sync Trades from Broker =============
  
  async syncTrades(
    userId: string,
    accountId: string,
    syncType: SyncType = 'full',
    dateRange?: { from: Date; to: Date }
  ): Promise<SyncResult> {
    const account = await brokerAccountService.getById(userId, accountId);
    
    // Create sync log
    const syncLog = new SyncLogModel({
      userId: new Types.ObjectId(userId),
      brokerAccountId: new Types.ObjectId(accountId),
      broker: account.broker,
      syncType,
      status: 'in_progress',
      startTime: new Date(),
    });
    await syncLog.save();
    
    logger.info({ 
      syncLogId: syncLog._id, 
      broker: account.broker, 
      syncType 
    }, 'Starting trade sync');
    
    try {
      let result: SyncResult;
      
      switch (account.broker) {
        case 'zerodha':
          result = await this.syncZerodhaTrades(userId, account, syncLog, dateRange);
          break;
        case 'angel':
          result = await this.syncAngelTrades(userId, account, syncLog, dateRange);
          break;
        case 'upstox':
          result = await this.syncUpstoxTrades(userId, account, syncLog, dateRange);
          break;
        default:
          throw new Error(`Unsupported broker: ${account.broker}`);
      }
      
      // Update sync log with success
      syncLog.status = 'completed';
      syncLog.endTime = new Date();
      syncLog.duration = syncLog.endTime.getTime() - syncLog.startTime.getTime();
      syncLog.recordsProcessed = result.recordsProcessed;
      syncLog.recordsCreated = result.recordsCreated;
      syncLog.recordsUpdated = result.recordsUpdated;
      syncLog.recordsSkipped = result.recordsSkipped;
      await syncLog.save();
      
      // Update broker account sync status
      await brokerAccountService.updateSyncStatus(accountId, new Date());
      
      logger.info({ 
        syncLogId: syncLog._id.toString(), 
        recordsProcessed: result.recordsProcessed,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated,
        recordsSkipped: result.recordsSkipped,
      }, 'Trade sync completed');
      
      return result;
      
    } catch (error: any) {
      // Update sync log with failure
      syncLog.status = 'failed';
      syncLog.endTime = new Date();
      syncLog.duration = syncLog.endTime.getTime() - syncLog.startTime.getTime();
      syncLog.syncErrors.push({
        message: error.message,
        timestamp: new Date(),
      });
      await syncLog.save();
      
      // Update broker account sync status
      await brokerAccountService.updateSyncStatus(accountId, new Date(), error.message);
      
      logger.error({ 
        syncLogId: syncLog._id, 
        error: error.message 
      }, 'Trade sync failed');
      
      throw error;
    }
  }
  
  // ============= Sync Zerodha Trades =============
  
  private async syncZerodhaTrades(
    userId: string,
    account: any,
    syncLog: SyncLogDocument,
    dateRange?: { from: Date; to: Date }
  ): Promise<SyncResult> {
    const accessToken = account.getAccessToken();
    
    // Get trades from Zerodha
    let trades: ZerodhaTrade[];
    
    if (dateRange) {
      trades = await zerodhaService.getHistoricalTrades(
        accessToken,
        dateRange.from,
        dateRange.to
      );
    } else {
      trades = await zerodhaService.getTrades(accessToken);
    }
    
    const result: SyncResult = {
      syncLogId: syncLog._id.toString(),
      status: 'completed',
      recordsProcessed: trades.length,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
      duration: 0,
    };
    
    // Transform and send to trade service
    for (const trade of trades) {
      try {
        const tradeDto = this.transformZerodhaTradeToDTO(trade, account._id.toString());
        
        // Call trade service to create/update trade
        const response = await axios.post(
          `${TRADE_SERVICE_URL}/api/v1/trades`,
          tradeDto,
          {
            headers: {
              'Authorization': `Bearer ${this.getServiceToken()}`,
              'X-User-Id': userId,
            },
          }
        );
        
        if (response.status === 201) {
          result.recordsCreated++;
        } else if (response.status === 200) {
          result.recordsUpdated++;
        }
      } catch (error: any) {
        if (error.response?.status === 409) {
          result.recordsSkipped++;
        } else {
          result.errors.push(`Failed to sync trade ${trade.trade_id}: ${error.message}`);
        }
      }
    }
    
    return result;
  }
  
  // ============= Sync Angel Trades (Placeholder) =============
  
  private async syncAngelTrades(
    userId: string,
    account: any,
    syncLog: SyncLogDocument,
    dateRange?: { from: Date; to: Date }
  ): Promise<SyncResult> {
    // TODO: Implement Angel Broking sync
    return {
      syncLogId: syncLog._id.toString(),
      status: 'completed',
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: ['Angel Broking sync not implemented yet'],
      duration: 0,
    };
  }
  
  // ============= Sync Upstox Trades (Placeholder) =============
  
  private async syncUpstoxTrades(
    userId: string,
    account: any,
    syncLog: SyncLogDocument,
    dateRange?: { from: Date; to: Date }
  ): Promise<SyncResult> {
    // TODO: Implement Upstox sync
    return {
      syncLogId: syncLog._id.toString(),
      status: 'completed',
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: ['Upstox sync not implemented yet'],
      duration: 0,
    };
  }
  
  // ============= Transform Zerodha Trade =============
  
  private transformZerodhaTradeToDTO(trade: ZerodhaTrade, brokerAccountId: string) {
    const isEquity = trade.exchange === 'NSE' || trade.exchange === 'BSE';
    
    return {
      symbol: trade.tradingsymbol,
      exchange: trade.exchange as 'NSE' | 'BSE' | 'MCX' | 'NFO',
      segment: isEquity ? 'equity' : 'futures',
      instrumentType: isEquity ? 'stock' : 'future',
      tradeType: trade.product === 'MIS' ? 'intraday' : 'delivery',
      position: trade.transaction_type === 'BUY' ? 'long' : 'short',
      entryPrice: trade.average_price,
      quantity: trade.quantity,
      entryTimestamp: new Date(trade.exchange_timestamp || trade.order_timestamp),
      brokerId: brokerAccountId,
      brokerTradeId: trade.trade_id,
    };
  }
  
  // ============= Get Sync Logs =============
  
  async getSyncLogs(
    userId: string,
    options: { limit?: number; skip?: number; accountId?: string }
  ): Promise<SyncLogDocument[]> {
    const query: any = { userId: new Types.ObjectId(userId) };
    
    if (options.accountId) {
      query.brokerAccountId = new Types.ObjectId(options.accountId);
    }
    
    return SyncLogModel.find(query)
      .sort({ createdAt: -1 })
      .limit(options.limit || 20)
      .skip(options.skip || 0);
  }
  
  // ============= Get Sync Log by ID =============
  
  async getSyncLogById(userId: string, syncLogId: string): Promise<SyncLogDocument | null> {
    return SyncLogModel.findOne({
      _id: syncLogId,
      userId: new Types.ObjectId(userId),
    });
  }
  
  // ============= Service Token for Internal API Calls =============
  
  private getServiceToken(): string {
    // In production, this should be a proper service-to-service token
    // For development, we'll use a placeholder
    return 'internal-service-token';
  }
}

export const tradeSyncService = new TradeSyncService();
