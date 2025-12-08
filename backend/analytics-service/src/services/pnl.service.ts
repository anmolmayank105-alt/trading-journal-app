/**
 * P&L Calculation Service
 * Handles profit and loss calculations for trades
 * Optimized with single-pass O(n) calculations
 */

import mongoose from 'mongoose';
import NodeCache from 'node-cache';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, getWeek, getYear, differenceInDays } from 'date-fns';
import {
  DailyAnalyticsModel,
  WeeklyAnalyticsModel,
  MonthlyAnalyticsModel,
  SymbolAnalyticsModel,
} from '../models';
import { logger } from '@stock-tracker/shared/utils';

// Cache for intermediate calculations
const calcCache = new NodeCache({ stdTTL: 60, checkperiod: 30 });

interface Trade {
  _id: string;
  userId: string;
  symbol: string;
  exchange: string;
  segment: string;
  tradeType: string;
  position: string;
  status: string;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  entryDate: Date;
  exitDate?: Date;
  pnl?: {
    gross: number;
    net: number;
    percentage: number;
    charges: number;
  };
  charges?: {
    brokerage: number;
    stt: number;
    transactionCharges: number;
    gst: number;
    sebiCharges: number;
    stampDuty: number;
    total: number;
  };
}

class PnLService {
  /**
   * Calculate P&L for a single trade
   */
  calculateTradePnL(trade: Trade): { gross: number; net: number; percentage: number; charges: number } {
    if (trade.status !== 'closed' || !trade.exitPrice) {
      return { gross: 0, net: 0, percentage: 0, charges: 0 };
    }

    const entryValue = trade.entryPrice * trade.quantity;
    const exitValue = trade.exitPrice * trade.quantity;
    
    let grossPnL: number;
    if (trade.position === 'long') {
      grossPnL = exitValue - entryValue;
    } else {
      grossPnL = entryValue - exitValue;
    }

    const charges = trade.charges?.total || 0;
    const netPnL = grossPnL - charges;
    const percentage = entryValue > 0 ? (netPnL / entryValue) * 100 : 0;

    return {
      gross: Math.round(grossPnL * 100) / 100,
      net: Math.round(netPnL * 100) / 100,
      percentage: Math.round(percentage * 100) / 100,
      charges: Math.round(charges * 100) / 100,
    };
  }

