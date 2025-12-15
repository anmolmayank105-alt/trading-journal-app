/**
 * Trade Service - Business Logic
 * Optimized with caching and batch operations for O(1) lookups
 */

import { Types } from 'mongoose';
import NodeCache from 'node-cache';
import { TradeModel, TradeDocument } from '../models';
import {
  CreateTradeDTO,
  UpdateTradeDTO,
  ExitTradeDTO,
  TradeStatus,
  DEFAULT_PNL,
  DEFAULT_TAXES,
} from '../../../shared/dist/types';
import {
  NotFoundError,
  InvalidInputError,
  TradeAlreadyClosedError,
  InvalidTradeStateError,
  logger,
} from '../../../shared/dist/utils';

// ============= Cache Configuration =============
// TTL: 5 minutes for trade data, check every 60 seconds
const tradeCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
const summaryCache = new NodeCache({ stdTTL: 60, checkperiod: 30 });
const symbolsCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// ============= Helper Functions =============

// Extract base symbol (remove strike prices for indices)
function extractBaseSymbol(symbol: string): string {
  if (!symbol) return symbol;
  const match = symbol.match(/^([A-Z\s]+?)\s+\d+$/i);
  return match ? match[1].trim() : symbol;
}

// ============= Types =============

export interface TradeQueryOptions {
  status?: TradeStatus | TradeStatus[];
  symbol?: string | string[];
  exchange?: string | string[];
  segment?: string | string[];
  tradeType?: string | string[];
  position?: string;
  strategy?: string;
  tags?: string[];
  from?: Date;
  to?: Date;
  exitDate?: Date;
  minPnL?: number;
  maxPnL?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  // Cursor-based pagination for O(1) offset
  cursor?: string;
  useCursor?: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// ============= Trade Service Class =============

export class TradeService {
  
  // ============= Create Trade =============
  
  async createTrade(userId: string, dto: CreateTradeDTO): Promise<TradeDocument> {
    logger.debug({ userId, symbol: dto.symbol }, 'Creating new trade');
    
    const trade = new TradeModel({
      userId: new Types.ObjectId(userId),
      symbol: dto.symbol.toUpperCase(),
      exchange: dto.exchange,
      segment: dto.segment || 'equity',
      instrumentType: dto.instrumentType || 'stock',
      tradeType: dto.tradeType,
      position: dto.position,
      entry: {
        price: dto.entryPrice,
        quantity: dto.quantity,
        timestamp: dto.entryTimestamp || new Date(),
        orderType: dto.orderType || 'market',
        brokerage: dto.brokerage || 0,
      },
      status: 'open',
      pnl: { 
        ...DEFAULT_PNL,
        taxes: dto.taxes ? { ...DEFAULT_TAXES, ...dto.taxes } : { ...DEFAULT_TAXES }
      },
      stopLoss: dto.stopLoss,
      target: dto.target,
      strategy: dto.strategy,
      psychology: dto.psychology,
      mistake: dto.mistake,
      tags: dto.tags || [],
      notes: dto.notes,
      brokerId: dto.brokerId ? new Types.ObjectId(dto.brokerId) : undefined,
    });
    
    await trade.save();
    
    logger.info({ tradeId: trade._id, symbol: trade.symbol }, 'Trade created successfully');
    return trade;
  }
  
  // ============= Get Trade by ID =============
  // O(1) with cache hit, O(log n) with DB query (indexed)
  
  async getTradeById(userId: string, tradeId: string): Promise<TradeDocument> {
    const cacheKey = `trade:${userId}:${tradeId}`;
    
    // Check cache first - O(1)
    const cached = tradeCache.get<TradeDocument>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // DB query with indexed lookup - O(log n)
    const trade = await TradeModel.findOne({
      _id: tradeId,
      userId,
      isDeleted: false,
    }).lean() as TradeDocument | null;
    
    if (!trade) {
      throw new NotFoundError('Trade', tradeId);
    }
    
    // Cache the result
    tradeCache.set(cacheKey, trade);
    
    return trade;
  }
  
  // ============= Invalidate Trade Cache =============
  
  private invalidateTradeCache(userId: string, tradeId?: string): void {
    if (tradeId) {
      tradeCache.del(`trade:${userId}:${tradeId}`);
    }
    // Invalidate summary and symbols cache for this user
    summaryCache.del(`summary:${userId}`);
    symbolsCache.del(`symbols:${userId}`);
  }
  
