/**
 * Price Alert Model
 * User's price alerts for stocks
 */

import mongoose, { Schema, Document } from 'mongoose';

export type AlertCondition = 'above' | 'below' | 'crosses_above' | 'crosses_below' | 'percent_change';
export type AlertStatus = 'active' | 'triggered' | 'expired' | 'cancelled';

export interface IPriceAlert extends Document {
  userId: mongoose.Types.ObjectId;
  symbol: string;
  exchange: string;
  condition: AlertCondition;
  targetPrice: number;
  percentChange?: number;
  currentPrice?: number;
  status: AlertStatus;
  message?: string;
  notifyVia: ('push' | 'email' | 'sms')[];
  triggeredAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PriceAlertSchema = new Schema<IPriceAlert>(
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
    condition: {
      type: String,
      enum: ['above', 'below', 'crosses_above', 'crosses_below', 'percent_change'],
      required: true,
    },
    targetPrice: {
      type: Number,
      required: true,
    },
    percentChange: {
      type: Number,
    },
    currentPrice: {
      type: Number,
    },
    status: {
      type: String,
      enum: ['active', 'triggered', 'expired', 'cancelled'],
      default: 'active',
      index: true,
    },
    message: {
      type: String,
      maxlength: 200,
    },
    notifyVia: {
      type: [String],
      enum: ['push', 'email', 'sms'],
      default: ['push'],
    },
    triggeredAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes
PriceAlertSchema.index({ userId: 1, symbol: 1, status: 1 });
PriceAlertSchema.index({ status: 1, expiresAt: 1 });

export const PriceAlertModel = mongoose.model<IPriceAlert>('PriceAlert', PriceAlertSchema);
