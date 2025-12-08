/**
 * Report Service
 * Generates trading reports and exports
 */

import mongoose from 'mongoose';
import { startOfMonth, endOfMonth, format, subMonths, startOfYear, endOfYear } from 'date-fns';
import {
  DailyAnalyticsModel,
  WeeklyAnalyticsModel,
  MonthlyAnalyticsModel,
  SymbolAnalyticsModel,
} from '../models';
import { logger } from '@stock-tracker/shared/utils';

export interface TradingReport {
  period: {
    start: Date;
    end: Date;
    type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  };
  summary: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    breakEvenTrades: number;
    grossPnL: number;
    netPnL: number;
    totalCharges: number;
    winRate: number;
    profitFactor: number;
    averageWin: number;
    averageLoss: number;
    largestWin: number;
    largestLoss: number;
    expectancy: number;
  };
  breakdown: {
    bySegment: { segment: string; pnl: number; trades: number }[];
    byTradeType: { tradeType: string; pnl: number; trades: number }[];
    byPosition: { position: string; pnl: number; trades: number }[];
  };
  topPerformers: { symbol: string; pnl: number; trades: number; winRate: number }[];
  worstPerformers: { symbol: string; pnl: number; trades: number; winRate: number }[];
  dailyBreakdown?: { date: string; pnl: number; trades: number }[];
  generatedAt: Date;
}

class ReportService {
  /**
   * Generate a trading report for a specific period
   */
  async generateReport(
    userId: string,
    startDate: Date,
    endDate: Date,
    type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' = 'custom'
  ): Promise<TradingReport> {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Get daily data for the period
    const dailyData = await DailyAnalyticsModel.find({
      userId: userObjectId,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });

    // Aggregate summary
    const summary = {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakEvenTrades: 0,
      grossPnL: 0,
      netPnL: 0,
      totalCharges: 0,
      winRate: 0,
      profitFactor: 0,
      averageWin: 0,
      averageLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      expectancy: 0,
    };

    let totalWins = 0;
    let totalLosses = 0;
    let segmentPnL: Record<string, { pnl: number; trades: number }> = {
      equity: { pnl: 0, trades: 0 },
      futures: { pnl: 0, trades: 0 },
      options: { pnl: 0, trades: 0 },
    };
    let tradeTypePnL: Record<string, { pnl: number; trades: number }> = {
      intraday: { pnl: 0, trades: 0 },
      positional: { pnl: 0, trades: 0 },
      swing: { pnl: 0, trades: 0 },
    };
    let positionPnL: Record<string, { pnl: number; trades: number }> = {
      long: { pnl: 0, trades: 0 },
      short: { pnl: 0, trades: 0 },
    };

    dailyData.forEach((d) => {
      summary.totalTrades += d.totalTrades;
      summary.winningTrades += d.winningTrades;
      summary.losingTrades += d.losingTrades;
      summary.breakEvenTrades += d.breakEvenTrades;
      summary.grossPnL += d.grossPnL;
      summary.netPnL += d.netPnL;
      summary.totalCharges += d.totalCharges;
      
      totalWins += d.averageWin * d.winningTrades;
      totalLosses += d.averageLoss * d.losingTrades;
      
      summary.largestWin = Math.max(summary.largestWin, d.largestWin);
      summary.largestLoss = Math.min(summary.largestLoss, d.largestLoss);

      // Segment breakdown
      segmentPnL.equity.pnl += d.equityPnL;
      segmentPnL.futures.pnl += d.futuresPnL;
      segmentPnL.options.pnl += d.optionsPnL;

      // Trade type breakdown
      tradeTypePnL.intraday.pnl += d.intradayPnL;
      tradeTypePnL.positional.pnl += d.positionalPnL;
      tradeTypePnL.swing.pnl += d.swingPnL;

      // Position breakdown
      positionPnL.long.pnl += d.longPnL;
      positionPnL.short.pnl += d.shortPnL;
    });

    // Calculate derived metrics
    summary.winRate = summary.totalTrades > 0 
      ? (summary.winningTrades / summary.totalTrades) * 100 
      : 0;
    summary.profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;
    summary.averageWin = summary.winningTrades > 0 ? totalWins / summary.winningTrades : 0;
    summary.averageLoss = summary.losingTrades > 0 ? totalLosses / summary.losingTrades : 0;
    summary.expectancy = (summary.winRate / 100) * summary.averageWin 
      - (1 - summary.winRate / 100) * summary.averageLoss;

    // Get top and worst performers
    const topPerformers = await SymbolAnalyticsModel.find({
      userId: userObjectId,
    })
      .sort({ netPnL: -1 })
      .limit(5)
      .select('symbol netPnL totalTrades winRate');

    const worstPerformers = await SymbolAnalyticsModel.find({
      userId: userObjectId,
    })
      .sort({ netPnL: 1 })
      .limit(5)
      .select('symbol netPnL totalTrades winRate');

    // Daily breakdown
    const dailyBreakdown = dailyData.map((d) => ({
      date: format(d.date, 'yyyy-MM-dd'),
      pnl: d.netPnL,
      trades: d.totalTrades,
    }));

    return {
      period: {
        start: startDate,
        end: endDate,
        type,
      },
      summary: {
        ...summary,
        grossPnL: Math.round(summary.grossPnL * 100) / 100,
        netPnL: Math.round(summary.netPnL * 100) / 100,
        totalCharges: Math.round(summary.totalCharges * 100) / 100,
        winRate: Math.round(summary.winRate * 100) / 100,
        profitFactor: Math.round(summary.profitFactor * 100) / 100,
        averageWin: Math.round(summary.averageWin * 100) / 100,
        averageLoss: Math.round(summary.averageLoss * 100) / 100,
        expectancy: Math.round(summary.expectancy * 100) / 100,
      },
      breakdown: {
        bySegment: Object.entries(segmentPnL).map(([segment, data]) => ({
          segment,
          pnl: Math.round(data.pnl * 100) / 100,
          trades: data.trades,
        })),
        byTradeType: Object.entries(tradeTypePnL).map(([tradeType, data]) => ({
          tradeType,
          pnl: Math.round(data.pnl * 100) / 100,
          trades: data.trades,
        })),
        byPosition: Object.entries(positionPnL).map(([position, data]) => ({
          position,
          pnl: Math.round(data.pnl * 100) / 100,
          trades: data.trades,
        })),
      },
      topPerformers: topPerformers.map((p) => ({
        symbol: p.symbol,
        pnl: p.netPnL,
        trades: p.totalTrades,
        winRate: p.winRate,
      })),
      worstPerformers: worstPerformers.map((p) => ({
        symbol: p.symbol,
        pnl: p.netPnL,
        trades: p.totalTrades,
        winRate: p.winRate,
      })),
      dailyBreakdown,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate monthly report
   */
  async generateMonthlyReport(userId: string, year: number, month: number): Promise<TradingReport> {
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));
    return this.generateReport(userId, startDate, endDate, 'monthly');
  }

