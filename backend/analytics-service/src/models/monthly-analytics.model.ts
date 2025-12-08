/**
 * Monthly Analytics Model
 * Aggregated monthly statistics
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IMonthlyAnalytics extends Document {
  userId: mongoose.Types.ObjectId;
  year: number;
  month: number;
  monthStart: Date;
  monthEnd: Date;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  grossPnL: number;
  netPnL: number;
  totalCharges: number;
  totalVolume: number;
  capitalUsed: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  tradingDays: number;
  averageDailyPnL: number;
  maxDrawdown: number;
  maxDrawdownDate: Date;
  recoveryDays: number;
  // Best/Worst periods
  bestWeek: {
    weekNumber: number;
    pnl: number;
  };
  worstWeek: {
    weekNumber: number;
    pnl: number;
  };
  bestDay: {
    date: Date;
    pnl: number;
  };
  worstDay: {
    date: Date;
    pnl: number;
  };
  // Streak data
  currentWinStreak: number;
  currentLossStreak: number;
  maxWinStreak: number;
  maxLossStreak: number;
  createdAt: Date;
  updatedAt: Date;
}

const MonthlyAnalyticsSchema = new Schema<IMonthlyAnalytics>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    monthStart: {
      type: Date,
      required: true,
    },
    monthEnd: {
      type: Date,
      required: true,
    },
    totalTrades: { type: Number, default: 0 },
    winningTrades: { type: Number, default: 0 },
    losingTrades: { type: Number, default: 0 },
    grossPnL: { type: Number, default: 0 },
    netPnL: { type: Number, default: 0 },
    totalCharges: { type: Number, default: 0 },
    totalVolume: { type: Number, default: 0 },
    capitalUsed: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    profitFactor: { type: Number, default: 0 },
    averageWin: { type: Number, default: 0 },
    averageLoss: { type: Number, default: 0 },
    largestWin: { type: Number, default: 0 },
    largestLoss: { type: Number, default: 0 },
    tradingDays: { type: Number, default: 0 },
    averageDailyPnL: { type: Number, default: 0 },
    maxDrawdown: { type: Number, default: 0 },
    maxDrawdownDate: { type: Date },
    recoveryDays: { type: Number, default: 0 },
    bestWeek: {
      weekNumber: { type: Number },
      pnl: { type: Number, default: 0 },
    },
    worstWeek: {
      weekNumber: { type: Number },
      pnl: { type: Number, default: 0 },
    },
    bestDay: {
      date: { type: Date },
      pnl: { type: Number, default: 0 },
    },
    worstDay: {
      date: { type: Date },
      pnl: { type: Number, default: 0 },
    },
    currentWinStreak: { type: Number, default: 0 },
    currentLossStreak: { type: Number, default: 0 },
    maxWinStreak: { type: Number, default: 0 },
    maxLossStreak: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
MonthlyAnalyticsSchema.index({ userId: 1, year: 1, month: 1 });

export const MonthlyAnalyticsModel = mongoose.model<IMonthlyAnalytics>('MonthlyAnalytics', MonthlyAnalyticsSchema);
