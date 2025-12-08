/**
 * Daily Analytics Model
 * Stores pre-computed daily P&L and statistics for fast dashboard access
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IDailyAnalytics extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
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
  // By segment
  equityPnL: number;
  futuresPnL: number;
  optionsPnL: number;
  // By trade type
  intradayPnL: number;
  positionalPnL: number;
  swingPnL: number;
  // By position
  longPnL: number;
  shortPnL: number;
  createdAt: Date;
  updatedAt: Date;
}

const DailyAnalyticsSchema = new Schema<IDailyAnalytics>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    totalTrades: { type: Number, default: 0 },
    winningTrades: { type: Number, default: 0 },
    losingTrades: { type: Number, default: 0 },
    breakEvenTrades: { type: Number, default: 0 },
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
    // By segment
    equityPnL: { type: Number, default: 0 },
    futuresPnL: { type: Number, default: 0 },
    optionsPnL: { type: Number, default: 0 },
    // By trade type
    intradayPnL: { type: Number, default: 0 },
    positionalPnL: { type: Number, default: 0 },
    swingPnL: { type: Number, default: 0 },
    // By position
    longPnL: { type: Number, default: 0 },
    shortPnL: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
DailyAnalyticsSchema.index({ userId: 1, date: -1 });
// Covering index for dashboard summary
DailyAnalyticsSchema.index({ userId: 1, date: 1 }, { 
  partialFilterExpression: { netPnL: { $exists: true } } 
});
// Index for date range queries
DailyAnalyticsSchema.index({ date: 1 });

export const DailyAnalyticsModel = mongoose.model<IDailyAnalytics>('DailyAnalytics', DailyAnalyticsSchema);
