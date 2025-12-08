/**
 * Dashboard Service
 * Provides aggregated data for dashboard display
 * Optimized with caching and parallel query execution
 */

import mongoose from 'mongoose';
import NodeCache from 'node-cache';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, subMonths, format } from 'date-fns';
import {
  DailyAnalyticsModel,
  WeeklyAnalyticsModel,
  MonthlyAnalyticsModel,
  SymbolAnalyticsModel,
} from '../models';
import { logger } from '@stock-tracker/shared/utils';

// ============= Cache Configuration =============
// Dashboard cache: 2 min TTL (frequently updated data)
// Metrics cache: 5 min TTL (less frequently changed)
const dashboardCache = new NodeCache({ stdTTL: 120, checkperiod: 30 });
const metricsCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

export interface DashboardSummary {
  today: {
    totalTrades: number;
    netPnL: number;
    winRate: number;
    topSymbol?: string;
  };
  thisMonth: {
    totalTrades: number;
    netPnL: number;
    winRate: number;
    tradingDays: number;
    averageDailyPnL: number;
  };
  allTime: {
    totalTrades: number;
    netPnL: number;
    winRate: number;
    profitFactor: number;
  };
  recentPerformance: {
    date: string;
    pnl: number;
  }[];
  topSymbols: {
    symbol: string;
    netPnL: number;
    totalTrades: number;
    winRate: number;
  }[];
  worstSymbols: {
    symbol: string;
    netPnL: number;
    totalTrades: number;
    winRate: number;
  }[];
}

export interface PerformanceMetrics {
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownDate?: Date;
  recoveryFactor: number;
  calmarRatio: number;
  averageRRR: number;
  expectancy: number;
  consistency: number;
}

class DashboardService {
  /**
   * Get dashboard summary for a user
   * Optimized: O(5 sequential queries) -> O(1) with cache, O(1) parallel queries
   */
  async getDashboardSummary(userId: string): Promise<DashboardSummary> {
    const cacheKey = `dashboard:${userId}`;
    
    // Check cache first - O(1)
    const cached = dashboardCache.get<DashboardSummary>(cacheKey);
    if (cached) {
      return cached;
    }
    
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const today = new Date();
    const todayStart = startOfDay(today);
    const monthStart = startOfMonth(today);

    // Execute ALL queries in parallel - O(1) instead of O(5) sequential
    const [todayData, monthlyData, allTimeAgg, last30Days, topSymbols, worstSymbols] = await Promise.all([
      // Today's data
      DailyAnalyticsModel.findOne({
        userId: userObjectId,
        date: { $gte: todayStart, $lte: endOfDay(today) },
      }).lean(),
      
      // This month's data
      MonthlyAnalyticsModel.findOne({
        userId: userObjectId,
        year: today.getFullYear(),
        month: today.getMonth() + 1,
      }).lean(),
      
      // All-time aggregation with optimized pipeline
      DailyAnalyticsModel.aggregate([
        { $match: { userId: userObjectId } },
        {
          $group: {
            _id: null,
            totalTrades: { $sum: '$totalTrades' },
            netPnL: { $sum: '$netPnL' },
            winningTrades: { $sum: '$winningTrades' },
            losingTrades: { $sum: '$losingTrades' },
            totalWins: { $sum: { $multiply: ['$averageWin', '$winningTrades'] } },
            totalLosses: { $sum: { $multiply: ['$averageLoss', '$losingTrades'] } },
          },
        },
      ]),
      
      // Last 30 days with projection for minimal data transfer
      DailyAnalyticsModel.find({
        userId: userObjectId,
        date: { $gte: subDays(today, 30) },
      })
        .sort({ date: 1 })
        .select('date netPnL')
        .lean(),
      
      // Top 5 symbols
      SymbolAnalyticsModel.find({
        userId: userObjectId,
        netPnL: { $gt: 0 },
      })
        .sort({ netPnL: -1 })
        .limit(5)
        .select('symbol netPnL totalTrades winRate')
        .lean(),
      
      // Worst 5 symbols
      SymbolAnalyticsModel.find({
        userId: userObjectId,
        netPnL: { $lt: 0 },
      })
        .sort({ netPnL: 1 })
        .limit(5)
        .select('symbol netPnL totalTrades winRate')
        .lean(),
    ]);

    const allTime = allTimeAgg[0] || {
      totalTrades: 0,
      netPnL: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalWins: 0,
      totalLosses: 0,
    };

    const recentPerformance = last30Days.map((d: any) => ({
      date: format(d.date, 'yyyy-MM-dd'),
      pnl: d.netPnL,
    }));

    const allTimeWinRate =
      allTime.totalTrades > 0 ? (allTime.winningTrades / allTime.totalTrades) * 100 : 0;
    const allTimeProfitFactor =
      allTime.totalLosses > 0 ? allTime.totalWins / allTime.totalLosses : 0;

    const result: DashboardSummary = {
      today: {
        totalTrades: (todayData as any)?.totalTrades || 0,
        netPnL: (todayData as any)?.netPnL || 0,
        winRate: (todayData as any)?.winRate || 0,
        topSymbol: undefined,
      },
      thisMonth: {
        totalTrades: (monthlyData as any)?.totalTrades || 0,
        netPnL: (monthlyData as any)?.netPnL || 0,
        winRate: (monthlyData as any)?.winRate || 0,
        tradingDays: (monthlyData as any)?.tradingDays || 0,
        averageDailyPnL: (monthlyData as any)?.averageDailyPnL || 0,
      },
      allTime: {
        totalTrades: allTime.totalTrades,
        netPnL: Math.round(allTime.netPnL * 100) / 100,
        winRate: Math.round(allTimeWinRate * 100) / 100,
        profitFactor: Math.round(allTimeProfitFactor * 100) / 100,
      },
      recentPerformance,
      topSymbols: topSymbols.map((s: any) => ({
        symbol: s.symbol,
        netPnL: s.netPnL,
        totalTrades: s.totalTrades,
        winRate: s.winRate,
      })),
      worstSymbols: worstSymbols.map((s: any) => ({
        symbol: s.symbol,
        netPnL: s.netPnL,
        totalTrades: s.totalTrades,
        winRate: s.winRate,
      })),
    };
    
    // Cache the result
    dashboardCache.set(cacheKey, result);
    
    return result;
  }

