/**
 * Watchlist Controller
 */

import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '@stock-tracker/shared/types';
import { watchlistService } from '../services';
import { logger } from '@stock-tracker/shared/utils';

class WatchlistController {
  /**
   * Get all watchlists
   */
  async getWatchlists(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const watchlists = await watchlistService.getUserWatchlists(userId);

      res.json({
        success: true,
        data: watchlists,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error getting watchlists');
      res.status(500).json({
        success: false,
        error: { code: 'SRV_001', message: 'Failed to get watchlists' },
      });
    }
  }

  /**
   * Get watchlist by ID with quotes
   */
  async getWatchlistById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          error: { code: 'VAL_002', message: 'Invalid watchlist ID' },
        });
        return;
      }

      const watchlist = await watchlistService.getWatchlistWithQuotes(userId, id);

      if (!watchlist) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Watchlist not found' },
        });
        return;
      }

      res.json({
        success: true,
        data: watchlist,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error getting watchlist');
      res.status(500).json({
        success: false,
        error: { code: 'SRV_001', message: 'Failed to get watchlist' },
      });
    }
  }

  /**
   * Create watchlist
   */
  async createWatchlist(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { name, description, items } = req.body;

      if (!name) {
        res.status(400).json({
          success: false,
          error: { code: 'VAL_001', message: 'Name is required' },
        });
        return;
      }

      const watchlist = await watchlistService.createWatchlist(userId, {
        name,
        description,
        items,
      });

      res.status(201).json({
        success: true,
        data: watchlist,
      });
    } catch (error: any) {
      if (error.code === 11000) {
        res.status(400).json({
          success: false,
          error: { code: 'VAL_003', message: 'Watchlist with this name already exists' },
        });
        return;
      }

      logger.error({ error: error.message }, 'Error creating watchlist');
      res.status(500).json({
        success: false,
        error: { code: 'SRV_001', message: 'Failed to create watchlist' },
      });
    }
  }

  /**
   * Update watchlist
   */
  async updateWatchlist(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { name, description } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          error: { code: 'VAL_002', message: 'Invalid watchlist ID' },
        });
        return;
      }

      const watchlist = await watchlistService.updateWatchlist(userId, id, { name, description });

      if (!watchlist) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Watchlist not found' },
        });
        return;
      }

      res.json({
        success: true,
        data: watchlist,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error updating watchlist');
      res.status(500).json({
        success: false,
        error: { code: 'SRV_001', message: 'Failed to update watchlist' },
      });
    }
  }

  /**
   * Delete watchlist
   */
  async deleteWatchlist(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          error: { code: 'VAL_002', message: 'Invalid watchlist ID' },
        });
        return;
      }

      const deleted = await watchlistService.deleteWatchlist(userId, id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Watchlist not found' },
        });
        return;
      }

      res.json({
        success: true,
        message: 'Watchlist deleted successfully',
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error deleting watchlist');
      res.status(500).json({
        success: false,
        error: { code: 'SRV_001', message: 'Failed to delete watchlist' },
      });
    }
  }

  /**
   * Add item to watchlist
   */
  async addItem(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { symbol, exchange, segment } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          error: { code: 'VAL_002', message: 'Invalid watchlist ID' },
        });
        return;
      }

      if (!symbol || !exchange) {
        res.status(400).json({
          success: false,
          error: { code: 'VAL_001', message: 'Symbol and exchange are required' },
        });
        return;
      }

      const watchlist = await watchlistService.addItem(userId, id, { symbol, exchange, segment });

      if (!watchlist) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Watchlist not found or item already exists' },
        });
        return;
      }

      res.json({
        success: true,
        data: watchlist,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error adding item to watchlist');
      res.status(500).json({
        success: false,
        error: { code: 'SRV_001', message: 'Failed to add item to watchlist' },
      });
    }
  }

  /**
   * Remove item from watchlist
   */
  async removeItem(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id, symbol } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          error: { code: 'VAL_002', message: 'Invalid watchlist ID' },
        });
        return;
      }

      const watchlist = await watchlistService.removeItem(userId, id, symbol);

      if (!watchlist) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Watchlist not found' },
        });
        return;
      }

      res.json({
        success: true,
        data: watchlist,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error removing item from watchlist');
      res.status(500).json({
        success: false,
        error: { code: 'SRV_001', message: 'Failed to remove item from watchlist' },
      });
    }
  }

  /**
   * Set default watchlist
   */
  async setDefault(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          error: { code: 'VAL_002', message: 'Invalid watchlist ID' },
        });
        return;
      }

      const watchlist = await watchlistService.setDefaultWatchlist(userId, id);

      if (!watchlist) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Watchlist not found' },
        });
        return;
      }

      res.json({
        success: true,
        data: watchlist,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error setting default watchlist');
      res.status(500).json({
        success: false,
        error: { code: 'SRV_001', message: 'Failed to set default watchlist' },
      });
    }
  }
}

export const watchlistController = new WatchlistController();
