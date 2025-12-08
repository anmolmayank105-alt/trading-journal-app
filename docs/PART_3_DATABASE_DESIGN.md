# Part 3: Database Design

**Date**: November 27, 2025  
**Status**: ✅ Completed  
**Version**: 0.3.0

---

## Overview

Part 3 provides comprehensive database design for the Stock Trade Tracking Application including:
1. MongoDB schemas for users, trades, analytics, watchlist
2. OHLC candle storage (time-series optimized)
3. Indexing strategy for fast queries
4. Redis cache structures for real-time data

**MongoDB Atlas URL**: `mongodb+srv://starunkumarainds2024_db_user:2fgmUJliWHq9YUIl@cluster0.bc9ss4x.mongodb.net/`

---

## Table of Contents

1. [MongoDB Schemas](#1-mongodb-schemas)
   - [Users Collection](#users-collection)
   - [Trades Collection](#trades-collection)
   - [Analytics Collection](#analytics-collection)
   - [Watchlist Collection](#watchlist-collection)
   - [OHLC Candles Collection](#ohlc-candles-collection)
2. [Indexing Strategy](#2-indexing-strategy)
3. [Redis Cache Structures](#3-redis-cache-structures)
   - [Live Market Data](#live-market-data)
   - [Index Prices](#index-prices)
   - [Watchlist Prices](#watchlist-prices)
4. [Connection Configuration](#4-connection-configuration)
5. [Schema Validation Rules](#5-schema-validation-rules)

---

## 1. MongoDB Schemas

### Users Collection

**Collection Name**: `users`

**Purpose**: Store user authentication, profile, preferences, and broker account references

**Schema**:

```json
{
  "_id": "ObjectId",
  "email": "string (unique, required)",
  "username": "string (unique, required)",
  "passwordHash": "string (required)",
  "firstName": "string",
  "lastName": "string",
  "phone": "string",
  "avatar": "string (URL)",
  "roles": ["string"],
  "verified": "boolean (default: false)",
  "preferences": {
    "theme": "string (light|dark)",
    "currency": "string (default: INR)",
    "timezone": "string (default: Asia/Kolkata)",
    "notifications": {
      "email": "boolean (default: true)",
      "push": "boolean (default: true)",
      "sms": "boolean (default: false)",
      "priceAlerts": "boolean (default: true)",
      "tradeAlerts": "boolean (default: true)"
    },
    "defaultBroker": "ObjectId (ref: broker_accounts)"
  },
  "brokerAccounts": [
    {
      "brokerId": "ObjectId (ref: broker_accounts)",
      "isPrimary": "boolean"
    }
  ],
  "subscription": {
    "plan": "string (free|basic|premium)",
    "status": "string (active|expired|cancelled)",
    "startDate": "Date",
    "endDate": "Date"
  },
  "createdAt": "Date (default: Date.now)",
  "updatedAt": "Date (default: Date.now)",
  "lastLoginAt": "Date",
  "lastLoginIP": "string",
  "isActive": "boolean (default: true)",
  "isDeleted": "boolean (default: false)",
  "deletedAt": "Date"
}
```

**TypeScript Interface**:

```typescript
interface User {
  _id: ObjectId;
  email: string;
  username: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  roles: string[];
  verified: boolean;
  preferences: {
    theme: 'light' | 'dark';
    currency: string;
    timezone: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
      priceAlerts: boolean;
      tradeAlerts: boolean;
    };
    defaultBroker?: ObjectId;
  };
  brokerAccounts: Array<{
    brokerId: ObjectId;
    isPrimary: boolean;
  }>;
  subscription: {
    plan: 'free' | 'basic' | 'premium';
    status: 'active' | 'expired' | 'cancelled';
    startDate: Date;
    endDate: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  lastLoginIP?: string;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
}
```

**Indexes**:
```javascript
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ createdAt: -1 });
db.users.createIndex({ isActive: 1, isDeleted: 1 });
db.users.createIndex({ "subscription.status": 1 });
db.users.createIndex({ lastLoginAt: -1 });
```

---

### Trades Collection

**Collection Name**: `trades`

**Purpose**: Store individual trade records with entry/exit data, P&L calculations, and broker metadata

**Schema**:

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (ref: users, required, indexed)",
  "brokerId": "ObjectId (ref: broker_accounts, required)",
  "brokerTradeId": "string (unique per broker, indexed)",
  "symbol": "string (required, indexed)",
  "exchange": "string (NSE|BSE|MCX|NFO, required)",
  "segment": "string (equity|futures|options|commodity)",
  "instrumentType": "string (stock|future|call|put|commodity)",
  "tradeType": "string (intraday|delivery|swing, required)",
  "position": "string (long|short, required)",
  "entry": {
    "price": "number (required)",
    "quantity": "number (required)",
    "timestamp": "Date (required, indexed)",
    "orderType": "string (market|limit|stop_loss)",
    "brokerage": "number (default: 0)",
    "taxes": {
      "stt": "number (default: 0)",
      "stampDuty": "number (default: 0)",
      "gst": "number (default: 0)",
      "sebiTurnover": "number (default: 0)",
      "exchangeTxn": "number (default: 0)"
    }
  },
  "exit": {
    "price": "number",
    "quantity": "number",
    "timestamp": "Date (indexed)",
    "orderType": "string (market|limit|stop_loss|trailing_stop)",
    "brokerage": "number (default: 0)",
    "taxes": {
      "stt": "number (default: 0)",
      "stampDuty": "number (default: 0)",
      "gst": "number (default: 0)",
      "sebiTurnover": "number (default: 0)",
      "exchangeTxn": "number (default: 0)"
    }
  },
  "status": "string (open|closed|partial, default: open, indexed)",
  "pnl": {
    "gross": "number (default: 0)",
    "net": "number (default: 0)",
    "percentage": "number (default: 0)",
    "charges": "number (default: 0)"
  },
  "stopLoss": "number",
  "target": "number",
  "tags": ["string"],
  "notes": "string",
  "strategy": "string",
  "riskRewardRatio": "number",
  "holdingPeriod": "number (in minutes)",
  "metadata": {
    "syncedAt": "Date",
    "syncSource": "string (manual|broker_api|import)",
    "importBatch": "string",
    "modifiedManually": "boolean (default: false)"
  },
  "createdAt": "Date (default: Date.now)",
  "updatedAt": "Date (default: Date.now)"
}
```

**TypeScript Interface**:

```typescript
interface Trade {
  _id: ObjectId;
  userId: ObjectId;
  brokerId: ObjectId;
  brokerTradeId?: string;
  symbol: string;
  exchange: 'NSE' | 'BSE' | 'MCX' | 'NFO';
  segment: 'equity' | 'futures' | 'options' | 'commodity';
  instrumentType: 'stock' | 'future' | 'call' | 'put' | 'commodity';
  tradeType: 'intraday' | 'delivery' | 'swing';
  position: 'long' | 'short';
  entry: {
    price: number;
    quantity: number;
    timestamp: Date;
    orderType: 'market' | 'limit' | 'stop_loss';
    brokerage: number;
    taxes: {
      stt: number;
      stampDuty: number;
      gst: number;
      sebiTurnover: number;
      exchangeTxn: number;
    };
  };
  exit?: {
    price: number;
    quantity: number;
    timestamp: Date;
    orderType: 'market' | 'limit' | 'stop_loss' | 'trailing_stop';
    brokerage: number;
    taxes: {
      stt: number;
      stampDuty: number;
      gst: number;
      sebiTurnover: number;
      exchangeTxn: number;
    };
  };
  status: 'open' | 'closed' | 'partial';
  pnl: {
    gross: number;
    net: number;
    percentage: number;
    charges: number;
  };
  stopLoss?: number;
  target?: number;
  tags?: string[];
  notes?: string;
  strategy?: string;
  riskRewardRatio?: number;
  holdingPeriod?: number;
  metadata: {
    syncedAt?: Date;
    syncSource: 'manual' | 'broker_api' | 'import';
    importBatch?: string;
    modifiedManually: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**:
```javascript
db.trades.createIndex({ userId: 1, "entry.timestamp": -1 });
db.trades.createIndex({ userId: 1, status: 1 });
db.trades.createIndex({ userId: 1, symbol: 1 });
db.trades.createIndex({ brokerTradeId: 1, brokerId: 1 }, { unique: true, sparse: true });
db.trades.createIndex({ "entry.timestamp": -1 });
db.trades.createIndex({ "exit.timestamp": -1 });
db.trades.createIndex({ status: 1 });
db.trades.createIndex({ symbol: 1, exchange: 1 });
db.trades.createIndex({ tags: 1 });
db.trades.createIndex({ strategy: 1 });
db.trades.createIndex({ userId: 1, tradeType: 1, "entry.timestamp": -1 });
```

---

### Analytics Collection

**Collection Name**: `analytics`

**Purpose**: Store pre-calculated analytics, performance metrics, and aggregated statistics

**Schema**:

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (ref: users, required, indexed)",
  "period": "string (daily|weekly|monthly|yearly|all_time, required, indexed)",
  "startDate": "Date (required, indexed)",
  "endDate": "Date (required, indexed)",
  "calculatedAt": "Date (default: Date.now)",
  "overview": {
    "totalTrades": "number (default: 0)",
    "winningTrades": "number (default: 0)",
    "losingTrades": "number (default: 0)",
    "breakEvenTrades": "number (default: 0)",
    "winRate": "number (default: 0)",
    "profitFactor": "number (default: 0)",
    "averageWin": "number (default: 0)",
    "averageLoss": "number (default: 0)",
    "largestWin": "number (default: 0)",
    "largestLoss": "number (default: 0)",
    "averageHoldingPeriod": "number (in minutes, default: 0)"
  },
  "pnl": {
    "gross": "number (default: 0)",
    "net": "number (default: 0)",
    "charges": "number (default: 0)",
    "realized": "number (default: 0)",
    "unrealized": "number (default: 0)"
  },
  "risk": {
    "sharpeRatio": "number",
    "sortinoRatio": "number",
    "maxDrawdown": "number (default: 0)",
    "maxDrawdownPercent": "number (default: 0)",
    "recoveryFactor": "number",
    "calmarRatio": "number",
    "volatility": "number"
  },
  "bySegment": {
    "equity": {
      "trades": "number",
      "pnl": "number",
      "winRate": "number"
    },
    "futures": {
      "trades": "number",
      "pnl": "number",
      "winRate": "number"
    },
    "options": {
      "trades": "number",
      "pnl": "number",
      "winRate": "number"
    },
    "commodity": {
      "trades": "number",
      "pnl": "number",
      "winRate": "number"
    }
  },
  "byTradeType": {
    "intraday": {
      "trades": "number",
      "pnl": "number",
      "winRate": "number"
    },
    "delivery": {
      "trades": "number",
      "pnl": "number",
      "winRate": "number"
    },
    "swing": {
      "trades": "number",
      "pnl": "number",
      "winRate": "number"
    }
  },
  "byStrategy": [
    {
      "name": "string",
      "trades": "number",
      "pnl": "number",
      "winRate": "number"
    }
  ],
  "topSymbols": [
    {
      "symbol": "string",
      "trades": "number",
      "pnl": "number",
      "winRate": "number"
    }
  ],
  "dailyPnl": [
    {
      "date": "Date",
      "pnl": "number",
      "trades": "number"
    }
  ],
  "createdAt": "Date (default: Date.now)",
  "updatedAt": "Date (default: Date.now)"
}
```

**TypeScript Interface**:

```typescript
interface Analytics {
  _id: ObjectId;
  userId: ObjectId;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time';
  startDate: Date;
  endDate: Date;
  calculatedAt: Date;
  overview: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    breakEvenTrades: number;
    winRate: number;
    profitFactor: number;
    averageWin: number;
    averageLoss: number;
    largestWin: number;
    largestLoss: number;
    averageHoldingPeriod: number;
  };
  pnl: {
    gross: number;
    net: number;
    charges: number;
    realized: number;
    unrealized: number;
  };
  risk: {
    sharpeRatio?: number;
    sortinoRatio?: number;
    maxDrawdown: number;
    maxDrawdownPercent: number;
    recoveryFactor?: number;
    calmarRatio?: number;
    volatility?: number;
  };
  bySegment: {
    equity: { trades: number; pnl: number; winRate: number };
    futures: { trades: number; pnl: number; winRate: number };
    options: { trades: number; pnl: number; winRate: number };
    commodity: { trades: number; pnl: number; winRate: number };
  };
  byTradeType: {
    intraday: { trades: number; pnl: number; winRate: number };
    delivery: { trades: number; pnl: number; winRate: number };
    swing: { trades: number; pnl: number; winRate: number };
  };
  byStrategy: Array<{
    name: string;
    trades: number;
    pnl: number;
    winRate: number;
  }>;
  topSymbols: Array<{
    symbol: string;
    trades: number;
    pnl: number;
    winRate: number;
  }>;
  dailyPnl: Array<{
    date: Date;
    pnl: number;
    trades: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**:
```javascript
db.analytics.createIndex({ userId: 1, period: 1, startDate: -1 });
db.analytics.createIndex({ userId: 1, calculatedAt: -1 });
db.analytics.createIndex({ startDate: -1, endDate: -1 });
db.analytics.createIndex({ period: 1 });
```

---

### Watchlist Collection

**Collection Name**: `watchlists`

**Purpose**: Store user-defined stock watchlists with metadata and preferences

**Schema**:

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (ref: users, required, indexed)",
  "name": "string (required)",
  "description": "string",
  "isDefault": "boolean (default: false)",
  "color": "string (hex color code)",
  "sortOrder": "number (default: 0)",
  "symbols": [
    {
      "symbol": "string (required)",
      "exchange": "string (NSE|BSE|MCX|NFO, required)",
      "addedAt": "Date (default: Date.now)",
      "alertPrice": "number",
      "alertType": "string (above|below|change_percent)",
      "notes": "string",
      "customOrder": "number"
    }
  ],
  "settings": {
    "autoRefresh": "boolean (default: true)",
    "refreshInterval": "number (in seconds, default: 5)",
    "showChangePercent": "boolean (default: true)",
    "showVolume": "boolean (default: true)",
    "showMarketCap": "boolean (default: false)",
    "sortBy": "string (default: customOrder)",
    "sortDirection": "string (asc|desc, default: asc)"
  },
  "sharedWith": [
    {
      "userId": "ObjectId (ref: users)",
      "permission": "string (view|edit)",
      "sharedAt": "Date"
    }
  ],
  "isPublic": "boolean (default: false)",
  "createdAt": "Date (default: Date.now)",
  "updatedAt": "Date (default: Date.now)"
}
```

**TypeScript Interface**:

```typescript
interface Watchlist {
  _id: ObjectId;
  userId: ObjectId;
  name: string;
  description?: string;
  isDefault: boolean;
  color?: string;
  sortOrder: number;
  symbols: Array<{
    symbol: string;
    exchange: 'NSE' | 'BSE' | 'MCX' | 'NFO';
    addedAt: Date;
    alertPrice?: number;
    alertType?: 'above' | 'below' | 'change_percent';
    notes?: string;
    customOrder?: number;
  }>;
  settings: {
    autoRefresh: boolean;
    refreshInterval: number;
    showChangePercent: boolean;
    showVolume: boolean;
    showMarketCap: boolean;
    sortBy: string;
    sortDirection: 'asc' | 'desc';
  };
  sharedWith?: Array<{
    userId: ObjectId;
    permission: 'view' | 'edit';
    sharedAt: Date;
  }>;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**:
```javascript
db.watchlists.createIndex({ userId: 1, sortOrder: 1 });
db.watchlists.createIndex({ userId: 1, isDefault: 1 });
db.watchlists.createIndex({ "symbols.symbol": 1 });
db.watchlists.createIndex({ isPublic: 1 });
db.watchlists.createIndex({ createdAt: -1 });
```

---

### OHLC Candles Collection

**Collection Name**: `ohlc_candles`

**Purpose**: Store time-series candlestick data optimized for technical analysis

**Time-Series Configuration** (MongoDB 5.0+):
```javascript
db.createCollection("ohlc_candles", {
  timeseries: {
    timeField: "timestamp",
    metaField: "metadata",
    granularity: "minutes"
  }
});
```

**Schema**:

```json
{
  "_id": "ObjectId",
  "timestamp": "Date (required, indexed)",
  "metadata": {
    "symbol": "string (required, indexed)",
    "exchange": "string (NSE|BSE|MCX|NFO, required)",
    "interval": "string (1m|5m|15m|30m|1h|1d|1w|1M, required, indexed)",
    "source": "string (zerodha|upstox|finnhub)"
  },
  "open": "number (required)",
  "high": "number (required)",
  "low": "number (required)",
  "close": "number (required)",
  "volume": "number (required)",
  "openInterest": "number",
  "trades": "number",
  "vwap": "number (volume weighted average price)",
  "indicators": {
    "sma_20": "number",
    "sma_50": "number",
    "sma_200": "number",
    "ema_12": "number",
    "ema_26": "number",
    "rsi_14": "number",
    "macd": {
      "macd": "number",
      "signal": "number",
      "histogram": "number"
    },
    "bollinger": {
      "upper": "number",
      "middle": "number",
      "lower": "number"
    }
  },
  "createdAt": "Date (default: Date.now)"
}
```

**TypeScript Interface**:

```typescript
interface OHLCCandle {
  _id: ObjectId;
  timestamp: Date;
  metadata: {
    symbol: string;
    exchange: 'NSE' | 'BSE' | 'MCX' | 'NFO';
    interval: '1m' | '5m' | '15m' | '30m' | '1h' | '1d' | '1w' | '1M';
    source: 'zerodha' | 'upstox' | 'finnhub';
  };
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  openInterest?: number;
  trades?: number;
  vwap?: number;
  indicators?: {
    sma_20?: number;
    sma_50?: number;
    sma_200?: number;
    ema_12?: number;
    ema_26?: number;
    rsi_14?: number;
    macd?: {
      macd: number;
      signal: number;
      histogram: number;
    };
    bollinger?: {
      upper: number;
      middle: number;
      lower: number;
    };
  };
  createdAt: Date;
}
```

**Indexes**:
```javascript
// Time-series collections automatically index timeField and metaField
// Additional indexes for common queries:
db.ohlc_candles.createIndex({ "metadata.symbol": 1, "metadata.interval": 1, "timestamp": -1 });
db.ohlc_candles.createIndex({ "metadata.exchange": 1, "timestamp": -1 });
db.ohlc_candles.createIndex({ timestamp: -1 });
```

**TTL Index** (auto-delete old data):
```javascript
// Keep 1m candles for 7 days, 5m for 30 days, 1d forever
db.ohlc_candles.createIndex(
  { "createdAt": 1 },
  { 
    expireAfterSeconds: 604800, // 7 days
    partialFilterExpression: { "metadata.interval": "1m" }
  }
);

db.ohlc_candles.createIndex(
  { "createdAt": 1 },
  { 
    expireAfterSeconds: 2592000, // 30 days
    partialFilterExpression: { "metadata.interval": { $in: ["5m", "15m", "30m"] } }
  }
);
```

---

## 2. Indexing Strategy

### Performance Guidelines

**Compound Indexes** (optimize for common queries):

```javascript
// Users
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ isActive: 1, isDeleted: 1 });

// Trades - Most critical for performance
db.trades.createIndex({ userId: 1, "entry.timestamp": -1 });
db.trades.createIndex({ userId: 1, status: 1 });
db.trades.createIndex({ userId: 1, symbol: 1 });
db.trades.createIndex({ userId: 1, tradeType: 1, "entry.timestamp": -1 });
db.trades.createIndex({ symbol: 1, exchange: 1, "entry.timestamp": -1 });
db.trades.createIndex({ brokerTradeId: 1, brokerId: 1 }, { unique: true, sparse: true });

// Analytics
db.analytics.createIndex({ userId: 1, period: 1, startDate: -1 });
db.analytics.createIndex({ userId: 1, calculatedAt: -1 });

// Watchlists
db.watchlists.createIndex({ userId: 1, sortOrder: 1 });
db.watchlists.createIndex({ "symbols.symbol": 1 });

// OHLC Candles - Time-series optimized
db.ohlc_candles.createIndex({ "metadata.symbol": 1, "metadata.interval": 1, "timestamp": -1 });
db.ohlc_candles.createIndex({ "metadata.exchange": 1, "timestamp": -1 });
```

### Text Indexes (for search):

```javascript
db.trades.createIndex({ 
  symbol: "text", 
  notes: "text", 
  strategy: "text",
  tags: "text"
});

db.watchlists.createIndex({ 
  name: "text", 
  description: "text" 
});
```

### TTL Indexes (auto-expiration):

```javascript
// Automatically delete session tokens after 7 days
db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 604800 });

// Delete 1-minute candles after 7 days
db.ohlc_candles.createIndex(
  { createdAt: 1 },
  { 
    expireAfterSeconds: 604800,
    partialFilterExpression: { "metadata.interval": "1m" }
  }
);
```

### Index Monitoring:

```javascript
// Check index usage
db.trades.aggregate([{ $indexStats: {} }]);

// Explain query plan
db.trades.find({ userId: ObjectId("..."), status: "open" }).explain("executionStats");

// Monitor slow queries
db.setProfilingLevel(1, { slowms: 100 }); // Log queries > 100ms
db.system.profile.find().sort({ ts: -1 }).limit(10);
```

### Index Best Practices:

1. **Cardinality**: Place high-cardinality fields first in compound indexes
2. **Equality-Sort-Range**: ESR rule for compound indexes (equality → sort → range)
3. **Covered Queries**: Include frequently accessed fields in index to avoid collection scans
4. **Sparse Indexes**: Use for optional fields to save space
5. **Partial Indexes**: Filter index entries based on conditions
6. **Index Size**: Monitor index sizes, keep them in RAM for best performance

---

## 3. Redis Cache Structures

### Live Market Data

**Purpose**: Cache real-time tick data for subscribed symbols

**Key Pattern**: `market:live:{exchange}:{symbol}`

**Data Structure**: Hash

**Fields**:
```json
{
  "ltp": "number (last traded price)",
  "ltq": "number (last traded quantity)",
  "ltt": "timestamp (last traded time)",
  "open": "number",
  "high": "number",
  "low": "number",
  "close": "number (previous close)",
  "volume": "number (total volume)",
  "bid": "number (best bid price)",
  "ask": "number (best ask price)",
  "bidQty": "number",
  "askQty": "number",
  "change": "number (price change)",
  "changePercent": "number",
  "oi": "number (open interest, for F&O)",
  "oiChange": "number",
  "avgPrice": "number",
  "upperCircuit": "number",
  "lowerCircuit": "number",
  "updatedAt": "timestamp"
}
```

**TTL**: 5 seconds (auto-expire if not updated)

**Redis Commands**:
```bash
# Set live data
HSET market:live:NSE:RELIANCE ltp 2450.50 ltq 100 ltt 1732716000000 change 15.50 changePercent 0.63 volume 1250000 updatedAt 1732716000000

# Get specific field
HGET market:live:NSE:RELIANCE ltp

# Get all fields
HGETALL market:live:NSE:RELIANCE

# Set TTL
EXPIRE market:live:NSE:RELIANCE 5

# Check if exists
EXISTS market:live:NSE:RELIANCE

# Get multiple symbols at once (pipeline)
HGETALL market:live:NSE:RELIANCE
HGETALL market:live:NSE:TCS
HGETALL market:live:NSE:INFY
```

**TypeScript Implementation**:
```typescript
interface LiveMarketData {
  ltp: number;
  ltq: number;
  ltt: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  bid: number;
  ask: number;
  bidQty: number;
  askQty: number;
  change: number;
  changePercent: number;
  oi?: number;
  oiChange?: number;
  avgPrice: number;
  upperCircuit: number;
  lowerCircuit: number;
  updatedAt: number;
}

// Set live data
async function setLiveMarketData(
  exchange: string,
  symbol: string,
  data: LiveMarketData
): Promise<void> {
  const key = `market:live:${exchange}:${symbol}`;
  await redis.hset(key, data);
  await redis.expire(key, 5); // 5-second TTL
}

// Get live data
async function getLiveMarketData(
  exchange: string,
  symbol: string
): Promise<LiveMarketData | null> {
  const key = `market:live:${exchange}:${symbol}`;
  const data = await redis.hgetall(key);
  return data ? (data as unknown as LiveMarketData) : null;
}

// Get multiple symbols
async function getMultipleMarketData(
  symbols: Array<{ exchange: string; symbol: string }>
): Promise<Record<string, LiveMarketData>> {
  const pipeline = redis.pipeline();
  symbols.forEach(({ exchange, symbol }) => {
    pipeline.hgetall(`market:live:${exchange}:${symbol}`);
  });
  const results = await pipeline.exec();
  
  const marketData: Record<string, LiveMarketData> = {};
  results?.forEach((result, index) => {
    const { exchange, symbol } = symbols[index];
    if (result[1]) {
      marketData[`${exchange}:${symbol}`] = result[1] as unknown as LiveMarketData;
    }
  });
  
  return marketData;
}
```

---

### Index Prices

**Purpose**: Cache major index prices (Nifty 50, Sensex, Bank Nifty, etc.)

**Key Pattern**: `market:index:{indexName}`

**Data Structure**: Hash

**Fields**:
```json
{
  "value": "number (current index value)",
  "open": "number",
  "high": "number",
  "low": "number",
  "close": "number (previous close)",
  "change": "number",
  "changePercent": "number",
  "volume": "number",
  "timestamp": "timestamp (last updated)",
  "52weekHigh": "number",
  "52weekLow": "number"
}
```

**TTL**: 3 seconds (more frequent updates)

**Supported Indexes**:
- `NIFTY50`
- `SENSEX`
- `BANKNIFTY`
- `NIFTYMIDCAP`
- `NIFTYIT`
- `NIFTYPHARMA`
- `NIFTYAUTO`
- `NIFTYFMCG`
- `NIFTYMETAL`

**Redis Commands**:
```bash
# Set index data
HSET market:index:NIFTY50 value 19850.25 change 125.50 changePercent 0.63 open 19720.00 high 19875.00 low 19700.00 timestamp 1732716000000

# Get index value
HGET market:index:NIFTY50 value

# Get all index data
HGETALL market:index:NIFTY50

# Get multiple indexes
HGETALL market:index:NIFTY50
HGETALL market:index:SENSEX
HGETALL market:index:BANKNIFTY

# Set TTL
EXPIRE market:index:NIFTY50 3
```

**TypeScript Implementation**:
```typescript
interface IndexData {
  value: number;
  open: number;
  high: number;
  low: number;
  close: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
  '52weekHigh': number;
  '52weekLow': number;
}

// Set index data
async function setIndexData(indexName: string, data: IndexData): Promise<void> {
  const key = `market:index:${indexName}`;
  await redis.hset(key, data);
  await redis.expire(key, 3); // 3-second TTL
}

// Get index data
async function getIndexData(indexName: string): Promise<IndexData | null> {
  const key = `market:index:${indexName}`;
  const data = await redis.hgetall(key);
  return data ? (data as unknown as IndexData) : null;
}

// Get all major indexes
async function getAllIndexes(): Promise<Record<string, IndexData>> {
  const indexes = ['NIFTY50', 'SENSEX', 'BANKNIFTY'];
  const pipeline = redis.pipeline();
  
  indexes.forEach((index) => {
    pipeline.hgetall(`market:index:${index}`);
  });
  
  const results = await pipeline.exec();
  const indexData: Record<string, IndexData> = {};
  
  results?.forEach((result, i) => {
    if (result[1]) {
      indexData[indexes[i]] = result[1] as unknown as IndexData;
    }
  });
  
  return indexData;
}
```

---

### Watchlist Prices

**Purpose**: Cache real-time prices for all symbols in user watchlists

**Key Pattern**: `watchlist:prices:user:{userId}`

**Data Structure**: Hash (symbol → price data)

**Fields** (per symbol):
```json
{
  "{exchange}:{symbol}": {
    "ltp": "number",
    "change": "number",
    "changePercent": "number",
    "volume": "number",
    "updatedAt": "timestamp"
  }
}
```

**Alternative Pattern** (for large watchlists):
- Key: `watchlist:prices:user:{userId}:{symbol}`
- Structure: Hash
- TTL: 5 seconds

**Redis Commands**:
```bash
# Set watchlist prices (batch)
HSET watchlist:prices:user:507f1f77bcf86cd799439011 "NSE:RELIANCE" '{"ltp":2450.50,"change":15.50,"changePercent":0.63,"volume":1250000,"updatedAt":1732716000000}'

# Get specific symbol price from watchlist
HGET watchlist:prices:user:507f1f77bcf86cd799439011 "NSE:RELIANCE"

# Get all watchlist prices
HGETALL watchlist:prices:user:507f1f77bcf86cd799439011

# Set TTL
EXPIRE watchlist:prices:user:507f1f77bcf86cd799439011 300

# Alternative: Individual keys per symbol
HSET watchlist:prices:user:507f1f77bcf86cd799439011:NSE:RELIANCE ltp 2450.50 change 15.50 changePercent 0.63
EXPIRE watchlist:prices:user:507f1f77bcf86cd799439011:NSE:RELIANCE 5
```

**TypeScript Implementation**:
```typescript
interface WatchlistPrice {
  ltp: number;
  change: number;
  changePercent: number;
  volume: number;
  updatedAt: number;
}

// Set watchlist prices (batch)
async function setWatchlistPrices(
  userId: string,
  prices: Record<string, WatchlistPrice>
): Promise<void> {
  const key = `watchlist:prices:user:${userId}`;
  const pipeline = redis.pipeline();
  
  Object.entries(prices).forEach(([symbol, data]) => {
    pipeline.hset(key, symbol, JSON.stringify(data));
  });
  
  pipeline.expire(key, 300); // 5-minute TTL
  await pipeline.exec();
}

// Get watchlist prices
async function getWatchlistPrices(
  userId: string
): Promise<Record<string, WatchlistPrice>> {
  const key = `watchlist:prices:user:${userId}`;
  const data = await redis.hgetall(key);
  
  const prices: Record<string, WatchlistPrice> = {};
  Object.entries(data).forEach(([symbol, value]) => {
    prices[symbol] = JSON.parse(value as string);
  });
  
  return prices;
}

// Update single watchlist symbol
async function updateWatchlistSymbol(
  userId: string,
  symbol: string,
  price: WatchlistPrice
): Promise<void> {
  const key = `watchlist:prices:user:${userId}`;
  await redis.hset(key, symbol, JSON.stringify(price));
  await redis.expire(key, 300);
}

// Get watchlist symbols that need price updates
async function getWatchlistSymbols(userId: string): Promise<string[]> {
  // Fetch from MongoDB
  const watchlists = await db.collection('watchlists').find({ userId }).toArray();
  
  const symbols = new Set<string>();
  watchlists.forEach((wl) => {
    wl.symbols.forEach((s: any) => {
      symbols.add(`${s.exchange}:${s.symbol}`);
    });
  });
  
  return Array.from(symbols);
}
```

---

### Additional Redis Structures

#### **Market Status Cache**

**Key Pattern**: `market:status:{exchange}`

**Data Structure**: String (JSON)

**Fields**:
```json
{
  "status": "open|closed|pre_open|post_close",
  "message": "string",
  "nextChange": "timestamp",
  "timestamp": "timestamp"
}
```

**TTL**: 60 seconds

---

#### **Symbol Metadata Cache**

**Key Pattern**: `symbol:meta:{exchange}:{symbol}`

**Data Structure**: Hash

**Fields**:
```json
{
  "name": "string (company name)",
  "sector": "string",
  "industry": "string",
  "marketCap": "number",
  "lotSize": "number",
  "tickSize": "number",
  "isin": "string",
  "instrumentToken": "string",
  "upperCircuit": "number",
  "lowerCircuit": "number"
}
```

**TTL**: 86400 seconds (1 day)

---

#### **User Session Cache**

**Key Pattern**: `session:{sessionId}`

**Data Structure**: Hash

**Fields**:
```json
{
  "userId": "string",
  "email": "string",
  "roles": "string (JSON array)",
  "createdAt": "timestamp",
  "lastActivity": "timestamp",
  "ip": "string",
  "userAgent": "string"
}
```

**TTL**: 900 seconds (15 minutes, renewable on activity)

---

#### **Rate Limiting**

**Key Pattern**: `ratelimit:{userId}:{endpoint}`

**Data Structure**: String (counter)

**Implementation**: Token bucket or sliding window

```bash
# Increment request count
INCR ratelimit:507f1f77bcf86cd799439011:/api/trades
EXPIRE ratelimit:507f1f77bcf86cd799439011:/api/trades 60

# Check limit
GET ratelimit:507f1f77bcf86cd799439011:/api/trades
```

---

## 4. Connection Configuration

### MongoDB Atlas Connection

**Connection String**:
```
mongodb+srv://starunkumarainds2024_db_user:2fgmUJliWHq9YUIl@cluster0.bc9ss4x.mongodb.net/
```

**Database Name**: `trading_analytics`

**Environment Variables** (.env):
```bash
# MongoDB
MONGODB_URI=mongodb+srv://starunkumarainds2024_db_user:2fgmUJliWHq9YUIl@cluster0.bc9ss4x.mongodb.net/
MONGODB_DB_NAME=trading_analytics

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Production Redis (AWS ElastiCache)
REDIS_URL=redis://your-elasticache-endpoint:6379
```

**Mongoose Connection** (TypeScript):
```typescript
import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI!, {
      dbName: process.env.MONGODB_DB_NAME || 'trading_analytics',
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

export default connectDB;
```

**Redis Connection** (TypeScript):
```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
});

redis.on('connect', () => {
  console.log('Redis connected');
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});

redis.on('reconnecting', () => {
  console.log('Redis reconnecting...');
});

export default redis;
```

---

## 5. Schema Validation Rules

### MongoDB JSON Schema Validation

**Users Collection Validation**:
```javascript
db.runCommand({
  collMod: "users",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "username", "passwordHash", "roles"],
      properties: {
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
        },
        username: {
          bsonType: "string",
          minLength: 3,
          maxLength: 30
        },
        passwordHash: {
          bsonType: "string",
          minLength: 60
        },
        roles: {
          bsonType: "array",
          items: {
            enum: ["user", "admin", "premium", "analyst"]
          }
        },
        verified: {
          bsonType: "bool"
        }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "error"
});
```

**Trades Collection Validation**:
```javascript
db.runCommand({
  collMod: "trades",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "symbol", "exchange", "tradeType", "position", "entry", "status"],
      properties: {
        userId: { bsonType: "objectId" },
        symbol: { 
          bsonType: "string",
          minLength: 1,
          maxLength: 20
        },
        exchange: {
          enum: ["NSE", "BSE", "MCX", "NFO"]
        },
        tradeType: {
          enum: ["intraday", "delivery", "swing"]
        },
        position: {
          enum: ["long", "short"]
        },
        status: {
          enum: ["open", "closed", "partial"]
        },
        entry: {
          bsonType: "object",
          required: ["price", "quantity", "timestamp"],
          properties: {
            price: { bsonType: "double", minimum: 0 },
            quantity: { bsonType: "int", minimum: 1 }
          }
        }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
```

---

## Summary

### MongoDB Collections Created

| Collection | Purpose | Documents Est. | Indexes |
|------------|---------|----------------|---------|
| `users` | Authentication & profiles | 10K-100K | 6 |
| `trades` | Trade records | 1M-10M | 11 |
| `analytics` | Pre-calculated metrics | 100K-500K | 4 |
| `watchlists` | User watchlists | 50K-200K | 5 |
| `ohlc_candles` | Time-series OHLC data | 100M+ | 3 + TTL |

### Redis Cache Keys

| Key Pattern | Purpose | TTL | Structure |
|-------------|---------|-----|-----------|
| `market:live:{exchange}:{symbol}` | Real-time tick data | 5s | Hash |
| `market:index:{indexName}` | Index prices | 3s | Hash |
| `watchlist:prices:user:{userId}` | User watchlist prices | 300s | Hash |
| `market:status:{exchange}` | Market status | 60s | String (JSON) |
| `symbol:meta:{exchange}:{symbol}` | Symbol metadata | 1d | Hash |
| `session:{sessionId}` | User sessions | 15m | Hash |
| `ratelimit:{userId}:{endpoint}` | Rate limiting | 60s | String |

### Key Design Decisions

1. **Time-Series Collection**: Used for OHLC candles (MongoDB 5.0+ feature)
2. **Compound Indexes**: Optimized for userId + timestamp queries
3. **TTL Indexes**: Auto-delete old candles and sessions
4. **Redis Hash**: Efficient for structured data (market data, indexes)
5. **Sparse Indexes**: For optional fields like brokerTradeId
6. **Text Indexes**: Enable full-text search on trades and watchlists

### Performance Targets

- **Read Latency**: <10ms (MongoDB with proper indexes)
- **Write Latency**: <50ms (trades insertion)
- **Cache Hit Rate**: >90% for market data
- **Redis Latency**: <1ms for cached data
- **Query Performance**: <100ms for complex aggregations

---

**Status**: ✅ Part 3 Complete - Database Design  
**Next**: Part 4 - Authentication Service Implementation

---

**Prepared by**: GitHub Copilot  
**Date**: November 27, 2025  
**Version**: 0.3.0
