/**
 * Symbol Analytics Model
 * Per-symbol performance tracking
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface ISymbolAnalytics extends Document {
  userId: mongoose.Types.ObjectId;
  symbol: string;
  exchange: string;
  segment: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  grossPnL: number;
  netPnL: number;
  totalCharges: number;
  totalVolume: number;
  totalQuantity: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  averageHoldingDays: number;
  averagePositionSize: number;
  lastTradedAt: Date;
  firstTradedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SymbolAnalyticsSchema = new Schema<ISymbolAnalytics>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    symbol: {
      type: String,
      required: true,
      index: true,
    },
    exchange: {
      type: String,
      required: true,
    },
    segment: {
      type: String,
      enum: ['equity', 'futures', 'options', 'currency', 'commodity'],
      default: 'equity',
    },
    totalTrades: { type: Number, default: 0 },
    winningTrades: { type: Number, default: 0 },
    losingTrades: { type: Number, default: 0 },
    grossPnL: { type: Number, default: 0 },
    netPnL: { type: Number, default: 0 },
    totalCharges: { type: Number, default: 0 },
    totalVolume: { type: Number, default: 0 },
    totalQuantity: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    profitFactor: { type: Number, default: 0 },
    averageWin: { type: Number, default: 0 },
    averageLoss: { type: Number, default: 0 },
    largestWin: { type: Number, default: 0 },
    largestLoss: { type: Number, default: 0 },
    averageHoldingDays: { type: Number, default: 0 },
    averagePositionSize: { type: Number, default: 0 },
    lastTradedAt: { type: Date },
    firstTradedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
SymbolAnalyticsSchema.index({ userId: 1, symbol: 1, exchange: 1 }, { unique: true });
SymbolAnalyticsSchema.index({ userId: 1, netPnL: -1 });
// Covering index for top/worst performers
SymbolAnalyticsSchema.index({ userId: 1, netPnL: 1 });
// Index for segment filtering
SymbolAnalyticsSchema.index({ userId: 1, segment: 1, netPnL: -1 });

export const SymbolAnalyticsModel = mongoose.model<ISymbolAnalytics>('SymbolAnalytics', SymbolAnalyticsSchema);
