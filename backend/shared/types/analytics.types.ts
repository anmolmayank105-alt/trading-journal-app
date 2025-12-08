/**
 * Analytics Types - Performance Metrics and Reports
 */

import { ObjectId } from 'mongodb';
import { Period, Segment, TradeType, Timestamps } from './common.types';

// ============= Risk Metrics =============

export interface RiskMetrics {
  sharpeRatio?: number;
  sortinoRatio?: number;
  calmarRatio?: number;
  volatility: {
    daily: number;
    weekly: number;
    monthly: number;
    annualized: number;
  };
  beta?: number;
  alpha?: number;
  valueAtRisk: {
    daily95: number;
    daily99: number;
    weekly95: number;
  };
  expectedShortfall?: number;
}

// ============= Drawdown =============

export interface DrawdownInfo {
  maxDrawdown: number;
  maxDrawdownPercent: number;
  maxDrawdownStartDate?: Date;
  maxDrawdownEndDate?: Date;
  recoveryDate?: Date;
  currentDrawdown: number;
  currentDrawdownPercent: number;
}

// ============= P&L Summary =============

export interface PnLSummary {
  gross: number;
  net: number;
  charges: number;
  realized: number;
  unrealized: number;
  returnPercent: number;
}

// ============= Trade Reference =============

export interface TradeReference {
  tradeId: string;
  symbol: string;
  pnl: number;
  date: Date;
}

// ============= Segment Analytics =============

export interface SegmentAnalytics {
  trades: number;
  pnl: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
}

// ============= Strategy Analytics =============

export interface StrategyAnalytics {
  name: string;
  trades: number;
  pnl: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
}

// ============= Symbol Analytics =============

export interface SymbolAnalytics {
  symbol: string;
  exchange: string;
  trades: number;
  pnl: number;
  winRate: number;
  avgHoldingPeriod: number;
}

// ============= Daily P&L =============

export interface DailyPnL {
  date: Date;
  pnl: number;
  trades: number;
  wins: number;
  losses: number;
  cumulativePnl: number;
}

// ============= Monthly P&L =============

export interface MonthlyPnL {
  year: number;
  month: number;
  pnl: number;
  trades: number;
  winRate: number;
  returnPercent: number;
}

// ============= Heatmap Data =============

export interface HeatmapCell {
  day: number; // 0-6 (Sunday-Saturday)
  hour: number; // 0-23
  trades: number;
  pnl: number;
  winRate: number;
}

export type HeatmapData = HeatmapCell[];

// ============= Streak Data =============

export interface StreakInfo {
  currentWinStreak: number;
  currentLossStreak: number;
  maxWinStreak: number;
  maxLossStreak: number;
  winStreakStart?: Date;
  lossStreakStart?: Date;
  maxWinStreakPeriod?: { start: Date; end: Date };
  maxLossStreakPeriod?: { start: Date; end: Date };
}

// ============= Analytics Summary =============

export interface AnalyticsSummary extends Timestamps {
  _id: ObjectId;
  userId: ObjectId;
  period: Period;
  startDate: Date;
  endDate: Date;
  calculatedAt: Date;
  
  // Overview
  overview: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    breakEvenTrades: number;
    winRate: number;
    profitFactor: number;
    averageWin: number;
    averageLoss: number;
    largestWin: number;
    largestLoss: number;
    averageHoldingPeriod: number;
    expectancy: number;
  };
  
  // P&L
  pnl: PnLSummary;
  
  // Risk
  risk: RiskMetrics;
  
  // Drawdown
  drawdown: DrawdownInfo;
  
  // Streaks
  streaks: StreakInfo;
  
  // Breakdowns
  bySegment: Record<Segment, SegmentAnalytics>;
  byTradeType: Record<TradeType, SegmentAnalytics>;
  byStrategy: StrategyAnalytics[];
  topSymbols: SymbolAnalytics[];
  
  // Time Series
  dailyPnl: DailyPnL[];
  monthlyPnl: MonthlyPnL[];
  heatmap: HeatmapData;
  
  // Cache Info
  cacheKey?: string;
  expiresAt?: Date;
}

// ============= Analytics DTOs =============

export interface AnalyticsQueryDTO {
  period?: Period;
  startDate?: Date;
  endDate?: Date;
  segment?: Segment;
  tradeType?: TradeType;
  strategy?: string;
  symbols?: string[];
}

export interface AnalyticsSummaryDTO {
  period: Period;
  startDate: Date;
  endDate: Date;
  overview: AnalyticsSummary['overview'];
  pnl: PnLSummary;
  drawdown: DrawdownInfo;
  streaks: StreakInfo;
  calculatedAt: Date;
}

export interface PerformanceChartDTO {
  period: Period;
  data: Array<{
    date: Date;
    pnl: number;
    cumulativePnl: number;
    trades: number;
  }>;
}

export interface SegmentBreakdownDTO {
  segment: Segment;
  trades: number;
  pnl: number;
  winRate: number;
  percentage: number;
}

export interface StrategyReportDTO {
  name: string;
  trades: number;
  pnl: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number;
  performance: DailyPnL[];
}

// ============= Report Types =============

export type ReportFormat = 'pdf' | 'excel' | 'csv';
export type ReportType = 'summary' | 'detailed' | 'tax' | 'strategy';

export interface GenerateReportDTO {
  type: ReportType;
  format: ReportFormat;
  period: Period;
  startDate?: Date;
  endDate?: Date;
  includeCharts?: boolean;
  includeTransactions?: boolean;
}

export interface ReportResult {
  reportId: string;
  type: ReportType;
  format: ReportFormat;
  url?: string;
  fileBuffer?: Buffer;
  generatedAt: Date;
  expiresAt: Date;
}

// ============= Comparison =============

export interface PeriodComparison {
  currentPeriod: {
    start: Date;
    end: Date;
    pnl: number;
    trades: number;
    winRate: number;
  };
  previousPeriod: {
    start: Date;
    end: Date;
    pnl: number;
    trades: number;
    winRate: number;
  };
  changes: {
    pnl: number;
    pnlPercent: number;
    trades: number;
    tradesPercent: number;
    winRate: number;
  };
}

// ============= Dashboard Metrics =============

export interface DashboardMetrics {
  todayPnl: number;
  weekPnl: number;
  monthPnl: number;
  yearPnl: number;
  openPositions: number;
  openPositionsPnl: number;
  todayTrades: number;
  todayWinRate: number;
  monthlyTarget?: number;
  monthlyProgress?: number;
  recentTrades: TradeReference[];
  topGainers: SymbolAnalytics[];
  topLosers: SymbolAnalytics[];
}

// ============= Analytics Cache =============

export interface AnalyticsCacheEntry {
  key: string;
  data: AnalyticsSummary;
  createdAt: Date;
  expiresAt: Date;
  hitCount: number;
}

export interface CacheInvalidationEvent {
  type: 'trade' | 'sync' | 'manual';
  userId: string;
  affectedPeriods: Period[];
  timestamp: Date;
}
