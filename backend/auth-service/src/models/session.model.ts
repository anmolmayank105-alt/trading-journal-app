/**
 * Session Model for tracking user sessions
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface SessionDocument extends Document {
  userId: mongoose.Types.ObjectId;
  refreshToken: string;
  userAgent: string;
  ip: string;
  isValid: boolean;
  expiresAt: Date;
  createdAt: Date;
  lastActivityAt: Date;
}

const sessionSchema = new Schema<SessionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    refreshToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userAgent: { type: String },
    ip: { type: String },
    isValid: { type: Boolean, default: true },
    expiresAt: { type: Date, required: true },
    lastActivityAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// TTL index to auto-delete expired sessions
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for user sessions lookup
sessionSchema.index({ userId: 1, isValid: 1 });

export const SessionModel = mongoose.model<SessionDocument>('Session', sessionSchema);
