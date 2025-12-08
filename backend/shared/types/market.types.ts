/**
 * Market Data Types - Real-time and Historical Market Data
 */

import { Exchange } from './common.types';

// ============= Intervals =============

export type CandleInterval = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' | '1M';

export const INTERVAL_SECONDS: Record<CandleInterval, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
  '1w': 604800,
  '1M': 2592000,
};

// ============= OHLC Candle =============

export interface OHLCCandle {
  symbol: string;
  exchange: Exchange;
  interval: CandleInterval;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  value?: number;
  openInterest?: number;
  trades?: number;
  vwap?: number;
}

// ============= Quote / Tick =============

export interface Quote {
  symbol: string;
  exchange: Exchange;
  lastPrice: number;
  lastQuantity: number;
  lastTradeTime: Date;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  close: number;
  previousClose: number;
  volume: number;
  value: number;
  averagePrice: number;
  upperCircuit: number;
  lowerCircuit: number;
  openInterest?: number;
  oiChange?: number;
  bid?: number;
  bidQty?: number;
  ask?: number;
  askQty?: number;
  depth?: OrderBookDepth;
  timestamp: Date;
}

// ============= Order Book =============

export interface DepthLevel {
  price: number;
  quantity: number;
  orders: number;
}

export interface OrderBookDepth {
  buy: DepthLevel[];
  sell: DepthLevel[];
  totalBuyQty: number;
  totalSellQty: number;
  lastUpdated: Date;
}

// ============= Index Data =============

export interface IndexData {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  close: number;
  previousClose: number;
  timestamp: Date;
  advances: number;
  declines: number;
  unchanged: number;
}

export const MAJOR_INDICES = [
  'NIFTY 50',
  'SENSEX',
  'NIFTY BANK',
  'NIFTY IT',
  'NIFTY MIDCAP 50',
  'NIFTY NEXT 50',
  'NIFTY FIN SERVICE',
  'NIFTY AUTO',
  'NIFTY PHARMA',
  'NIFTY METAL',
] as const;

export type MajorIndex = typeof MAJOR_INDICES[number];

// ============= Symbol Info =============

export interface SymbolInfo {
  symbol: string;
  exchange: Exchange;
  name: string;
  isin?: string;
  sector?: string;
  industry?: string;
  lotSize: number;
  tickSize: number;
  instrumentType: string;
  segment: string;
  token?: string;
  expiry?: Date;
  strike?: number;
  optionType?: 'CE' | 'PE';
}

// ============= Market Status =============

export type MarketStatus = 'pre_open' | 'open' | 'closed' | 'post_close';

export interface MarketStatusInfo {
  exchange: Exchange;
  status: MarketStatus;
  message: string;
  nextChange: Date;
  timestamp: Date;
}

export const MARKET_TIMINGS: Record<Exchange, { open: string; close: string }> = {
  NSE: { open: '09:15', close: '15:30' },
  BSE: { open: '09:15', close: '15:30' },
  MCX: { open: '09:00', close: '23:30' },
  NFO: { open: '09:15', close: '15:30' },
};

// ============= DTOs =============

export interface GetQuoteDTO {
  symbol: string;
  exchange: Exchange;
}

export interface GetQuotesDTO {
  symbols: Array<{ symbol: string; exchange: Exchange }>;
}

export interface GetCandlesDTO {
  symbol: string;
  exchange: Exchange;
  interval: CandleInterval;
  from: Date;
  to: Date;
  limit?: number;
}

export interface SearchSymbolDTO {
  query: string;
  exchange?: Exchange;
  segment?: string;
  limit?: number;
}

export interface SymbolSearchResult {
  symbol: string;
  exchange: Exchange;
  name: string;
  segment: string;
  instrumentType: string;
}

// ============= WebSocket =============

export type WebSocketMessageType =
  | 'subscribe'
  | 'unsubscribe'
  | 'tick'
  | 'depth'
  | 'index'
  | 'error'
  | 'connected'
  | 'disconnected';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  channel?: string;
  data?: unknown;
  timestamp: Date;
}

export interface SubscribeRequest {
  symbols: Array<{ symbol: string; exchange: Exchange }>;
  mode?: 'ltp' | 'quote' | 'full';
}

export interface TickUpdate {
  symbol: string;
  exchange: Exchange;
  ltp: number;
  ltq: number;
  ltt: Date;
  change: number;
  changePercent: number;
  volume: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

// ============= Watchlist =============

export interface WatchlistSymbol {
  symbol: string;
  exchange: Exchange;
  addedAt: Date;
  alertPrice?: number;
  alertType?: 'above' | 'below' | 'change_percent';
  notes?: string;
  customOrder: number;
}

export interface WatchlistSettings {
  autoRefresh: boolean;
  refreshInterval: number;
  showChangePercent: boolean;
  showVolume: boolean;
  showMarketCap: boolean;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

export interface Watchlist {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  color?: string;
  sortOrder: number;
  symbols: WatchlistSymbol[];
  settings: WatchlistSettings;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWatchlistDTO {
  name: string;
  description?: string;
  isDefault?: boolean;
  color?: string;
  symbols?: Array<{ symbol: string; exchange: Exchange }>;
}

export interface UpdateWatchlistDTO {
  name?: string;
  description?: string;
  isDefault?: boolean;
  color?: string;
  settings?: Partial<WatchlistSettings>;
}

export interface AddSymbolDTO {
  symbol: string;
  exchange: Exchange;
  alertPrice?: number;
  alertType?: 'above' | 'below' | 'change_percent';
  notes?: string;
}

// ============= Price Alerts =============

export type AlertCondition = 'above' | 'below' | 'crosses' | 'change_percent';
export type AlertStatus = 'active' | 'triggered' | 'expired' | 'disabled';

export interface PriceAlert {
  id: string;
  userId: string;
  symbol: string;
  exchange: Exchange;
  condition: AlertCondition;
  targetPrice: number;
  currentPrice?: number;
  status: AlertStatus;
  triggeredAt?: Date;
  expiresAt?: Date;
  notificationSent: boolean;
  createdAt: Date;
}

export interface CreateAlertDTO {
  symbol: string;
  exchange: Exchange;
  condition: AlertCondition;
  targetPrice: number;
  expiresAt?: Date;
}

// ============= Technical Indicators =============

export interface TechnicalIndicators {
  sma: Record<number, number>; // period -> value
  ema: Record<number, number>;
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
  };
  atr: number;
  adx: number;
  supertrend: {
    value: number;
    direction: 'up' | 'down';
  };
}

// ============= Cache Keys =============

export const CACHE_KEYS = {
  quote: (exchange: string, symbol: string) => `market:quote:${exchange}:${symbol}`,
  index: (name: string) => `market:index:${name}`,
  candle: (exchange: string, symbol: string, interval: string) =>
    `market:candle:${exchange}:${symbol}:${interval}`,
  watchlist: (userId: string) => `market:watchlist:${userId}`,
  marketStatus: (exchange: string) => `market:status:${exchange}`,
};

export const CACHE_TTL = {
  quote: 5, // seconds
  index: 3,
  candle: 60,
  watchlist: 300,
  marketStatus: 60,
};
