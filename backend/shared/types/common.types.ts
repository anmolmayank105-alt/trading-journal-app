/**
 * Common Types - Shared across all modules
 */

import { ObjectId } from 'mongodb';

// ============= Base Types =============

export type Exchange = 'NSE' | 'BSE' | 'MCX' | 'NFO';
export type Segment = 'equity' | 'futures' | 'options' | 'commodity';
export type InstrumentType = 'stock' | 'future' | 'call' | 'put' | 'commodity';
export type TradeType = 'intraday' | 'delivery' | 'swing';
export type Position = 'long' | 'short';
export type TradeStatus = 'open' | 'closed' | 'partial' | 'cancelled';
export type OrderType = 'market' | 'limit' | 'stop_loss' | 'trailing_stop';

// ============= Pagination =============

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============= Date Range =============

export interface DateRange {
  from: Date;
  to: Date;
}

export type Period = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'all_time';

// ============= Response Types =============

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

// ============= Timestamps =============

export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

export interface SoftDelete {
  isDeleted: boolean;
  deletedAt?: Date;
}

// ============= ID Types =============

export type ID = string | ObjectId;

export interface Identifiable {
  _id: ObjectId;
  id?: string;
}

// ============= Taxes =============

export interface Taxes {
  stt: number;
  stampDuty: number;
  gst: number;
  sebiTurnover: number;
  exchangeTxn: number;
}

export const DEFAULT_TAXES: Taxes = {
  stt: 0,
  stampDuty: 0,
  gst: 0,
  sebiTurnover: 0,
  exchangeTxn: 0,
};

// ============= P&L =============

export interface PnL {
  gross: number;
  net: number;
  charges: number;
  brokerage: number;
  taxes: Taxes;
  percentageGain: number;
  isProfit: boolean;
}

export const DEFAULT_PNL: PnL = {
  gross: 0,
  net: 0,
  charges: 0,
  brokerage: 0,
  taxes: { ...DEFAULT_TAXES },
  percentageGain: 0,
  isProfit: false,
};

// ============= Filter Operators =============

export interface FilterOperators<T> {
  $eq?: T;
  $ne?: T;
  $gt?: T;
  $gte?: T;
  $lt?: T;
  $lte?: T;
  $in?: T[];
  $nin?: T[];
  $exists?: boolean;
  $regex?: string;
}

// ============= Sort Options =============

export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}

// ============= Bulk Operation Results =============

export interface BulkResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{
    index: number;
    error: string;
    data?: unknown;
  }>;
}

// ============= Import/Export =============

export interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: Array<{
    row: number;
    error: string;
    data?: unknown;
  }>;
}

export interface ExportOptions {
  format: 'csv' | 'excel' | 'json';
  fields?: string[];
  dateFormat?: string;
}

// ============= Cache =============

export interface CacheOptions {
  ttl?: number; // seconds
  prefix?: string;
  tags?: string[];
}

// ============= Event Types =============

export interface DomainEvent {
  type: string;
  payload: unknown;
  timestamp: Date;
  userId?: string;
  correlationId?: string;
}

// ============= Health Check =============

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  services: {
    name: string;
    status: 'up' | 'down';
    latency?: number;
    message?: string;
  }[];
}