  /**
   * Calculate daily analytics for a user
   */
  async calculateDailyAnalytics(userId: string, date: Date, trades: Trade[]): Promise<void> {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const dailyTrades = trades.filter(
      (t) => t.exitDate && new Date(t.exitDate) >= dayStart && new Date(t.exitDate) <= dayEnd
    );

    if (dailyTrades.length === 0) {
      return;
    }

    const analytics = this.aggregateTrades(dailyTrades);

    await DailyAnalyticsModel.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId), date: dayStart },
      {
        ...analytics,
        userId: new mongoose.Types.ObjectId(userId),
        date: dayStart,
      },
      { upsert: true, new: true }
    );

    logger.info({ userId, date: dayStart, tradesCount: dailyTrades.length }, 'Daily analytics calculated');
  }

  /**
   * Calculate weekly analytics for a user
   */
  async calculateWeeklyAnalytics(userId: string, date: Date, trades: Trade[]): Promise<void> {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
    const year = getYear(date);
    const weekNumber = getWeek(date, { weekStartsOn: 1 });

    const weeklyTrades = trades.filter(
      (t) => t.exitDate && new Date(t.exitDate) >= weekStart && new Date(t.exitDate) <= weekEnd
    );

    if (weeklyTrades.length === 0) {
      return;
    }

    const analytics = this.aggregateTrades(weeklyTrades);

    // Calculate best and worst day
    const dailyPnL = new Map<string, { date: Date; pnl: number }>();
    weeklyTrades.forEach((t) => {
      if (t.exitDate && t.pnl) {
        const dateKey = startOfDay(new Date(t.exitDate)).toISOString();
        const existing = dailyPnL.get(dateKey) || { date: new Date(t.exitDate), pnl: 0 };
        existing.pnl += t.pnl.net;
        dailyPnL.set(dateKey, existing);
      }
    });

    const dailyEntries = Array.from(dailyPnL.values());
    const bestDay = dailyEntries.reduce((a, b) => (a.pnl > b.pnl ? a : b), { date: weekStart, pnl: 0 });
    const worstDay = dailyEntries.reduce((a, b) => (a.pnl < b.pnl ? a : b), { date: weekStart, pnl: 0 });

    await WeeklyAnalyticsModel.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId), year, weekNumber },
      {
        ...analytics,
        userId: new mongoose.Types.ObjectId(userId),
        weekStart,
        weekEnd,
        year,
        weekNumber,
        tradingDays: dailyPnL.size,
        bestDay,
        worstDay,
      },
      { upsert: true, new: true }
    );

    logger.info({ userId, year, weekNumber, tradesCount: weeklyTrades.length }, 'Weekly analytics calculated');
  }

  /**
   * Calculate monthly analytics for a user
   */
  async calculateMonthlyAnalytics(userId: string, date: Date, trades: Trade[]): Promise<void> {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const year = getYear(date);
    const month = date.getMonth() + 1;

    const monthlyTrades = trades.filter(
      (t) => t.exitDate && new Date(t.exitDate) >= monthStart && new Date(t.exitDate) <= monthEnd
    );

    if (monthlyTrades.length === 0) {
      return;
    }

    const analytics = this.aggregateTrades(monthlyTrades);

    // Calculate daily P&L for streak and drawdown
    const dailyPnL = new Map<string, { date: Date; pnl: number }>();
    monthlyTrades.forEach((t) => {
      if (t.exitDate && t.pnl) {
        const dateKey = startOfDay(new Date(t.exitDate)).toISOString();
        const existing = dailyPnL.get(dateKey) || { date: new Date(t.exitDate), pnl: 0 };
        existing.pnl += t.pnl.net;
        dailyPnL.set(dateKey, existing);
      }
    });

    const dailyEntries = Array.from(dailyPnL.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
    const bestDay = dailyEntries.reduce((a, b) => (a.pnl > b.pnl ? a : b), { date: monthStart, pnl: 0 });
    const worstDay = dailyEntries.reduce((a, b) => (a.pnl < b.pnl ? a : b), { date: monthStart, pnl: 0 });

    // Calculate streaks
    const streaks = this.calculateStreaks(dailyEntries);

    // Calculate max drawdown
    const drawdown = this.calculateMaxDrawdown(dailyEntries);

    await MonthlyAnalyticsModel.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId), year, month },
      {
        ...analytics,
        userId: new mongoose.Types.ObjectId(userId),
        monthStart,
        monthEnd,
        year,
        month,
        tradingDays: dailyPnL.size,
        averageDailyPnL: dailyPnL.size > 0 ? analytics.netPnL / dailyPnL.size : 0,
        bestDay,
        worstDay,
        ...streaks,
        ...drawdown,
      },
      { upsert: true, new: true }
    );

    logger.info({ userId, year, month, tradesCount: monthlyTrades.length }, 'Monthly analytics calculated');
  }

  /**
   * Calculate symbol analytics for a user
   */
  async calculateSymbolAnalytics(userId: string, symbol: string, exchange: string, trades: Trade[]): Promise<void> {
    const symbolTrades = trades.filter(
      (t) => t.symbol === symbol && t.exchange === exchange && t.status === 'closed'
    );

    if (symbolTrades.length === 0) {
      return;
    }

    const analytics = this.aggregateTrades(symbolTrades);
    const segment = symbolTrades[0].segment;

    // Calculate holding days
    const holdingDays = symbolTrades.reduce((sum, t) => {
      if (t.exitDate && t.entryDate) {
        return sum + differenceInDays(new Date(t.exitDate), new Date(t.entryDate));
      }
      return sum;
    }, 0);

    const totalQuantity = symbolTrades.reduce((sum, t) => sum + t.quantity, 0);
    const totalVolume = symbolTrades.reduce((sum, t) => sum + t.entryPrice * t.quantity, 0);

    const dates = symbolTrades.map((t) => new Date(t.entryDate)).sort((a, b) => a.getTime() - b.getTime());
    const exitDates = symbolTrades
      .filter((t) => t.exitDate)
      .map((t) => new Date(t.exitDate!))
      .sort((a, b) => b.getTime() - a.getTime());

    await SymbolAnalyticsModel.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId), symbol, exchange },
      {
        ...analytics,
        userId: new mongoose.Types.ObjectId(userId),
        symbol,
        exchange,
        segment,
        totalQuantity,
        averageHoldingDays: symbolTrades.length > 0 ? holdingDays / symbolTrades.length : 0,
        averagePositionSize: symbolTrades.length > 0 ? totalVolume / symbolTrades.length : 0,
        firstTradedAt: dates[0],
        lastTradedAt: exitDates[0],
      },
      { upsert: true, new: true }
    );

    logger.info({ userId, symbol, exchange, tradesCount: symbolTrades.length }, 'Symbol analytics calculated');
  }

  /**
   * Aggregate trades into analytics
   * Optimized: Single-pass O(n) calculation instead of multiple reduce() calls
   */
  private aggregateTrades(trades: Trade[]): any {
    // Single-pass aggregation - O(n) instead of O(7n)
    let grossPnL = 0;
    let netPnL = 0;
    let totalCharges = 0;
    let totalVolume = 0;
    let capitalUsed = 0;
    let winningTrades = 0;
    let losingTrades = 0;
    let breakEvenTrades = 0;
    let totalWins = 0;
    let totalLosses = 0;
    let largestWin = 0;
    let largestLoss = 0;
    let equityPnL = 0;
    let futuresPnL = 0;
    let optionsPnL = 0;
    let intradayPnL = 0;
    let positionalPnL = 0;
    let swingPnL = 0;
    let longPnL = 0;
    let shortPnL = 0;
    let totalTrades = 0;

    // Single iteration through all trades - O(n)
    for (const trade of trades) {
      if (trade.status !== 'closed') continue;
      
      totalTrades++;
      const tradePnL = trade.pnl || this.calculateTradePnL(trade);
      const tradeVolume = trade.entryPrice * trade.quantity;

      grossPnL += tradePnL.gross;
      netPnL += tradePnL.net;
      totalCharges += tradePnL.charges;
      totalVolume += tradeVolume;
      capitalUsed += tradeVolume;

      // Win/Loss tracking
      if (tradePnL.net > 0) {
        winningTrades++;
        totalWins += tradePnL.net;
        if (tradePnL.net > largestWin) largestWin = tradePnL.net;
      } else if (tradePnL.net < 0) {
        losingTrades++;
        totalLosses += Math.abs(tradePnL.net);
        if (tradePnL.net < largestLoss) largestLoss = tradePnL.net;
      } else {
        breakEvenTrades++;
      }

      // Segment P&L - use switch for O(1) branching
      switch (trade.segment) {
        case 'equity': equityPnL += tradePnL.net; break;
        case 'futures': futuresPnL += tradePnL.net; break;
        case 'options': optionsPnL += tradePnL.net; break;
      }

      // Trade type P&L
      switch (trade.tradeType) {
        case 'intraday': intradayPnL += tradePnL.net; break;
        case 'positional': positionalPnL += tradePnL.net; break;
        case 'swing': swingPnL += tradePnL.net; break;
      }

      // Position P&L
      if (trade.position === 'long') {
        longPnL += tradePnL.net;
      } else {
        shortPnL += tradePnL.net;
      }
    }

    // Calculate derived metrics - O(1)
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999.99 : 0;
    const averageWin = winningTrades > 0 ? totalWins / winningTrades : 0;
    const averageLoss = losingTrades > 0 ? totalLosses / losingTrades : 0;

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      breakEvenTrades,
      grossPnL: Math.round(grossPnL * 100) / 100,
      netPnL: Math.round(netPnL * 100) / 100,
      totalCharges: Math.round(totalCharges * 100) / 100,
      totalVolume: Math.round(totalVolume * 100) / 100,
      capitalUsed: Math.round(capitalUsed * 100) / 100,
      winRate: Math.round(winRate * 100) / 100,
      profitFactor: Math.round(profitFactor * 100) / 100,
      averageWin: Math.round(averageWin * 100) / 100,
      averageLoss: Math.round(averageLoss * 100) / 100,
      largestWin: Math.round(largestWin * 100) / 100,
      largestLoss: Math.round(largestLoss * 100) / 100,
      equityPnL: Math.round(equityPnL * 100) / 100,
      futuresPnL: Math.round(futuresPnL * 100) / 100,
      optionsPnL: Math.round(optionsPnL * 100) / 100,
      intradayPnL: Math.round(intradayPnL * 100) / 100,
      positionalPnL: Math.round(positionalPnL * 100) / 100,
      swingPnL: Math.round(swingPnL * 100) / 100,
      longPnL: Math.round(longPnL * 100) / 100,
      shortPnL: Math.round(shortPnL * 100) / 100,
    };
  }

  /**
   * Calculate win/loss streaks
   */
  private calculateStreaks(dailyEntries: { date: Date; pnl: number }[]): any {
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let tempWinStreak = 0;
    let tempLossStreak = 0;

    dailyEntries.forEach((entry) => {
      if (entry.pnl > 0) {
        tempWinStreak++;
        tempLossStreak = 0;
        maxWinStreak = Math.max(maxWinStreak, tempWinStreak);
      } else if (entry.pnl < 0) {
        tempLossStreak++;
        tempWinStreak = 0;
        maxLossStreak = Math.max(maxLossStreak, tempLossStreak);
      }
    });

    // Current streak from last entry
    if (dailyEntries.length > 0) {
      const lastEntry = dailyEntries[dailyEntries.length - 1];
      if (lastEntry.pnl > 0) {
        currentWinStreak = tempWinStreak;
      } else if (lastEntry.pnl < 0) {
        currentLossStreak = tempLossStreak;
      }
    }

    return {
      currentWinStreak,
      currentLossStreak,
      maxWinStreak,
      maxLossStreak,
    };
  }

  /**
   * Calculate maximum drawdown
   */
  private calculateMaxDrawdown(dailyEntries: { date: Date; pnl: number }[]): any {
    let runningTotal = 0;
    let peak = 0;
    let maxDrawdown = 0;
    let maxDrawdownDate: Date | undefined;
    let recoveryDays = 0;

    dailyEntries.forEach((entry) => {
      runningTotal += entry.pnl;
      
      if (runningTotal > peak) {
        peak = runningTotal;
      }
      
      const drawdown = peak - runningTotal;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownDate = entry.date;
      }
    });

    return {
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      maxDrawdownDate,
      recoveryDays,
    };
  }
}

export const pnlService = new PnLService();