  // ============= Get User Trades =============
  
  async getUserTrades(
    userId: string,
    options: TradeQueryOptions = {}
  ): Promise<PaginatedResult<TradeDocument>> {
    console.log('📊 [TRADE-SERVICE] getUserTrades called for userId:', userId);
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const skip = (page - 1) * limit;
    
    // Build query
    const query: any = { userId: new Types.ObjectId(userId), isDeleted: false };
    console.log('📊 [TRADE-SERVICE] MongoDB query:', JSON.stringify(query));
    
    // Status filter
    if (options.status) {
      query.status = Array.isArray(options.status) 
        ? { $in: options.status } 
        : options.status;
    }
    
    // Symbol filter
    if (options.symbol) {
      const symbols = Array.isArray(options.symbol) 
        ? options.symbol.map(s => s.toUpperCase())
        : [options.symbol.toUpperCase()];
      query.symbol = { $in: symbols };
    }
    
    // Exchange filter
    if (options.exchange) {
      query.exchange = Array.isArray(options.exchange)
        ? { $in: options.exchange }
        : options.exchange;
    }
    
    // Segment filter
    if (options.segment) {
      query.segment = Array.isArray(options.segment)
        ? { $in: options.segment }
        : options.segment;
    }
    
    // Trade type filter
    if (options.tradeType) {
      query.tradeType = Array.isArray(options.tradeType)
        ? { $in: options.tradeType }
        : options.tradeType;
    }
    
    // Position filter
    if (options.position) {
      query.position = options.position;
    }
    
    // Strategy filter
    if (options.strategy) {
      query.strategy = options.strategy;
    }
    
    // Tags filter
    if (options.tags && options.tags.length > 0) {
      query.tags = { $in: options.tags };
    }
    
    // Date filter - use exit date if available, otherwise entry date
    if (options.exitDate) {
      const exitDateStart = new Date(options.exitDate);
      exitDateStart.setHours(0, 0, 0, 0);
      const exitDateEnd = new Date(options.exitDate);
      exitDateEnd.setHours(23, 59, 59, 999);
      
      // Match either exit date OR entry date (for trades without exit date)
      query.$or = [
        {
          'exit.timestamp': {
            $gte: exitDateStart,
            $lte: exitDateEnd
          }
        },
        {
          'exit.timestamp': { $exists: false },
          'entry.timestamp': {
            $gte: exitDateStart,
            $lte: exitDateEnd
          }
        }
      ];
    }
    
    // Date range filter (entry date)
    if (options.from || options.to) {
      query['entry.timestamp'] = {};
      if (options.from) {
        query['entry.timestamp'].$gte = options.from;
      }
      if (options.to) {
        query['entry.timestamp'].$lte = options.to;
      }
    }
    
    // P&L filter
    if (options.minPnL !== undefined || options.maxPnL !== undefined) {
      query['pnl.net'] = {};
      if (options.minPnL !== undefined) {
        query['pnl.net'].$gte = options.minPnL;
      }
      if (options.maxPnL !== undefined) {
        query['pnl.net'].$lte = options.maxPnL;
      }
    }
    
    // Search filter - escape regex special characters to prevent ReDoS
    if (options.search) {
      const escapedSearch = options.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { symbol: { $regex: escapedSearch, $options: 'i' } },
        { strategy: { $regex: escapedSearch, $options: 'i' } },
        { notes: { $regex: escapedSearch, $options: 'i' } },
      ];
    }
    
