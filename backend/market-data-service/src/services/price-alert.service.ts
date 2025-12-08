/**
 * Price Alert Service
 * Manages user price alerts
 */

import mongoose from 'mongoose';
import { PriceAlertModel, IPriceAlert, AlertCondition, AlertStatus } from '../models';
import { marketDataService } from './market-data.service';
import { logger } from '@stock-tracker/shared/utils';

class PriceAlertService {
  /**
   * Get all alerts for a user
   */
  async getUserAlerts(userId: string, status?: AlertStatus): Promise<IPriceAlert[]> {
    const query: any = { userId: new mongoose.Types.ObjectId(userId) };
    if (status) {
      query.status = status;
    }
    return PriceAlertModel.find(query).sort({ createdAt: -1 });
  }

  /**
   * Get a single alert
   */
  async getAlertById(userId: string, alertId: string): Promise<IPriceAlert | null> {
    return PriceAlertModel.findOne({
      _id: new mongoose.Types.ObjectId(alertId),
      userId: new mongoose.Types.ObjectId(userId),
    });
  }

  /**
   * Create a new price alert
   */
  async createAlert(
    userId: string,
    data: {
      symbol: string;
      exchange: string;
      condition: AlertCondition;
      targetPrice: number;
      percentChange?: number;
      message?: string;
      notifyVia?: ('push' | 'email' | 'sms')[];
      expiresAt?: Date;
    }
  ): Promise<IPriceAlert> {
    // Get current price
    const quote = await marketDataService.getQuote(data.symbol, data.exchange);

    const alert = await PriceAlertModel.create({
      userId: new mongoose.Types.ObjectId(userId),
      symbol: data.symbol,
      exchange: data.exchange,
      condition: data.condition,
      targetPrice: data.targetPrice,
      percentChange: data.percentChange,
      currentPrice: quote?.lastPrice,
      message: data.message,
      notifyVia: data.notifyVia || ['push'],
      expiresAt: data.expiresAt,
      status: 'active',
    });

    logger.info({ userId, alertId: alert._id, symbol: data.symbol }, 'Price alert created');
    return alert;
  }

  /**
   * Update an alert
   */
  async updateAlert(
    userId: string,
    alertId: string,
    data: {
      targetPrice?: number;
      condition?: AlertCondition;
      message?: string;
      notifyVia?: ('push' | 'email' | 'sms')[];
      expiresAt?: Date;
    }
  ): Promise<IPriceAlert | null> {
    const alert = await PriceAlertModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(alertId),
        userId: new mongoose.Types.ObjectId(userId),
        status: 'active',
      },
      { $set: data },
      { new: true }
    );

    if (alert) {
      logger.info({ userId, alertId }, 'Price alert updated');
    }

    return alert;
  }

  /**
   * Cancel an alert
   */
  async cancelAlert(userId: string, alertId: string): Promise<IPriceAlert | null> {
    const alert = await PriceAlertModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(alertId),
        userId: new mongoose.Types.ObjectId(userId),
        status: 'active',
      },
      { $set: { status: 'cancelled' } },
      { new: true }
    );

    if (alert) {
      logger.info({ userId, alertId }, 'Price alert cancelled');
    }

    return alert;
  }

  /**
   * Delete an alert
   */
  async deleteAlert(userId: string, alertId: string): Promise<boolean> {
    const result = await PriceAlertModel.deleteOne({
      _id: new mongoose.Types.ObjectId(alertId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (result.deletedCount > 0) {
      logger.info({ userId, alertId }, 'Price alert deleted');
      return true;
    }

    return false;
  }

  /**
   * Check and trigger alerts (called periodically or on price update)
   */
  async checkAlerts(symbol: string, exchange: string, currentPrice: number): Promise<IPriceAlert[]> {
    const triggeredAlerts: IPriceAlert[] = [];

    // Find active alerts for this symbol
    const alerts = await PriceAlertModel.find({
      symbol,
      exchange,
      status: 'active',
    });

    for (const alert of alerts) {
      let shouldTrigger = false;
      const previousPrice = alert.currentPrice || currentPrice;

      switch (alert.condition) {
        case 'above':
          shouldTrigger = currentPrice >= alert.targetPrice;
          break;
        case 'below':
          shouldTrigger = currentPrice <= alert.targetPrice;
          break;
        case 'crosses_above':
          shouldTrigger = previousPrice < alert.targetPrice && currentPrice >= alert.targetPrice;
          break;
        case 'crosses_below':
          shouldTrigger = previousPrice > alert.targetPrice && currentPrice <= alert.targetPrice;
          break;
        case 'percent_change':
          if (alert.percentChange && previousPrice > 0) {
            const change = ((currentPrice - previousPrice) / previousPrice) * 100;
            shouldTrigger = Math.abs(change) >= Math.abs(alert.percentChange);
          }
          break;
      }

      if (shouldTrigger) {
        await PriceAlertModel.findByIdAndUpdate(alert._id, {
          $set: {
            status: 'triggered',
            triggeredAt: new Date(),
            currentPrice,
          },
        });
        triggeredAlerts.push(alert);
        logger.info({ alertId: alert._id, symbol, currentPrice }, 'Price alert triggered');
      } else {
        // Update current price for tracking
        await PriceAlertModel.findByIdAndUpdate(alert._id, {
          $set: { currentPrice },
        });
      }
    }

    return triggeredAlerts;
  }

  /**
   * Expire old alerts
   */
  async expireAlerts(): Promise<number> {
    const result = await PriceAlertModel.updateMany(
      {
        status: 'active',
        expiresAt: { $lte: new Date() },
      },
      { $set: { status: 'expired' } }
    );

    if (result.modifiedCount > 0) {
      logger.info({ count: result.modifiedCount }, 'Expired price alerts');
    }

    return result.modifiedCount;
  }
}

export const priceAlertService = new PriceAlertService();
