/**
 * Trade Types - Trade Management
 */

import { ObjectId } from 'mongodb';
import {
  Exchange,
  Segment,
  InstrumentType,
  TradeType,
  Position,
  TradeStatus,
  OrderType,
  Taxes,
  PnL,
  Timestamps,
  DateRange,
  PaginationParams,
  DEFAULT_TAXES,
} from './common.types';

// ============= Trade Leg =============

export interface TradeLeg {
  price: number;
  quantity: number;
  timestamp: Date;
  orderType: OrderType;
  brokerage: number;
  taxes: Taxes;
}

export const createDefaultTradeLeg = (
  price: number,
  quantity: number,
  timestamp: Date = new Date()
): TradeLeg => ({
  price,
  quantity,
  timestamp,
  orderType: 'market',
  brokerage: 0,
  taxes: { ...DEFAULT_TAXES },
});

// ============= Trade Metadata =============

export interface TradeMetadata {
  syncedAt?: Date;
  syncSource: 'manual' | 'broker_api' | 'import';
  importBatch?: string;
  modifiedManually: boolean;
  originalData?: Record<string, unknown>;
}

// ============= Trade Entity =============

export interface Trade extends Timestamps {
  _id: ObjectId;
  userId: ObjectId;
  brokerId?: ObjectId;
  brokerTradeId?: string;
  symbol: string;
  exchange: Exchange;
  segment: Segment;
  instrumentType: InstrumentType;
  tradeType: TradeType;
  position: Position;
  entry: TradeLeg;
  exit?: TradeLeg;
  status: TradeStatus;
  pnl: PnL;
  stopLoss?: number;
  target?: number;
  riskRewardRatio?: number;
  strategy?: string;
  tags: string[];
  notes?: string;
  holdingPeriod?: number; // in minutes
  metadata: TradeMetadata;
}

// ============= Trade DTOs =============

export interface CreateTradeDTO {
  symbol: string;
  exchange: Exchange;
  segment?: Segment;
  instrumentType?: InstrumentType;
  tradeType: TradeType;
  position: Position;
  entryPrice: number;
  quantity: number;
  entryTimestamp?: Date;
  orderType?: OrderType;
  brokerage?: number;
  taxes?: Partial<Taxes>;
  stopLoss?: number;
  target?: number;
  strategy?: string;
  psychology?: string;
  mistake?: string;
  tags?: string[];
  notes?: string;
  brokerId?: string;
}

export interface UpdateTradeDTO {
  symbol?: string;
  exchange?: Exchange;
  segment?: Segment;
  instrumentType?: InstrumentType;
  tradeType?: TradeType;
  position?: Position;
  entryPrice?: number;
  quantity?: number;
  entryTimestamp?: Date;
  orderType?: OrderType;
  brokerage?: number;
  taxes?: Partial<Taxes>;
  stopLoss?: number;
  target?: number;
  strategy?: string;
  psychology?: string;
  mistake?: string;
  tags?: string[];
  notes?: string;
}

export interface ExitTradeDTO {
  exitPrice: number;
  exitQuantity?: number;
  exitTimestamp?: Date;
  orderType?: OrderType;
  brokerage?: number;
  taxes?: Partial<Taxes>;
  notes?: string;
}

export interface TradeResponseDTO {
  id: string;
  userId: string;
  brokerId?: string;
  brokerTradeId?: string;
  symbol: string;
  exchange: Exchange;
  segment: Segment;
  instrumentType: InstrumentType;
  tradeType: TradeType;
  position: Position;
  entry: TradeLeg;
  exit?: TradeLeg;
  status: TradeStatus;
  pnl: PnL;
  stopLoss?: number;
  target?: number;
  riskRewardRatio?: number;
  strategy?: string;
  tags: string[];
  notes?: string;
  holdingPeriod?: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============= Trade Filters =============

export interface TradeFilters {
  status?: TradeStatus | TradeStatus[];
  symbol?: string | string[];
  exchange?: Exchange | Exchange[];
  segment?: Segment | Segment[];
  tradeType?: TradeType | TradeType[];
  position?: Position;
  strategy?: string | string[];
  tags?: string[];
  dateRange?: DateRange;
  minPnL?: number;
  maxPnL?: number;
  brokerId?: string;
}

export interface TradeQueryDTO extends PaginationParams, TradeFilters {
  search?: string;
}

// ============= Trade Statistics =============

export interface TradeStatsDTO {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  winRate: number;
  totalPnL: PnL;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  profitFactor: number;
  averageHoldingPeriod: number;
  bySegment: Record<Segment, { trades: number; pnl: number }>;
  byTradeType: Record<TradeType, { trades: number; pnl: number }>;
}

// ============= Position Tracking =============

export interface PositionDTO {
  symbol: string;
  exchange: Exchange;
  segment: Segment;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  trades: string[];
}

// ============= Import/Export =============

export interface TradeImportRow {
  symbol: string;
  exchange: string;
  tradeType: string;
  position: string;
  entryPrice: number;
  quantity: number;
  entryDate: string;
  exitPrice?: number;
  exitDate?: string;
  brokerage?: number;
  stopLoss?: number;
  target?: number;
  strategy?: string;
  tags?: string;
  notes?: string;
}

export interface TradeImportOptions {
  dateFormat?: string;
  skipDuplicates?: boolean;
  defaultExchange?: Exchange;
  defaultTradeType?: TradeType;
  brokerId?: string;
}

// ============= Reconciliation =============

export interface ReconcileResult {
  matched: number;
  created: number;
  updated: number;
  conflicts: Array<{
    brokerTradeId: string;
    existingTrade: TradeResponseDTO;
    brokerTrade: unknown;
    differences: string[];
  }>;
}

// ============= Trade Events =============

export type TradeEventType =
  | 'trade.created'
  | 'trade.updated'
  | 'trade.closed'
  | 'trade.deleted'
  | 'trade.imported'
  | 'trade.synced';

export interface TradeEvent {
  type: TradeEventType;
  tradeId: string;
  userId: string;
  timestamp: Date;
  data: Partial<Trade>;
  metadata?: Record<string, unknown>;
}
