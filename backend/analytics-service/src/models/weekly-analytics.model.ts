/**
 * Weekly Analytics Model
 * Aggregated weekly statistics
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IWeeklyAnalytics extends Document {
  userId: mongoose.Types.ObjectId;
  weekStart: Date;
  weekEnd: Date;
  year: number;
  weekNumber: number;
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
  bestDay: {
    date: Date;
    pnl: number;
  };
  worstDay: {
    date: Date;
    pnl: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const WeeklyAnalyticsSchema = new Schema<IWeeklyAnalytics>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    weekStart: {
      type: Date,
      required: true,
    },
    weekEnd: {
      type: Date,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    weekNumber: {
      type: Number,
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
    bestDay: {
      date: { type: Date },
      pnl: { type: Number, default: 0 },
    },
    worstDay: {
      date: { type: Date },
      pnl: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
WeeklyAnalyticsSchema.index({ userId: 1, year: 1, weekNumber: 1 });
WeeklyAnalyticsSchema.index({ userId: 1, weekStart: -1 });

export const WeeklyAnalyticsModel = mongoose.model<IWeeklyAnalytics>('WeeklyAnalytics', WeeklyAnalyticsSchema);