  /**
   * Get performance metrics for a user
   * Optimized: Single-pass O(n) calculations with caching
   */
  async getPerformanceMetrics(userId: string, startDate?: Date, endDate?: Date): Promise<PerformanceMetrics> {
    const end = endDate || new Date();
    const start = startDate || subMonths(end, 12);
    const cacheKey = `metrics:${userId}:${start.toISOString()}:${end.toISOString()}`;
    
    // Check cache - O(1)
    const cached = metricsCache.get<PerformanceMetrics>(cacheKey);
    if (cached) {
      return cached;
    }
    
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Use lean() for plain JS objects (faster)
    const dailyData = await DailyAnalyticsModel.find({
      userId: userObjectId,
      date: { $gte: start, $lte: end },
    })
      .sort({ date: 1 })
      .select('date netPnL winningTrades losingTrades averageWin averageLoss')
      .lean();

    if (dailyData.length === 0) {
      const emptyResult: PerformanceMetrics = {
        sharpeRatio: 0,
        sortinoRatio: 0,
        maxDrawdown: 0,
        recoveryFactor: 0,
        calmarRatio: 0,
        averageRRR: 0,
        expectancy: 0,
        consistency: 0,
      };
      metricsCache.set(cacheKey, emptyResult);
      return emptyResult;
    }

    // Single-pass calculation for all metrics - O(n)
    let sum = 0;
    let sumSq = 0;
    let downsideSumSq = 0;
    let negativeCount = 0;
    let peak = 0;
    let maxDrawdown = 0;
    let maxDrawdownDate: Date | undefined;
    let runningTotal = 0;
    let profitableDays = 0;
    let totalWins = 0;
    let totalLosses = 0;
    let totalWinningTrades = 0;
    let totalLosingTrades = 0;
    
    const n = dailyData.length;
    
    for (const d of dailyData) {
      const pnl = d.netPnL;
      sum += pnl;
      sumSq += pnl * pnl;
      
      if (pnl < 0) {
        downsideSumSq += pnl * pnl;
        negativeCount++;
      } else if (pnl > 0) {
        profitableDays++;
      }
      
      // Drawdown calculation
      runningTotal += pnl;
      if (runningTotal > peak) peak = runningTotal;
      const drawdown = peak - runningTotal;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownDate = d.date;
      }
      
      // Win/Loss totals
      totalWins += d.averageWin * d.winningTrades;
      totalLosses += d.averageLoss * d.losingTrades;
      totalWinningTrades += d.winningTrades;
      totalLosingTrades += d.losingTrades;
    }

    const avgReturn = sum / n;
    const variance = (sumSq / n) - (avgReturn * avgReturn);
    const stdDev = Math.sqrt(Math.max(0, variance));
    const downsideVariance = negativeCount > 0 ? downsideSumSq / negativeCount : 0;
    const downsideDeviation = Math.sqrt(downsideVariance);

    // Calculate ratios - O(1)
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;
    const sortinoRatio = downsideDeviation > 0 ? (avgReturn / downsideDeviation) * Math.sqrt(252) : 0;
    const totalPnL = sum;
    const recoveryFactor = maxDrawdown > 0 ? totalPnL / maxDrawdown : 0;
    const annualizedReturn = avgReturn * 252;
    const calmarRatio = maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0;
    const avgWin = totalWinningTrades > 0 ? totalWins / totalWinningTrades : 0;
    const avgLoss = totalLosingTrades > 0 ? totalLosses / totalLosingTrades : 0;
    const averageRRR = avgLoss > 0 ? avgWin / avgLoss : 0;
    const totalTrades = totalWinningTrades + totalLosingTrades;
    const winRate = totalTrades > 0 ? totalWinningTrades / totalTrades : 0;
    const expectancy = winRate * avgWin - (1 - winRate) * avgLoss;
    const consistency = n > 0 ? (profitableDays / n) * 100 : 0;

