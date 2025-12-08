/**
 * Watchlist Service
 * Manages user watchlists
 * Optimized with caching and batch operations
 */

import mongoose from 'mongoose';
import NodeCache from 'node-cache';
import { WatchlistModel, IWatchlist, IWatchlistItem } from '../models';
import { marketDataService, Quote } from './market-data.service';
import { logger } from '@stock-tracker/shared/utils';

// Watchlist cache: 2 min TTL
const watchlistCache = new NodeCache({ stdTTL: 120, checkperiod: 30 });

export interface WatchlistWithQuotes {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  items: (IWatchlistItem & { quote?: Quote })[];
  createdAt: Date;
  updatedAt: Date;
}

class WatchlistService {
  /**
   * Get all watchlists for a user
   * O(1) with cache, O(log n) with DB query (indexed)
   */
  async getUserWatchlists(userId: string): Promise<IWatchlist[]> {
    const cacheKey = `watchlists:${userId}`;
    
    // Check cache - O(1)
    const cached = watchlistCache.get<IWatchlist[]>(cacheKey);
    if (cached) {
      return cached;
    }
    
    const watchlists = await WatchlistModel.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ isDefault: -1, createdAt: 1 });
    
    watchlistCache.set(cacheKey, watchlists);
    return watchlists;
  }
  
  /**
   * Invalidate user's watchlist cache
   */
  private invalidateCache(userId: string): void {
    const keys = watchlistCache.keys();
    keys.forEach(key => {
      if (key.includes(userId)) {
        watchlistCache.del(key);
      }
    });
  }

  /**
   * Get a single watchlist with quotes
   */
  async getWatchlistWithQuotes(userId: string, watchlistId: string): Promise<WatchlistWithQuotes | null> {
    const watchlist = await WatchlistModel.findOne({
      _id: new mongoose.Types.ObjectId(watchlistId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!watchlist) {
      return null;
    }

    // Fetch quotes for all items
    const quotes = await marketDataService.getQuotes(
      watchlist.items.map((item) => ({ symbol: item.symbol, exchange: item.exchange }))
    );

    const quotesMap = new Map(quotes.map((q) => [`${q.symbol}:${q.exchange}`, q]));

    const itemsWithQuotes = watchlist.items.map((item) => ({
      ...item,
      quote: quotesMap.get(`${item.symbol}:${item.exchange}`),
    }));

    return {
      id: (watchlist._id as mongoose.Types.ObjectId).toString(),
      name: watchlist.name,
      description: watchlist.description,
      isDefault: watchlist.isDefault,
      items: itemsWithQuotes,
      createdAt: watchlist.createdAt,
      updatedAt: watchlist.updatedAt,
    };
  }

  /**
   * Create a new watchlist
   */
  async createWatchlist(
    userId: string,
    data: { name: string; description?: string; items?: IWatchlistItem[] }
  ): Promise<IWatchlist> {
    // Check if this is the first watchlist (make it default)
    const existingCount = await WatchlistModel.countDocuments({ userId: new mongoose.Types.ObjectId(userId) });

    const watchlist = await WatchlistModel.create({
      userId: new mongoose.Types.ObjectId(userId),
      name: data.name,
      description: data.description,
      items: data.items || [],
      isDefault: existingCount === 0,
    });

    // Invalidate cache
    this.invalidateCache(userId);

    logger.info({ userId, watchlistId: watchlist._id }, 'Watchlist created');
    return watchlist;
  }

  /**
   * Update a watchlist
   */
  async updateWatchlist(
    userId: string,
    watchlistId: string,
    data: { name?: string; description?: string }
  ): Promise<IWatchlist | null> {
    const watchlist = await WatchlistModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(watchlistId),
        userId: new mongoose.Types.ObjectId(userId),
      },
      { $set: data },
      { new: true }
    );

    if (watchlist) {
      this.invalidateCache(userId);
      logger.info({ userId, watchlistId }, 'Watchlist updated');
    }

    return watchlist;
  }

  /**
   * Delete a watchlist
   */
  async deleteWatchlist(userId: string, watchlistId: string): Promise<boolean> {
    const result = await WatchlistModel.deleteOne({
      _id: new mongoose.Types.ObjectId(watchlistId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (result.deletedCount > 0) {
      this.invalidateCache(userId);
      logger.info({ userId, watchlistId }, 'Watchlist deleted');
      return true;
    }

    return false;
  }

  /**
   * Add item to watchlist
   */
  async addItem(
    userId: string,
    watchlistId: string,
    item: { symbol: string; exchange: string; segment?: string }
  ): Promise<IWatchlist | null> {
    const watchlist = await WatchlistModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(watchlistId),
        userId: new mongoose.Types.ObjectId(userId),
        'items.symbol': { $ne: item.symbol },
      },
      {
        $push: {
          items: {
            symbol: item.symbol,
            exchange: item.exchange,
            segment: item.segment || 'equity',
            addedAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (watchlist) {
      this.invalidateCache(userId);
      logger.info({ userId, watchlistId, symbol: item.symbol }, 'Item added to watchlist');
    }

    return watchlist;
  }

  /**
   * Remove item from watchlist
   */
  async removeItem(userId: string, watchlistId: string, symbol: string): Promise<IWatchlist | null> {
    const watchlist = await WatchlistModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(watchlistId),
        userId: new mongoose.Types.ObjectId(userId),
      },
      {
        $pull: { items: { symbol } },
      },
      { new: true }
    );

    if (watchlist) {
      this.invalidateCache(userId);
      logger.info({ userId, watchlistId, symbol }, 'Item removed from watchlist');
    }

    return watchlist;
  }

  /**
   * Set default watchlist
   */
  async setDefaultWatchlist(userId: string, watchlistId: string): Promise<IWatchlist | null> {
    // Remove default from all other watchlists
    await WatchlistModel.updateMany(
      { userId: new mongoose.Types.ObjectId(userId) },
      { $set: { isDefault: false } }
    );

    // Set the new default
    const watchlist = await WatchlistModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(watchlistId),
        userId: new mongoose.Types.ObjectId(userId),
      },
      { $set: { isDefault: true } },
      { new: true }
    );

    if (watchlist) {
      logger.info({ userId, watchlistId }, 'Default watchlist set');
    }

    return watchlist;
  }
}

export const watchlistService = new WatchlistService();