    // Build sort
    const sortField = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortField]: sortOrder };
    
    // Execute queries
    const [trades, total] = await Promise.all([
      TradeModel.find(query).sort(sort).skip(skip).limit(limit),
      TradeModel.countDocuments(query),
    ]);
    
    return {
      data: trades,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }
  
  // ============= Update Trade =============
  
  async updateTrade(
    userId: string,
    tradeId: string,
    dto: UpdateTradeDTO
  ): Promise<TradeDocument> {
    // Query database directly to get Mongoose document
    const trade = await TradeModel.findOne({
      _id: new Types.ObjectId(tradeId),
      userId: new Types.ObjectId(userId),
      isDeleted: { $ne: true },
    });
    
    if (!trade) {
      throw new NotFoundError('Trade', tradeId);
    }
    
    // Can't update closed trades entry price/quantity (but allow dates, exit price, notes/tags/strategy/psychology/mistake)
    if (trade.status === 'closed') {
      // Allow ALL fields to be updated for closed trades - user should be able to correct any mistakes
      const allowedFields = ['notes', 'tags', 'strategy', 'psychology', 'mistake', 'exitPrice', 'exitTimestamp', 'entryTimestamp', 'entryDate', 'exitDate', 'exitTime', 'stopLoss', 'target', 'riskRewardRatio', 'timeFrame', 'symbol', 'exchange', 'segment', 'tradeType', 'quantity', 'entryPrice', 'brokerage', 'exitBrokerage'];
      const updateKeys = Object.keys(dto);
      const hasDisallowedFields = updateKeys.some(key => !allowedFields.includes(key));
      
      // Cast dto to any for flexible field access (frontend may send additional fields)
      const dtoAny = dto as any;
      
      if (hasDisallowedFields) {
        const disallowedFields = updateKeys.filter(key => !allowedFields.includes(key));
        console.log('⚠️ Ignoring disallowed fields for closed trade:', disallowedFields);
        disallowedFields.forEach(field => delete dtoAny[field]);
      }
      
      // For closed trades, use direct DB update to avoid validation issues
      const updateFields: any = {};
      
      // Core trade details
      if (dtoAny.symbol !== undefined) updateFields.symbol = dtoAny.symbol;
      if (dtoAny.exchange !== undefined) updateFields.exchange = dtoAny.exchange;
      if (dtoAny.segment !== undefined) updateFields.segment = dtoAny.segment;
      if (dtoAny.tradeType !== undefined) updateFields.tradeType = dtoAny.tradeType;
      
      // Entry details
      if (dtoAny.quantity !== undefined) updateFields['entry.quantity'] = dtoAny.quantity;
      if (dtoAny.entryPrice !== undefined) updateFields['entry.price'] = dtoAny.entryPrice;
      if (dtoAny.brokerage !== undefined) updateFields['entry.brokerage'] = dtoAny.brokerage;
      
      // Exit details
      if (dtoAny.exitPrice !== undefined && trade.exit) {
        updateFields['exit.price'] = dtoAny.exitPrice;
        trade.exit.price = dtoAny.exitPrice;
      }
      if (dtoAny.exitBrokerage !== undefined && trade.exit) {
        updateFields['exit.brokerage'] = dtoAny.exitBrokerage;
      }
      
      if (dto.strategy !== undefined) updateFields.strategy = dto.strategy;
      if (dto.notes !== undefined) updateFields.notes = dto.notes;
      if (dto.tags !== undefined) updateFields.tags = dto.tags;
      if (dtoAny.psychology !== undefined) updateFields.psychology = dtoAny.psychology;
      if (dtoAny.mistake !== undefined) updateFields.mistake = dtoAny.mistake;
      if (dto.stopLoss !== undefined) updateFields.stopLoss = dto.stopLoss;
      if (dto.target !== undefined) updateFields.target = dto.target;
      if (dtoAny.riskRewardRatio !== undefined) updateFields.riskRewardRatio = dtoAny.riskRewardRatio;
      if (dtoAny.timeFrame !== undefined) updateFields.timeFrame = dtoAny.timeFrame;
      
      // Handle date updates
      if (dto.entryTimestamp || dtoAny.entryDate) {
        const entryDate = dto.entryTimestamp || dtoAny.entryDate;
        updateFields['entry.timestamp'] = new Date(entryDate);
      }
      
      if (dtoAny.exitTimestamp || dtoAny.exitDate || dtoAny.exitTime) {
        const exitDate = dtoAny.exitTimestamp || dtoAny.exitDate || dtoAny.exitTime;
        if (trade.exit) {
          updateFields['exit.timestamp'] = new Date(exitDate);
        }
      }
      
      if (Object.keys(updateFields).length > 0) {
        console.log('🔧 Updating closed trade directly:', updateFields);
        
        // Update database directly to bypass Mongoose validation
        await TradeModel.updateOne(
          { _id: trade._id },
          { $set: updateFields }
        );
        
        // Recalculate PnL if entry/exit price, quantity, or brokerage changed
        if (dtoAny.entryPrice !== undefined || dtoAny.exitPrice !== undefined || dtoAny.quantity !== undefined || dtoAny.brokerage !== undefined || dtoAny.exitBrokerage !== undefined) {
          const updatedTrade = await TradeModel.findById(trade._id);
          if (updatedTrade && updatedTrade.exit) {
            const entryPrice = updatedTrade.entry.price;
            const exitPrice = updatedTrade.exit.price;
            const qty = updatedTrade.entry.quantity;
            const isLong = updatedTrade.tradeType === 'long';
            const entryBrokerage = updatedTrade.entry.brokerage || 0;
            const exitBrokerage = updatedTrade.exit.brokerage || 0;
            const totalBrokerage = entryBrokerage + exitBrokerage;
            
            const grossPnL = isLong 
              ? (exitPrice - entryPrice) * qty 
              : (entryPrice - exitPrice) * qty;
            
            const netPnL = grossPnL - totalBrokerage;
            const percentageGain = ((exitPrice - entryPrice) / entryPrice) * 100 * (isLong ? 1 : -1);
            
            console.log('🔧 Recalculating PnL:', { entryPrice, exitPrice, qty, isLong, grossPnL, entryBrokerage, exitBrokerage, totalBrokerage, netPnL });
            
            await TradeModel.updateOne(
              { _id: trade._id },
              { $set: { 
                'pnl.gross': grossPnL,
                'pnl.net': netPnL,
                'pnl.brokerage': totalBrokerage,
                'pnl.charges': totalBrokerage,
                'pnl.percentageGain': percentageGain,
                'pnl.isProfit': netPnL > 0
              } }
            );
          }
        }
        
        // Invalidate cache
        tradeCache.del(`trade:${userId}:${tradeId}`);
        summaryCache.flushAll();
        symbolsCache.flushAll();
        
        // Return updated trade
        const updatedTrade = await TradeModel.findById(trade._id);
        logger.info({ tradeId, userId }, 'Closed trade updated successfully');
        return updatedTrade!;
      }
    }
    
    // For open trades, use normal update
    if (dto.entryPrice !== undefined && trade.status !== 'closed') trade.entry.price = dto.entryPrice;
    if (dto.quantity !== undefined && trade.status !== 'closed') trade.entry.quantity = dto.quantity;
    if (dto.stopLoss !== undefined) trade.stopLoss = dto.stopLoss;
    if (dto.target !== undefined) trade.target = dto.target;
    if (dto.strategy !== undefined) trade.strategy = dto.strategy;
    if (dto.tags !== undefined) trade.tags = dto.tags;
    if (dto.notes !== undefined) trade.notes = dto.notes;
    if (dto.brokerage !== undefined && trade.status !== 'closed') trade.entry.brokerage = dto.brokerage;
    if (dto.taxes !== undefined) {
      trade.pnl.taxes = { ...trade.pnl.taxes, ...dto.taxes };
    }
    
    await trade.save();
    
    // For closed trades with updated exit price, recalculate PnL
    const dtoAnyForPnL = dto as any;
    if (trade.status === 'closed' && dtoAnyForPnL.exitPrice !== undefined && trade.exit) {
      const calculatedPnL = trade.calculatePnL();
      console.log('🔧 Recalculating PnL after exit price update:', calculatedPnL);
      
      // Update PnL in database
      await TradeModel.collection.updateOne(
        { _id: trade._id },
        { 
          $set: { 
            'pnl.gross': calculatedPnL.gross || 0,
          }
        }
      );
      
      // Update local object to return correct values
      trade.pnl.gross = calculatedPnL.gross;
    }
    
    await trade.save();
    
    // Invalidate cache
    tradeCache.del(`trade:${userId}:${tradeId}`);
    summaryCache.flushAll();
    symbolsCache.flushAll();
    
    logger.info({ tradeId, userId }, 'Trade updated successfully');
    return trade;
  }
  
  // ============= Exit Trade =============
  
  async exitTrade(
    userId: string,
    tradeId: string,
    dto: ExitTradeDTO
  ): Promise<TradeDocument> {
    console.log('🚀 exitTrade called - userId:', userId, 'tradeId:', tradeId, 'dto:', dto);
    
    // Query database directly to get Mongoose document
    const trade = await TradeModel.findOne({
      _id: new Types.ObjectId(tradeId),
      userId: new Types.ObjectId(userId),
      isDeleted: { $ne: true },
    });
    
    if (!trade) {
      throw new NotFoundError('Trade', tradeId);
    }
    
    if (trade.status === 'closed') {
      throw new TradeAlreadyClosedError(tradeId);
    }
    
    if (trade.status === 'cancelled') {
      throw new InvalidTradeStateError('cancelled', 'open or partial');
    }
    
    // Set exit details
    trade.exit = {
      price: dto.exitPrice,
      quantity: dto.exitQuantity || trade.entry.quantity,
      timestamp: dto.exitTimestamp || new Date(),
      orderType: dto.orderType || 'market',
      brokerage: dto.brokerage || 0,
    };
    
    // Update taxes if provided
    if (dto.taxes) {
      trade.pnl.taxes = { ...trade.pnl.taxes, ...dto.taxes };
    }
    
    // Determine status based on quantity
    if (trade.exit.quantity < trade.entry.quantity) {
      trade.status = 'partial';
    } else {
      trade.status = 'closed';
    }
    
    // Save to trigger pre-save hook
    await trade.save();
    
    // WORKAROUND: Force PnL update via direct collection update (Mongoose subdocument bug)
    if (trade.status === 'closed') {
      const calculatedPnL = trade.calculatePnL();
      console.log('🔧 Calculated PnL:', JSON.stringify(calculatedPnL, null, 2));
      console.log('🔧 Updating trade ID:', trade._id);
      
      // Use direct MongoDB driver to bypass Mongoose schema validation
      const updateResult = await TradeModel.collection.updateOne(
        { _id: trade._id },
        { 
          $set: { 
            'pnl.gross': calculatedPnL.gross,
            'pnl.net': calculatedPnL.net,
            'pnl.charges': calculatedPnL.charges,
            'pnl.brokerage': calculatedPnL.brokerage,
            'pnl.taxes': calculatedPnL.taxes,
            'pnl.percentageGain': calculatedPnL.percentageGain,
            'pnl.isProfit': calculatedPnL.isProfit,
          }
        }
      );
      
      console.log('✅ Update result:', updateResult.modifiedCount, 'documents modified');
      
      // Fetch the updated document to return correct values
      const updatedTrade = await TradeModel.findById(trade._id).lean();
      console.log('📊 Fetched trade PnL after update:', JSON.stringify(updatedTrade?.pnl, null, 2));
      if (updatedTrade) {
        trade.pnl = updatedTrade.pnl as any;
      }
    }
    
    // Invalidate cache
    tradeCache.del(`trade:${userId}:${tradeId}`);
    summaryCache.flushAll();
    symbolsCache.flushAll();
    
    logger.info({ 
      tradeId, 
      userId, 
      pnl: trade.pnl.net,
      status: trade.status 
    }, 'Trade exited successfully');
    
    return trade;
  }
  
  // ============= Cancel Trade =============
  
  async cancelTrade(userId: string, tradeId: string): Promise<TradeDocument> {
    // Query database directly to get Mongoose document
    const trade = await TradeModel.findOne({
      _id: new Types.ObjectId(tradeId),
      userId: new Types.ObjectId(userId),
      isDeleted: { $ne: true },
    });
    
    if (!trade) {
      throw new NotFoundError('Trade', tradeId);
    }
    
    if (trade.status === 'closed') {
      throw new InvalidTradeStateError('closed', 'open or partial');
    }
    
    trade.status = 'cancelled';
    await trade.save();
    
    // Invalidate cache
    tradeCache.del(`trade:${userId}:${tradeId}`);
    summaryCache.flushAll();
    symbolsCache.flushAll();
    
    logger.info({ tradeId, userId }, 'Trade cancelled');
    return trade;
  }
  
  // ============= Delete Trade (Soft) =============
  
  async deleteTrade(userId: string, tradeId: string): Promise<void> {
    // Use direct database update to bypass Mongoose validation
    const result = await TradeModel.updateOne(
      {
        _id: new Types.ObjectId(tradeId),
        userId: new Types.ObjectId(userId),
        isDeleted: { $ne: true }
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      throw new NotFoundError(`Trade with ID ${tradeId} not found`);
    }
    
    // Clear cache
    tradeCache.del(`trade:${userId}:${tradeId}`);
    summaryCache.flushAll();
    symbolsCache.flushAll();
    
    logger.info({ tradeId, userId }, 'Trade deleted (soft)');
  }
  
  // ============= Bulk Create Trades =============
  // Optimized: O(n) -> O(1) for duplicate check using Set, batch insert
  
  async bulkCreateTrades(
    userId: string,
    trades: CreateTradeDTO[],
    options?: { skipDuplicates?: boolean }
  ): Promise<{ created: number; skipped: number; errors: string[] }> {
    const results = { created: 0, skipped: 0, errors: [] as string[] };
    
    // Pre-fetch all existing broker trade IDs in one query - O(n) -> O(1) per lookup
    let existingBrokerIds = new Set<string>();
    if (options?.skipDuplicates) {
      const brokerIds = trades
        .map(t => (t as any).brokerTradeId)
        .filter((id): id is string => Boolean(id));
      
      if (brokerIds.length > 0) {
        const existing = await TradeModel.find(
          { userId, brokerTradeId: { $in: brokerIds }, isDeleted: false },
          { brokerTradeId: 1 }
        ).lean();
        existingBrokerIds = new Set(
          existing.map(e => e.brokerTradeId).filter((id): id is string => Boolean(id))
        );
      }
    }
    
    // Prepare batch insert documents
    const documentsToInsert: any[] = [];
    
    for (const dto of trades) {
      const brokerTradeId = (dto as any).brokerTradeId;
      
      // O(1) duplicate check with Set
      if (options?.skipDuplicates && brokerTradeId && existingBrokerIds.has(brokerTradeId)) {
        results.skipped++;
        continue;
      }
      
      documentsToInsert.push({
        userId: new Types.ObjectId(userId),
        symbol: dto.symbol.toUpperCase(),
        exchange: dto.exchange,
        segment: dto.segment || 'equity',
        instrumentType: dto.instrumentType || 'stock',
        tradeType: dto.tradeType,
        position: dto.position,
        entry: {
          price: dto.entryPrice,
          quantity: dto.quantity,
          timestamp: dto.entryTimestamp || new Date(),
          orderType: dto.orderType || 'market',
          brokerage: dto.brokerage || 0,
        },
        status: 'open',
        pnl: { ...DEFAULT_PNL, taxes: dto.taxes ? { ...DEFAULT_TAXES, ...dto.taxes } : { ...DEFAULT_TAXES } },
        stopLoss: dto.stopLoss,
        target: dto.target,
        strategy: dto.strategy,
        tags: dto.tags || [],
        notes: dto.notes,
        brokerId: dto.brokerId ? new Types.ObjectId(dto.brokerId) : undefined,
        brokerTradeId,
        isDeleted: false,
      });
    }
    
    // Batch insert with ordered: false for parallel inserts
    if (documentsToInsert.length > 0) {
      try {
        const insertResult = await TradeModel.insertMany(documentsToInsert, { ordered: false });
        results.created = insertResult.length;
      } catch (error: any) {
        // Handle partial failures in batch insert
        if (error.insertedDocs) {
          results.created = error.insertedDocs.length;
        }
        if (error.writeErrors) {
          error.writeErrors.forEach((e: any) => {
            results.errors.push(`Failed to create trade: ${e.errmsg}`);
          });
        }
      }
    }
    
    // Invalidate cache
    this.invalidateTradeCache(userId);
    
    logger.info({ userId, ...results }, 'Bulk trade creation completed');
    return results;
  }
  
  // ============= Get Open Trades =============
  
  async getOpenTrades(userId: string): Promise<TradeDocument[]> {
    return TradeModel.getOpenTrades(userId);
  }
  
  // ============= Get Trade Summary =============
  // O(1) with cache hit, uses aggregation pipeline with indexes
  
  async getTradeSummary(
    userId: string,
    dateRange?: { from: Date; to: Date }
  ): Promise<any> {
    // Generate cache key based on params
    const cacheKey = dateRange 
      ? `summary:${userId}:${dateRange.from.toISOString()}:${dateRange.to.toISOString()}`
      : `summary:${userId}`;
    
    // Check cache first - O(1)
    const cached = summaryCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    const summary = await TradeModel.getTradeSummary(userId, dateRange);
    
    // Calculate additional statistics
    const closedTrades = summary.winningTrades + summary.losingTrades;
    
    // Win rate
    summary.winRate = closedTrades > 0 
      ? Math.round((summary.winningTrades / closedTrades) * 100 * 100) / 100 
      : 0;
    
    // Map field names to match frontend expectations
    // FALLBACK: Use gross PnL if net is null/undefined (Mongoose subdocument bug workaround)
    summary.totalPnl = summary.totalNetPnL ?? summary.totalGrossPnL ?? 0;
    summary.avgPnl = closedTrades > 0 
      ? Math.round(((summary.totalNetPnL ?? summary.totalGrossPnL ?? 0) / closedTrades) * 100) / 100
      : 0;
    
    // Calculate avgWin and avgLoss by fetching winning/losing trades
    if (closedTrades > 0) {
      const match: any = { 
        userId: new Types.ObjectId(userId), 
        isDeleted: false,
        status: 'closed'
      };
      
      if (dateRange) {
        match['entry.timestamp'] = {
          $gte: dateRange.from,
          $lte: dateRange.to,
        };
      }
      
      const winLossStats = await TradeModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalWinPnL: { 
              $sum: { $cond: [{ $gt: ['$pnl.gross', 0] }, '$pnl.gross', 0] } 
            },
            totalLossPnL: { 
              $sum: { $cond: [{ $lt: ['$pnl.gross', 0] }, '$pnl.gross', 0] } 
            },
          }
        }
      ]);
      
      if (winLossStats.length > 0) {
        const stats = winLossStats[0];
        summary.avgWin = summary.winningTrades > 0
          ? Math.round((stats.totalWinPnL / summary.winningTrades) * 100) / 100
          : 0;
        summary.avgLoss = summary.losingTrades > 0
          ? Math.round((stats.totalLossPnL / summary.losingTrades) * 100) / 100
          : 0;
        
        // Profit factor = Total Wins / Abs(Total Losses)
        summary.profitFactor = stats.totalLossPnL < 0
          ? Math.round((stats.totalWinPnL / Math.abs(stats.totalLossPnL)) * 100) / 100
          : summary.winningTrades > 0 ? Infinity : 0;
      } else {
        summary.avgWin = 0;
        summary.avgLoss = 0;
        summary.profitFactor = 0;
      }
    } else {
      summary.avgWin = 0;
      summary.avgLoss = 0;
      summary.profitFactor = 0;
    }
    
    // Cache result
    summaryCache.set(cacheKey, summary);
    
    return summary;
  }
  
  // ============= Get Trades by Symbol =============
  
  async getTradesBySymbol(userId: string, symbol: string): Promise<TradeDocument[]> {
    return TradeModel.findBySymbol(userId, symbol);
  }
  
  // ============= Get Unique Symbols =============
  // O(1) with cache, uses distinct for better performance
  
  async getUniqueSymbols(userId: string): Promise<string[]> {
    const cacheKey = `symbols:${userId}`;
    
    // Check cache - O(1)
    const cached = symbolsCache.get<string[]>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Use distinct() instead of aggregate for better performance - O(n log n)
    const symbols = await TradeModel.distinct('symbol', {
      userId: new Types.ObjectId(userId),
      isDeleted: false,
    });
    
    const sorted = symbols.sort();
    symbolsCache.set(cacheKey, sorted);
    
    return sorted;
  }
  
  // ============= Get Trade Statistics =============
  
  async getTradeStatistics(
    userId: string,
    groupBy: 'symbol' | 'exchange' | 'segment' | 'tradeType' | 'strategy' = 'symbol',
    dateRange?: { from: Date; to: Date }
  ): Promise<any[]> {
    const match: any = { 
      userId: new Types.ObjectId(userId), 
      isDeleted: false,
      status: 'closed',
    };
    
    if (dateRange) {
      match['entry.timestamp'] = {
        $gte: dateRange.from,
        $lte: dateRange.to,
      };
    }
    
    const result = await TradeModel.aggregate([
      { $match: match },
      // Add field to extract base symbol if grouping by symbol
      ...(groupBy === 'symbol' ? [{
        $addFields: {
          baseSymbol: {
            $trim: {
              input: {
                $arrayElemAt: [
                  { $split: ['$symbol', ' '] },
                  0
                ]
              }
            }
          }
        }
      }] : []),
      {
        $group: {
          _id: groupBy === 'symbol' ? '$baseSymbol' : `$${groupBy}`,
          totalTrades: { $sum: 1 },
          totalPnL: { $sum: '$pnl.net' },
          avgPnL: { $avg: '$pnl.net' },
          winningTrades: { 
            $sum: { $cond: [{ $gt: ['$pnl.net', 0] }, 1, 0] } 
          },
          losingTrades: { 
            $sum: { $cond: [{ $lt: ['$pnl.net', 0] }, 1, 0] } 
          },
          maxProfit: { $max: '$pnl.net' },
          maxLoss: { $min: '$pnl.net' },
          avgHoldingPeriod: { $avg: '$holdingPeriod' },
        }
      },
      {
        $addFields: {
          winRate: {
            $cond: [
              { $gt: [{ $add: ['$winningTrades', '$losingTrades'] }, 0] },
              { $multiply: [
                { $divide: ['$winningTrades', { $add: ['$winningTrades', '$losingTrades'] }] },
                100
              ]},
              0
            ]
          }
        }
      },
      { $sort: { totalPnL: -1 } },
    ]);
    
    return result;
  }

  // ============= Get Strategy Analytics =============
  
  async getStrategyAnalytics(
    userId: string,
    dateRange?: { from: Date; to: Date }
  ): Promise<any[]> {
    const match: any = { 
      userId: new Types.ObjectId(userId), 
      isDeleted: false,
      status: 'closed',
    };
    
    if (dateRange) {
      match['exit.timestamp'] = {
        $gte: dateRange.from,
        $lte: dateRange.to,
      };
    }
    
    logger.info({ userId, dateRange }, 'Fetching strategy analytics');
    
    const result = await TradeModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$strategy',
          totalTrades: { $sum: 1 },
          totalPnL: { $sum: { $ifNull: ['$pnl.gross', 0] } },
          totalProfit: { 
            $sum: { 
              $cond: [
                { $gt: [{ $ifNull: ['$pnl.gross', 0] }, 0] }, 
                { $ifNull: ['$pnl.gross', 0] }, 
                0
              ] 
            } 
          },
          totalLoss: { 
            $sum: { 
              $cond: [
                { $lt: [{ $ifNull: ['$pnl.gross', 0] }, 0] }, 
                { $ifNull: ['$pnl.gross', 0] }, 
                0
              ] 
            } 
          },
          avgPnL: { $avg: { $ifNull: ['$pnl.gross', 0] } },
          winningTrades: { 
            $sum: { $cond: [{ $gt: [{ $ifNull: ['$pnl.gross', 0] }, 0] }, 1, 0] } 
          },
          losingTrades: { 
            $sum: { $cond: [{ $lt: [{ $ifNull: ['$pnl.gross', 0] }, 0] }, 1, 0] } 
          },
        }
      },
      {
        $addFields: {
          strategy: { $ifNull: ['$_id', 'No Strategy'] },
          winRate: {
            $cond: [
              { $gt: ['$totalTrades', 0] },
              { $multiply: [
                { $divide: ['$winningTrades', '$totalTrades'] },
                100
              ]},
              0
            ]
          }
        }
      },
      { $project: { _id: 0 } },
      { $sort: { totalPnL: -1 } },
    ]);
    
    logger.info({ count: result.length }, 'Strategy analytics fetched');
    return result;
  }

  // ============= Get Mistake Analytics =============
  
  async getMistakeAnalytics(
    userId: string,
    dateRange?: { from: Date; to: Date }
  ): Promise<any[]> {
    const match: any = { 
      userId: new Types.ObjectId(userId), 
      isDeleted: false,
      status: 'closed',
      mistake: { $exists: true, $nin: [null, ''] },
    };
    
    if (dateRange) {
      match['exit.timestamp'] = {
        $gte: dateRange.from,
        $lte: dateRange.to,
      };
    }
    
    logger.info({ userId, dateRange, match }, 'Fetching mistake analytics with match criteria');
    
    // First check if any trades match
    const matchingCount = await TradeModel.countDocuments(match);
    logger.info({ matchingCount }, 'Number of trades matching mistake criteria');
    
    const result = await TradeModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$mistake',
          count: { $sum: 1 },
          totalImpact: { $sum: { $ifNull: ['$pnl.gross', 0] } },
          avgImpact: { $avg: { $ifNull: ['$pnl.gross', 0] } },
        }
      },
      {
        $addFields: {
          mistake: '$_id',
        }
      },
      { $project: { _id: 0 } },
      { $sort: { count: -1 } },
    ]);
    
    logger.info({ count: result.length, result }, 'Mistake analytics fetched');
    return result;
  }
}

export const tradeService = new TradeService();