    const result: PerformanceMetrics = {
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      sortinoRatio: Math.round(sortinoRatio * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      maxDrawdownDate,
      recoveryFactor: Math.round(recoveryFactor * 100) / 100,
      calmarRatio: Math.round(calmarRatio * 100) / 100,
      averageRRR: Math.round(averageRRR * 100) / 100,
      expectancy: Math.round(expectancy * 100) / 100,
      consistency: Math.round(consistency * 100) / 100,
    };
    
    metricsCache.set(cacheKey, result);
    return result;
  }

  /**
   * Get P&L breakdown by various dimensions
   */
  async getPnLBreakdown(
    userId: string,
    dimension: 'segment' | 'tradeType' | 'position' | 'dayOfWeek' | 'timeOfDay',
    startDate?: Date,
    endDate?: Date
  ): Promise<{ label: string; value: number; count: number }[]> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const end = endDate || new Date();
    const start = startDate || subMonths(end, 12);

    const dailyData = await DailyAnalyticsModel.find({
      userId: userObjectId,
      date: { $gte: start, $lte: end },
    });

    if (dimension === 'segment') {
      return [
        {
          label: 'Equity',
          value: dailyData.reduce((sum, d) => sum + d.equityPnL, 0),
          count: 0,
        },
        {
          label: 'Futures',
          value: dailyData.reduce((sum, d) => sum + d.futuresPnL, 0),
          count: 0,
        },
        {
          label: 'Options',
          value: dailyData.reduce((sum, d) => sum + d.optionsPnL, 0),
          count: 0,
        },
      ];
    }

    if (dimension === 'tradeType') {
      return [
        {
          label: 'Intraday',
          value: dailyData.reduce((sum, d) => sum + d.intradayPnL, 0),
          count: 0,
        },
        {
          label: 'Positional',
          value: dailyData.reduce((sum, d) => sum + d.positionalPnL, 0),
          count: 0,
        },
        {
          label: 'Swing',
          value: dailyData.reduce((sum, d) => sum + d.swingPnL, 0),
          count: 0,
        },
      ];
    }

    if (dimension === 'position') {
      return [
        {
          label: 'Long',
          value: dailyData.reduce((sum, d) => sum + d.longPnL, 0),
          count: 0,
        },
        {
          label: 'Short',
          value: dailyData.reduce((sum, d) => sum + d.shortPnL, 0),
          count: 0,
        },
      ];
    }

    if (dimension === 'dayOfWeek') {
      const dayMap = new Map<number, { pnl: number; count: number }>();
      dailyData.forEach((d) => {
        const day = d.date.getDay();
        const existing = dayMap.get(day) || { pnl: 0, count: 0 };
        existing.pnl += d.netPnL;
        existing.count += d.totalTrades;
        dayMap.set(day, existing);
      });

      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days.map((day, index) => ({
        label: day,
        value: dayMap.get(index)?.pnl || 0,
        count: dayMap.get(index)?.count || 0,
      }));
    }

    return [];
  }

  /**
   * Get monthly P&L trend
   */
  async getMonthlyTrend(userId: string, months: number = 12): Promise<{ month: string; pnl: number; trades: number }[]> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const today = new Date();

    const monthlyData = await MonthlyAnalyticsModel.find({
      userId: userObjectId,
    })
      .sort({ year: -1, month: -1 })
      .limit(months);

    return monthlyData.reverse().map((m) => ({
      month: `${m.year}-${String(m.month).padStart(2, '0')}`,
      pnl: m.netPnL,
      trades: m.totalTrades,
    }));
  }

  /**
   * Get weekly P&L trend
   */
  async getWeeklyTrend(userId: string, weeks: number = 12): Promise<{ week: string; pnl: number; trades: number }[]> {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const weeklyData = await WeeklyAnalyticsModel.find({
      userId: userObjectId,
    })
      .sort({ year: -1, weekNumber: -1 })
      .limit(weeks)
      .lean();

    return weeklyData.reverse().map((w: any) => ({
      week: `${w.year}-W${String(w.weekNumber).padStart(2, '0')}`,
      pnl: w.netPnL,
      trades: w.totalTrades,
    }));
  }
  
  /**
   * Invalidate user's dashboard cache
   */
  invalidateCache(userId: string): void {
    const keys = dashboardCache.keys();
    keys.forEach(key => {
      if (key.startsWith(`dashboard:${userId}`) || key.startsWith(`metrics:${userId}`)) {
        dashboardCache.del(key);
      }
    });
    const metricKeys = metricsCache.keys();
    metricKeys.forEach(key => {
      if (key.startsWith(`metrics:${userId}`)) {
        metricsCache.del(key);
      }
    });
  }
}

export const dashboardService = new DashboardService();
