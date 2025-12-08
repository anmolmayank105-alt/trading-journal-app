/**
 * Sync Log Mongoose Model
 */

import mongoose, { Schema, Document, Types } from 'mongoose';
import { BrokerType } from './broker-account.model';

export type SyncStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type SyncType = 'full' | 'incremental' | 'positions' | 'orders' | 'trades';

export interface SyncLogDocument extends Document {
  userId: Types.ObjectId;
  brokerAccountId: Types.ObjectId;
  broker: BrokerType;
  syncType: SyncType;
  status: SyncStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  syncErrors: Array<{
    message: string;
    data?: Record<string, unknown>;
    timestamp: Date;
  }>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const syncLogSchema = new Schema<SyncLogDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    brokerAccountId: {
      type: Schema.Types.ObjectId,
      ref: 'BrokerAccount',
      required: true,
    },
    broker: {
      type: String,
      enum: ['zerodha', 'angel', 'upstox', 'dhan', 'fyers'],
      required: true,
    },
    syncType: {
      type: String,
      enum: ['full', 'incremental', 'positions', 'orders', 'trades'],
      default: 'full',
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'failed'],
      default: 'pending',
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    duration: {
      type: Number,
    },
    recordsProcessed: {
      type: Number,
      default: 0,
    },
    recordsCreated: {
      type: Number,
      default: 0,
    },
    recordsUpdated: {
      type: Number,
      default: 0,
    },
    recordsSkipped: {
      type: Number,
      default: 0,
    },
    syncErrors: [{
      message: String,
      data: Schema.Types.Mixed,
      timestamp: { type: Date, default: Date.now },
    }],
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id?.toString();
        ret._id = undefined;
        ret.__v = undefined;
        return ret;
      },
    },
  }
);

// ============= Indexes =============

syncLogSchema.index({ userId: 1, createdAt: -1 });
syncLogSchema.index({ brokerAccountId: 1, createdAt: -1 });
syncLogSchema.index({ status: 1 });

export const SyncLogModel = mongoose.model<SyncLogDocument>('SyncLog', syncLogSchema);