  /**
   * Generate yearly report
   */
  async generateYearlyReport(userId: string, year: number): Promise<TradingReport> {
    const startDate = startOfYear(new Date(year, 0));
    const endDate = endOfYear(new Date(year, 0));
    return this.generateReport(userId, startDate, endDate, 'yearly');
  }

  /**
   * Get comparison between two periods
   */
  async getPeriodsComparison(
    userId: string,
    period1Start: Date,
    period1End: Date,
    period2Start: Date,
    period2End: Date
  ): Promise<{
    period1: { netPnL: number; winRate: number; trades: number };
    period2: { netPnL: number; winRate: number; trades: number };
    change: { netPnL: number; winRate: number; trades: number };
  }> {
    const report1 = await this.generateReport(userId, period1Start, period1End);
    const report2 = await this.generateReport(userId, period2Start, period2End);

    return {
      period1: {
        netPnL: report1.summary.netPnL,
        winRate: report1.summary.winRate,
        trades: report1.summary.totalTrades,
      },
      period2: {
        netPnL: report2.summary.netPnL,
        winRate: report2.summary.winRate,
        trades: report2.summary.totalTrades,
      },
      change: {
        netPnL: report2.summary.netPnL - report1.summary.netPnL,
        winRate: report2.summary.winRate - report1.summary.winRate,
        trades: report2.summary.totalTrades - report1.summary.totalTrades,
      },
    };
  }

  /**
   * Export trades data as CSV
   */
  async exportToCSV(userId: string, startDate: Date, endDate: Date): Promise<string> {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const dailyData = await DailyAnalyticsModel.find({
      userId: userObjectId,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });

    const headers = [
      'Date',
      'Total Trades',
      'Winning Trades',
      'Losing Trades',
      'Gross P&L',
      'Net P&L',
      'Charges',
      'Win Rate',
      'Profit Factor',
    ];

    const rows = dailyData.map((d) => [
      format(d.date, 'yyyy-MM-dd'),
      d.totalTrades,
      d.winningTrades,
      d.losingTrades,
      d.grossPnL,
      d.netPnL,
      d.totalCharges,
      d.winRate,
      d.profitFactor,
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    return csv;
  }
}

export const reportService = new ReportService();
