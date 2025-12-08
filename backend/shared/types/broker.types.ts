/**
 * Broker Types - Broker Integration and Sync
 */

import { ObjectId } from 'mongodb';
import { Timestamps, Exchange, Segment } from './common.types';
// Trade type used for documentation reference

// ============= Broker Types =============

export type BrokerType = 'zerodha' | 'upstox' | 'angel' | 'groww' | 'fyers';

export const BROKER_INFO: Record<BrokerType, { name: string; apiVersion: string }> = {
  zerodha: { name: 'Zerodha Kite', apiVersion: 'v3' },
  upstox: { name: 'Upstox Pro', apiVersion: 'v2' },
  angel: { name: 'Angel One', apiVersion: 'v1' },
  groww: { name: 'Groww', apiVersion: 'v1' },
  fyers: { name: 'Fyers', apiVersion: 'v3' },
};

// ============= Sync Settings =============

export interface SyncSettings {
  autoSync: boolean;
  syncInterval: number; // minutes
  syncTime?: string; // HH:mm format
  syncSegments: Segment[];
  syncExchanges: Exchange[];
  lastSyncAt?: Date;
  nextSyncAt?: Date;
}

export const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  autoSync: true,
  syncInterval: 60,
  syncSegments: ['equity', 'futures', 'options'],
  syncExchanges: ['NSE', 'BSE', 'NFO'],
};

// ============= Broker Account =============

export interface BrokerAccount extends Timestamps {
  _id: ObjectId;
  userId: ObjectId;
  broker: BrokerType;
  brokerId: string;
  clientId: string;
  clientName?: string;
  accessToken: string; // encrypted
  refreshToken?: string; // encrypted
  tokenExpiresAt: Date;
  isActive: boolean;
  isPrimary: boolean;
  permissions: string[];
  syncSettings: SyncSettings;
  lastSyncAt?: Date;
  lastSyncStatus?: 'success' | 'failed' | 'partial';
  lastSyncError?: string;
  metadata?: Record<string, unknown>;
}

// ============= Broker Account DTOs =============

export interface CreateBrokerAccountDTO {
  broker: BrokerType;
  authCode: string;
  redirectUri: string;
  isPrimary?: boolean;
  syncSettings?: Partial<SyncSettings>;
}

export interface UpdateBrokerAccountDTO {
  isPrimary?: boolean;
  isActive?: boolean;
  syncSettings?: Partial<SyncSettings>;
}

export interface BrokerAccountResponseDTO {
  id: string;
  userId: string;
  broker: BrokerType;
  brokerName: string;
  clientId: string;
  clientName?: string;
  isActive: boolean;
  isPrimary: boolean;
  permissions: string[];
  syncSettings: SyncSettings;
  tokenExpiresAt: Date;
  isTokenValid: boolean;
  lastSyncAt?: Date;
  lastSyncStatus?: string;
  createdAt: Date;
}

// ============= OAuth Flow =============

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
}

export interface OAuthTokenRequest {
  code: string;
  redirectUri: string;
  grantType: 'authorization_code' | 'refresh_token';
  refreshToken?: string;
}

export interface OAuthTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  userId?: string;
  userName?: string;
  email?: string;
  permissions?: string[];
}

export interface GenerateAuthUrlDTO {
  broker: BrokerType;
  redirectUri: string;
  state?: string;
}

export interface AuthUrlResponse {
  authUrl: string;
  state: string;
}

// ============= Sync Job =============

export type SyncJobStatus = 'queued' | 'in_progress' | 'success' | 'failed' | 'cancelled';
export type SyncJobType = 'incremental' | 'full' | 'historical';

export interface SyncStats {
  tradesFound: number;
  tradesCreated: number;
  tradesUpdated: number;
  tradesSkipped: number;
  startDate?: Date;
  endDate?: Date;
  duration: number; // milliseconds
}

export interface SyncError {
  code: string;
  message: string;
  timestamp: Date;
  recoverable: boolean;
  retryAfter?: number;
}

export interface SyncJob {
  id: string;
  brokerAccountId: ObjectId;
  userId: ObjectId;
  type: SyncJobType;
  status: SyncJobStatus;
  progress: number; // 0-100
  currentStep: string;
  startedAt?: Date;
  completedAt?: Date;
  stats?: SyncStats;
  errors: SyncError[];
  retryCount: number;
  maxRetries: number;
  scheduledFor?: Date;
  createdAt: Date;
}

export interface SyncJobDTO {
  id: string;
  brokerAccountId: string;
  broker: BrokerType;
  type: SyncJobType;
  status: SyncJobStatus;
  progress: number;
  currentStep: string;
  startedAt?: Date;
  completedAt?: Date;
  stats?: SyncStats;
  errors: SyncError[];
  createdAt: Date;
}

export interface StartSyncDTO {
  brokerAccountId: string;
  type?: SyncJobType;
  fromDate?: Date;
  toDate?: Date;
  forceRefresh?: boolean;
}

// ============= Broker Trade (Raw from API) =============

export interface BrokerTrade {
  brokerTradeId: string;
  orderId?: string;
  symbol: string;
  exchange: string;
  segment: string;
  instrumentType?: string;
  tradeType: string;
  transactionType: 'buy' | 'sell';
  quantity: number;
  price: number;
  timestamp: Date;
  orderType?: string;
  product?: string;
  brokerage?: number;
  taxes?: {
    stt?: number;
    stampDuty?: number;
    gst?: number;
    sebiCharges?: number;
    exchangeCharges?: number;
  };
  rawData?: Record<string, unknown>;
}

// ============= Broker Adapter Interface =============

export interface IBrokerAdapter {
  broker: BrokerType;
  
  // OAuth
  getAuthUrl(redirectUri: string, state?: string): string;
  exchangeToken(request: OAuthTokenRequest): Promise<OAuthTokenResponse>;
  refreshToken(refreshToken: string): Promise<OAuthTokenResponse>;
  
  // Trade Data
  fetchTrades(accessToken: string, from: Date, to: Date): Promise<BrokerTrade[]>;
  fetchPositions(accessToken: string): Promise<unknown[]>;
  fetchHoldings(accessToken: string): Promise<unknown[]>;
  
  // Account Info
  getProfile(accessToken: string): Promise<{
    userId: string;
    userName: string;
    email?: string;
    phone?: string;
  }>;
  
  // Validation
  validateToken(accessToken: string): Promise<boolean>;
}

// ============= Token Encryption =============

export interface EncryptedToken {
  ciphertext: string;
  iv: string;
  tag: string;
  version: number;
}

export interface TokenEncryptionConfig {
  algorithm: string;
  keyDerivation: 'hkdf' | 'pbkdf2';
  iterations?: number;
  saltLength: number;
  ivLength: number;
  tagLength: number;
}

// ============= Sync Events =============

export type SyncEventType =
  | 'sync.started'
  | 'sync.progress'
  | 'sync.completed'
  | 'sync.failed'
  | 'sync.cancelled';

export interface SyncEvent {
  type: SyncEventType;
  jobId: string;
  userId: string;
  brokerAccountId: string;
  timestamp: Date;
  data: {
    progress?: number;
    step?: string;
    stats?: SyncStats;
    error?: SyncError;
  };
}
