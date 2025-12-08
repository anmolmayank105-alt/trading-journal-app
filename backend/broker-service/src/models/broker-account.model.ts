/**
 * Broker Account Mongoose Model
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import CryptoJS from 'crypto-js';
import { brokerConfig } from '../config';

// ============= Types =============

export type BrokerType = 'zerodha' | 'angel' | 'upstox' | 'dhan' | 'fyers';
export type AccountStatus = 'active' | 'expired' | 'revoked' | 'error';

export interface BrokerAccountDocument extends Document {
  userId: Types.ObjectId;
  broker: BrokerType;
  brokerId: string;
  displayName: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiry: Date;
  status: AccountStatus;
  lastSync?: Date;
  syncError?: string;
  metadata: {
    clientId?: string;
    userName?: string;
    email?: string;
    phone?: string;
    broker_specific?: Record<string, unknown>;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  encryptToken(token: string): string;
  decryptToken(encryptedToken: string): string;
  getAccessToken(): string;
  isTokenExpired(): boolean;
}

export interface BrokerAccountModel extends Model<BrokerAccountDocument> {
  findByUser(userId: string): Promise<BrokerAccountDocument[]>;
  findActiveByUser(userId: string): Promise<BrokerAccountDocument[]>;
  findByBroker(userId: string, broker: BrokerType): Promise<BrokerAccountDocument | null>;
}

// ============= Schema =============

const brokerAccountSchema = new Schema<BrokerAccountDocument, BrokerAccountModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    broker: {
      type: String,
      enum: ['zerodha', 'angel', 'upstox', 'dhan', 'fyers'],
      required: true,
    },
    brokerId: {
      type: String,
      required: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    accessToken: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
    },
    tokenExpiry: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'revoked', 'error'],
      default: 'active',
    },
    lastSync: {
      type: Date,
    },
    syncError: {
      type: String,
    },
    metadata: {
      clientId: String,
      userName: String,
      email: String,
      phone: String,
      broker_specific: Schema.Types.Mixed,
    },
    isActive: {
      type: Boolean,
      default: true,
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
        ret.accessToken = undefined;
        ret.refreshToken = undefined;
        return ret;
      },
    },
  }
);

// ============= Indexes =============

brokerAccountSchema.index({ userId: 1, broker: 1 }, { unique: true });
brokerAccountSchema.index({ userId: 1, isActive: 1 });
brokerAccountSchema.index({ tokenExpiry: 1 });

// ============= Instance Methods =============

brokerAccountSchema.methods.encryptToken = function(token: string): string {
  return CryptoJS.AES.encrypt(token, brokerConfig.encryptionKey).toString();
};

brokerAccountSchema.methods.decryptToken = function(encryptedToken: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedToken, brokerConfig.encryptionKey);
  return bytes.toString(CryptoJS.enc.Utf8);
};

brokerAccountSchema.methods.getAccessToken = function(): string {
  return this.decryptToken(this.accessToken);
};

brokerAccountSchema.methods.isTokenExpired = function(): boolean {
  return new Date() > this.tokenExpiry;
};

// ============= Pre-save Hook =============

brokerAccountSchema.pre('save', function(next) {
  // Check token expiry and update status
  if (this.isTokenExpired() && this.status === 'active') {
    this.status = 'expired';
  }
  next();
});

// ============= Static Methods =============

brokerAccountSchema.statics.findByUser = async function(userId: string): Promise<BrokerAccountDocument[]> {
  return this.find({ userId, isActive: true }).sort({ createdAt: -1 });
};

brokerAccountSchema.statics.findActiveByUser = async function(userId: string): Promise<BrokerAccountDocument[]> {
  return this.find({ userId, isActive: true, status: 'active' }).sort({ createdAt: -1 });
};

brokerAccountSchema.statics.findByBroker = async function(
  userId: string, 
  broker: BrokerType
): Promise<BrokerAccountDocument | null> {
  return this.findOne({ userId, broker, isActive: true });
};

export const BrokerAccountModel = mongoose.model<BrokerAccountDocument, BrokerAccountModel>(
  'BrokerAccount',
  brokerAccountSchema
);
