/**
 * Price Alert Controller
 */

import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '@stock-tracker/shared/types';
import { priceAlertService } from '../services';
import { logger } from '@stock-tracker/shared/utils';

class PriceAlertController {
  /**
   * Get all alerts
   */
  async getAlerts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { status } = req.query;

      const alerts = await priceAlertService.getUserAlerts(userId, status as any);

      res.json({
        success: true,
        data: alerts,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error getting alerts');
      res.status(500).json({
        success: false,
        error: { code: 'SRV_001', message: 'Failed to get alerts' },
      });
    }
  }

  /**
   * Get alert by ID
   */
  async getAlertById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          error: { code: 'VAL_002', message: 'Invalid alert ID' },
        });
        return;
      }

      const alert = await priceAlertService.getAlertById(userId, id);

      if (!alert) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Alert not found' },
        });
        return;
      }

      res.json({
        success: true,
        data: alert,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error getting alert');
      res.status(500).json({
        success: false,
        error: { code: 'SRV_001', message: 'Failed to get alert' },
      });
    }
  }

  /**
   * Create alert
   */
  async createAlert(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { symbol, exchange, condition, targetPrice, percentChange, message, notifyVia, expiresAt } = req.body;

      if (!symbol || !exchange || !condition || targetPrice === undefined) {
        res.status(400).json({
          success: false,
          error: { code: 'VAL_001', message: 'Symbol, exchange, condition, and target price are required' },
        });
        return;
      }

      const validConditions = ['above', 'below', 'crosses_above', 'crosses_below', 'percent_change'];
      if (!validConditions.includes(condition)) {
        res.status(400).json({
          success: false,
          error: { code: 'VAL_001', message: 'Invalid condition' },
        });
        return;
      }

      const alert = await priceAlertService.createAlert(userId, {
        symbol,
        exchange,
        condition,
        targetPrice,
        percentChange,
        message,
        notifyVia,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      res.status(201).json({
        success: true,
        data: alert,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error creating alert');
      res.status(500).json({
        success: false,
        error: { code: 'SRV_001', message: 'Failed to create alert' },
      });
    }
  }

  /**
   * Update alert
   */
  async updateAlert(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { targetPrice, condition, message, notifyVia, expiresAt } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          error: { code: 'VAL_002', message: 'Invalid alert ID' },
        });
        return;
      }

      const alert = await priceAlertService.updateAlert(userId, id, {
        targetPrice,
        condition,
        message,
        notifyVia,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      if (!alert) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Alert not found or not active' },
        });
        return;
      }

      res.json({
        success: true,
        data: alert,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error updating alert');
      res.status(500).json({
        success: false,
        error: { code: 'SRV_001', message: 'Failed to update alert' },
      });
    }
  }

  /**
   * Cancel alert
   */
  async cancelAlert(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          error: { code: 'VAL_002', message: 'Invalid alert ID' },
        });
        return;
      }

      const alert = await priceAlertService.cancelAlert(userId, id);

      if (!alert) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Alert not found or not active' },
        });
        return;
      }

      res.json({
        success: true,
        message: 'Alert cancelled successfully',
        data: alert,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error cancelling alert');
      res.status(500).json({
        success: false,
        error: { code: 'SRV_001', message: 'Failed to cancel alert' },
      });
    }
  }

  /**
   * Delete alert
   */
  async deleteAlert(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          error: { code: 'VAL_002', message: 'Invalid alert ID' },
        });
        return;
      }

      const deleted = await priceAlertService.deleteAlert(userId, id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Alert not found' },
        });
        return;
      }

      res.json({
        success: true,
        message: 'Alert deleted successfully',
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error deleting alert');
      res.status(500).json({
        success: false,
        error: { code: 'SRV_001', message: 'Failed to delete alert' },
      });
    }
  }
}

export const priceAlertController = new PriceAlertController();
