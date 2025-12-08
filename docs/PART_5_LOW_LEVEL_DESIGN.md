# Part 5: Low Level Design (LLD)

**Date**: November 27, 2025  
**Status**: ✅ Completed  
**Version**: 0.5.0

---

## Overview

Part 5 provides the **Low Level Design (LLD)** — the implementation-level blueprint for the Stock Trade Tracking Application. This document covers:

1. Class Diagrams
2. Service Layer (TradeService, AnalyticsService, BrokerService, MarketDataService, AuthService)
3. Controller Layer
4. DTOs (Data Transfer Objects)
5. Utility Modules
6. Error Handling Layer
7. Logging Architecture

**Architecture Summary**:
- **Backend**: Node.js + TypeScript microservices
- **HTTP Framework**: Express/Fastify
- **Real-time**: Socket.IO (WebSocket)
- **Database**: MongoDB (primary), Redis (cache + pub/sub)
- **Background Jobs**: BullMQ with Redis
- **Authentication**: JWT with refresh tokens

---

## 1. Class Diagrams

### 1.1 Core Domain Classes

```
┌─────────────────────────────────────────────────────────────────┐
│                            USER                                  │
├─────────────────────────────────────────────────────────────────┤
│ + id: ObjectId                                                   │
│ + email: string                                                  │
│ + username: string                                               │
│ + passwordHash: string                                           │
│ + firstName?: string                                             │
│ + lastName?: string                                              │
│ + phone?: string                                                 │
│ + avatar?: string                                                │
│ + roles: string[]                                                │
│ + verified: boolean                                              │
│ + preferences: UserPreferences                                   │
│ + subscription: Subscription                                     │
│ + brokerAccounts: BrokerAccount[]                                │
│ + createdAt: Date                                                │
│ + updatedAt: Date                                                │
│ + lastLoginAt: Date                                              │
├─────────────────────────────────────────────────────────────────┤
│ + verifyPassword(plain: string): boolean                         │
│ + generateAuthToken(): string                                    │
│ + toJSON(): UserDTO                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1..*
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BROKER_ACCOUNT                              │
├─────────────────────────────────────────────────────────────────┤
│ + id: ObjectId                                                   │
│ + userId: ObjectId                                               │
│ + broker: 'zerodha' | 'upstox'                                   │
│ + brokerId: string                                               │
│ + clientId: string                                               │
│ + accessToken: string (encrypted)                                │
│ + refreshToken?: string (encrypted)                              │
│ + tokenExpiresAt: Date                                           │
│ + isActive: boolean                                              │
│ + isPrimary: boolean                                             │
│ + permissions: string[]                                          │
│ + syncSettings: SyncSettings                                     │
│ + lastSyncAt?: Date                                              │
│ + createdAt: Date                                                │
├─────────────────────────────────────────────────────────────────┤
│ + isTokenExpired(): boolean                                      │
│ + refreshAccessToken(): Promise<void>                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1..*
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SYNC_JOB                                 │
├─────────────────────────────────────────────────────────────────┤
│ + id: string                                                     │
│ + brokerAccountId: ObjectId                                      │
│ + userId: ObjectId                                               │
│ + type: 'incremental' | 'full'                                   │
│ + status: 'queued' | 'in_progress' | 'success' | 'failed'        │
│ + progress: number (0-100)                                       │
│ + currentStep: string                                            │
│ + startedAt?: Date                                               │
│ + completedAt?: Date                                             │
│ + stats: SyncStats                                               │
│ + errors?: SyncError[]                                           │
│ + retryCount: number                                             │
├─────────────────────────────────────────────────────────────────┤
│ + updateProgress(step: string, progress: number): void           │
│ + markComplete(stats: SyncStats): void                           │
│ + markFailed(error: SyncError): void                             │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Trade Domain Classes

```
┌─────────────────────────────────────────────────────────────────┐
│                           TRADE                                  │
├─────────────────────────────────────────────────────────────────┤
│ + id: ObjectId                                                   │
│ + userId: ObjectId                                               │
│ + brokerId?: ObjectId                                            │
│ + brokerTradeId?: string                                         │
│ + symbol: string                                                 │
│ + exchange: 'NSE' | 'BSE' | 'MCX' | 'NFO'                        │
│ + segment: 'equity' | 'futures' | 'options' | 'commodity'        │
│ + instrumentType: 'stock' | 'future' | 'call' | 'put'            │
│ + tradeType: 'intraday' | 'delivery' | 'swing'                   │
│ + position: 'long' | 'short'                                     │
│ + entry: TradeLeg                                                │
│ + exit?: TradeLeg                                                │
│ + status: 'open' | 'closed' | 'cancelled'                        │
│ + pnl: PnL                                                       │
│ + stopLoss?: number                                              │
│ + target?: number                                                │
│ + riskRewardRatio?: number                                       │
│ + strategy?: string                                              │
│ + tags: string[]                                                 │
│ + notes?: string                                                 │
│ + holdingPeriod?: number (minutes)                               │
│ + metadata: TradeMetadata                                        │
│ + createdAt: Date                                                │
│ + updatedAt: Date                                                │
├─────────────────────────────────────────────────────────────────┤
│ + close(exitLeg: TradeLeg): void                                 │
│ + computePnL(): PnL                                              │
│ + computeRiskReward(): number                                    │
│ + computeHoldingPeriod(): number                                 │
│ + toJSON(): TradeDTO                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────────┐ ┌─────────────┐ ┌─────────────────────┐
│      TRADE_LEG      │ │     PNL     │ │   TRADE_METADATA    │
├─────────────────────┤ ├─────────────┤ ├─────────────────────┤
│ + price: number     │ │ + gross: n  │ │ + syncedAt?: Date   │
│ + quantity: number  │ │ + net: n    │ │ + syncSource: str   │
│ + timestamp: Date   │ │ + percent: n│ │ + importBatch?: str │
│ + orderType: string │ │ + charges: n│ │ + modifiedManually  │
│ + brokerage?: num   │ └─────────────┘ └─────────────────────┘
│ + taxes?: Taxes     │
└─────────────────────┘
              │
              ▼
┌─────────────────────┐
│        TAXES        │
├─────────────────────┤
│ + stt?: number      │
│ + stampDuty?: num   │
│ + gst?: number      │
│ + sebiTurnover?: n  │
│ + exchangeTxn?: n   │
└─────────────────────┘
```

### 1.3 Market Data Classes

```
┌─────────────────────────────────────────────────────────────────┐
│                        OHLC_CANDLE                               │
├─────────────────────────────────────────────────────────────────┤
│ + symbol: string                                                 │
│ + exchange: string                                               │
│ + interval: '1m' | '5m' | '15m' | '30m' | '1h' | '1d' | '1w'     │
│ + timestamp: Date                                                │
│ + open: number                                                   │
│ + high: number                                                   │
│ + low: number                                                    │
│ + close: number                                                  │
│ + volume: number                                                 │
│ + value?: number                                                 │
├─────────────────────────────────────────────────────────────────┤
│ + isGreen(): boolean                                             │
│ + getRange(): number                                             │
│ + getBody(): number                                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                          QUOTE                                   │
├─────────────────────────────────────────────────────────────────┤
│ + symbol: string                                                 │
│ + exchange: string                                               │
│ + lastPrice: number                                              │
│ + change: number                                                 │
│ + changePercent: number                                          │
│ + open: number                                                   │
│ + high: number                                                   │
│ + low: number                                                    │
│ + close: number                                                  │
│ + previousClose: number                                          │
│ + volume: number                                                 │
│ + value: number                                                  │
│ + timestamp: Date                                                │
│ + depth?: OrderBookDepth                                         │
├─────────────────────────────────────────────────────────────────┤
│ + isUp(): boolean                                                │
│ + isDown(): boolean                                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      ORDER_BOOK_DEPTH                            │
├─────────────────────────────────────────────────────────────────┤
│ + buy: DepthLevel[]                                              │
│ + sell: DepthLevel[]                                             │
│ + totalBuyQty: number                                            │
│ + totalSellQty: number                                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       DEPTH_LEVEL                                │
├─────────────────────────────────────────────────────────────────┤
│ + price: number                                                  │
│ + quantity: number                                               │
│ + orders: number                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.4 Analytics Classes

```
┌─────────────────────────────────────────────────────────────────┐
│                    ANALYTICS_SUMMARY                             │
├─────────────────────────────────────────────────────────────────┤
│ + userId: ObjectId                                               │
│ + period: Period                                                 │
│ + totalTrades: number                                            │
│ + winningTrades: number                                          │
│ + losingTrades: number                                           │
│ + breakEvenTrades: number                                        │
│ + winRate: number                                                │
│ + profitFactor: number                                           │
│ + pnl: PnLSummary                                                │
│ + averageWin: number                                             │
│ + averageLoss: number                                            │
│ + largestWin: TradeReference                                     │
│ + largestLoss: TradeReference                                    │
│ + maxDrawdown: DrawdownInfo                                      │
│ + riskMetrics: RiskMetrics                                       │
│ + bySegment: Map<string, SegmentAnalytics>                       │
│ + byStrategy: Map<string, StrategyAnalytics>                     │
│ + generatedAt: Date                                              │
│ + cacheKey: string                                               │
├─────────────────────────────────────────────────────────────────┤
│ + isStale(maxAgeMinutes: number): boolean                        │
│ + toDTO(): AnalyticsSummaryDTO                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      RISK_METRICS                                │
├─────────────────────────────────────────────────────────────────┤
│ + sharpeRatio: number                                            │
│ + sortinoRatio: number                                           │
│ + calmarRatio: number                                            │
│ + volatility: { daily, weekly, monthly, annualized }             │
│ + beta: number                                                   │
│ + alpha: number                                                  │
│ + valueAtRisk: { daily95, daily99, weekly95 }                    │
│ + expectedShortfall: number                                      │
└─────────────────────────────────────────────────────────────────┘
```

### 1.5 Class Relationships Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          CLASS RELATIONSHIPS                              │
└──────────────────────────────────────────────────────────────────────────┘

    ┌─────────┐         1..*         ┌─────────────────┐
    │  USER   │◆─────────────────────│  BROKER_ACCOUNT │
    └────┬────┘                      └────────┬────────┘
         │                                    │
         │ 1..*                               │ 1..*
         ▼                                    ▼
    ┌─────────┐                      ┌─────────────────┐
    │  TRADE  │                      │    SYNC_JOB     │
    └────┬────┘                      └─────────────────┘
         │
         │ reads
         ▼
    ┌─────────────┐
    │ OHLC_CANDLE │
    └─────────────┘

    ┌─────────┐         1            ┌─────────────────┐
    │  USER   │◆─────────────────────│    WATCHLIST    │
    └─────────┘                      └────────┬────────┘
                                              │ 1..*
                                              ▼
                                     ┌─────────────────┐
                                     │ WATCHLIST_ITEM  │
                                     └─────────────────┘

    ┌─────────┐    computed from     ┌─────────────────┐
    │  TRADE  │─────────────────────▶│ ANALYTICS_SUMM  │
    └─────────┘                      └─────────────────┘

Legend:
  ◆────  Composition (owns)
  ────▶  Dependency (uses/reads)
  ────   Association
```

---

## 2. Service Layer

Services contain **business logic** and are called by controllers. Each service is responsible for a specific domain.

### 2.1 Service Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         SERVICE LAYER ARCHITECTURE                        │
└──────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────────┐
    │                          CONTROLLERS                                 │
    │   AuthController  TradeController  BrokerController  AnalyticsCtrl   │
    └──────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │                           SERVICES                                   │
    │  ┌───────────┐ ┌────────────┐ ┌─────────────┐ ┌───────────────────┐  │
    │  │AuthService│ │TradeService│ │BrokerService│ │AnalyticsService   │  │
    │  └───────────┘ └────────────┘ └─────────────┘ └───────────────────┘  │
    │  ┌─────────────────┐ ┌──────────────┐ ┌────────────────────────┐     │
    │  │MarketDataService│ │WorkerService │ │NotificationService     │     │
    │  └─────────────────┘ └──────────────┘ └────────────────────────┘     │
    └──────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │                        DATA ACCESS LAYER                             │
    │        MongoDB Models    │    Redis Cache    │    External APIs      │
    └─────────────────────────────────────────────────────────────────────┘
```

### 2.2 AuthService

**Responsibilities**:
- User registration with validation
- Password hashing (bcrypt) and verification
- JWT token generation and validation
- Refresh token management
- Session tracking and revocation
- Password reset flow
- Email verification

```typescript
class AuthService {
  // Dependencies
  private userRepository: UserRepository;
  private tokenService: TokenService;
  private emailService: EmailService;
  private cacheService: CacheService;

  // Registration & Login
  async register(dto: RegisterDTO): Promise<User>;
  async login(email: string, password: string): Promise<AuthResult>;
  async logout(userId: string, sessionId?: string, allDevices?: boolean): Promise<void>;

  // Token Management
  async generateTokens(user: User, rememberMe?: boolean): Promise<TokenPair>;
  async refreshTokens(refreshToken: string): Promise<TokenPair>;
  async validateAccessToken(token: string): Promise<UserPayload>;
  async revokeToken(token: string): Promise<void>;

  // Password Management
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
  async requestPasswordReset(email: string): Promise<void>;
  async resetPassword(token: string, newPassword: string): Promise<void>;

  // Email Verification
  async sendVerificationEmail(userId: string): Promise<void>;
  async verifyEmail(token: string): Promise<void>;

  // Session Management
  async getActiveSessions(userId: string): Promise<Session[]>;
  async revokeSession(userId: string, sessionId: string): Promise<void>;

  // Profile
  async getProfile(userId: string): Promise<User>;
  async updateProfile(userId: string, dto: UpdateProfileDTO): Promise<User>;
}
```

**Key Implementation Details**:
```typescript
// Password hashing
const SALT_ROUNDS = 12;
const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

// JWT Configuration
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const REFRESH_TOKEN_EXPIRY_REMEMBER = '30d';

// Token blacklist (Redis)
const BLACKLIST_PREFIX = 'token:blacklist:';
const SESSION_PREFIX = 'session:';
```

---

### 2.3 TradeService

**Responsibilities**:
- CRUD operations for trades
- P&L calculation (gross, net, charges)
- Trade reconciliation with broker data
- Bulk import/export
- Trade statistics aggregation
- Position tracking

```typescript
class TradeService {
  // Dependencies
  private tradeRepository: TradeRepository;
  private brokerService: BrokerService;
  private analyticsService: AnalyticsService;
  private cacheService: CacheService;
  private eventEmitter: EventEmitter;

  // CRUD Operations
  async createTrade(userId: string, dto: CreateTradeDTO): Promise<Trade>;
  async getTrade(userId: string, tradeId: string): Promise<Trade>;
  async updateTrade(userId: string, tradeId: string, dto: UpdateTradeDTO): Promise<Trade>;
  async partialUpdate(userId: string, tradeId: string, patch: Partial<TradeDTO>): Promise<Trade>;
  async deleteTrade(userId: string, tradeId: string, options?: DeleteOptions): Promise<void>;

  // Trade Lifecycle
  async closeTrade(userId: string, tradeId: string, exitDto: ExitTradeDTO): Promise<Trade>;
  async cancelTrade(userId: string, tradeId: string, reason?: string): Promise<Trade>;

  // Listing & Filtering
  async listTrades(userId: string, query: TradeQueryDTO): Promise<PaginatedResult<Trade>>;
  async searchTrades(userId: string, searchTerm: string, options?: SearchOptions): Promise<Trade[]>;

  // Bulk Operations
  async bulkCreate(userId: string, trades: CreateTradeDTO[], options?: BulkOptions): Promise<BulkResult>;
  async bulkUpdate(userId: string, tradeIds: string[], update: Partial<TradeDTO>): Promise<BulkResult>;
  async bulkDelete(userId: string, tradeIds: string[], options?: DeleteOptions): Promise<BulkResult>;

  // Import/Export
  async importFromCSV(userId: string, file: Buffer, options?: ImportOptions): Promise<ImportResult>;
  async importFromBroker(userId: string, brokerAccountId: string, trades: BrokerTrade[]): Promise<ImportResult>;
  async exportToCSV(userId: string, query: TradeQueryDTO): Promise<Buffer>;
  async exportToExcel(userId: string, query: TradeQueryDTO): Promise<Buffer>;

  // Statistics
  async getTradeStats(userId: string, query?: StatsQueryDTO): Promise<TradeStatsDTO>;
  async getOpenPositions(userId: string): Promise<PositionDTO[]>;

  // Reconciliation
  async reconcileTrades(userId: string, brokerAccountId: string, brokerTrades: BrokerTrade[]): Promise<ReconcileResult>;

  // P&L Calculation (internal)
  private computePnL(trade: Trade): PnL;
  private computeCharges(entry: TradeLeg, exit?: TradeLeg): number;
  private computeRiskRewardRatio(entry: number, stopLoss: number, target: number, position: string): number;
}
```

**P&L Calculation Logic**:
```typescript
private computePnL(trade: Trade): PnL {
  if (!trade.exit) {
    // Open trade - unrealized P&L
    return {
      gross: 0,
      net: -this.computeCharges(trade.entry),
      percentage: 0,
      charges: this.computeCharges(trade.entry)
    };
  }

  const { entry, exit, position } = trade;
  const multiplier = position === 'long' ? 1 : -1;
  
  const grossPnL = multiplier * (exit.price - entry.price) * entry.quantity;
  const charges = this.computeCharges(entry, exit);
  const netPnL = grossPnL - charges;
  const investment = entry.price * entry.quantity;
  const percentage = (netPnL / investment) * 100;

  return { gross: grossPnL, net: netPnL, percentage, charges };
}
```

---

### 2.4 BrokerService

**Responsibilities**:
- Manage broker OAuth flows (Zerodha, Upstox)
- Token refresh and lifecycle
- Queue and manage sync jobs
- Map broker-specific data to canonical format
- Handle broker API errors gracefully

```typescript
class BrokerService {
  // Dependencies
  private brokerAccountRepository: BrokerAccountRepository;
  private syncJobRepository: SyncJobRepository;
  private tradeService: TradeService;
  private queueService: QueueService;
  private encryptionService: EncryptionService;
  private providerAdapters: Map<string, BrokerAdapter>;

  // Broker Discovery
  getAvailableBrokers(): BrokerMetaDTO[];
  getBrokerInfo(brokerId: string): BrokerMetaDTO;

  // Connection Management
  async initiateConnect(userId: string, broker: string, options?: ConnectOptions): Promise<AuthUrlDTO>;
  async completeConnect(userId: string, dto: BrokerCallbackDTO): Promise<BrokerAccount>;
  async disconnect(userId: string, brokerAccountId: string, options?: DisconnectOptions): Promise<void>;

  // Token Management
  async refreshToken(brokerAccountId: string): Promise<boolean>;
  async isTokenValid(brokerAccountId: string): Promise<boolean>;

  // Account Queries
  async getConnectedAccounts(userId: string): Promise<BrokerAccount[]>;
  async getAccountDetails(userId: string, brokerAccountId: string): Promise<BrokerAccountDTO>;
  async updateAccountSettings(userId: string, brokerAccountId: string, settings: AccountSettingsDTO): Promise<BrokerAccount>;
  async setPrimaryAccount(userId: string, brokerAccountId: string): Promise<void>;

  // Sync Operations
  async triggerSync(userId: string, brokerAccountId: string, options?: SyncOptions): Promise<SyncJob>;
  async getSyncStatus(userId: string, brokerAccountId: string): Promise<SyncStatusDTO>;
  async getSyncHistory(userId: string, brokerAccountId: string, query?: PaginatedQuery): Promise<PaginatedResult<SyncJob>>;
  async cancelSync(userId: string, syncJobId: string): Promise<void>;

  // Data Fetching (via adapters)
  async fetchTrades(brokerAccountId: string, dateRange?: DateRange): Promise<BrokerTrade[]>;
  async fetchPositions(brokerAccountId: string): Promise<BrokerPosition[]>;
  async fetchHoldings(brokerAccountId: string): Promise<BrokerHolding[]>;

  // Provider Adapters
  private getAdapter(broker: string): BrokerAdapter;
}

// Broker Adapter Interface
interface BrokerAdapter {
  name: string;
  getAuthUrl(apiKey: string, redirectUrl: string, state: string): string;
  exchangeToken(requestToken: string): Promise<TokenResult>;
  refreshToken(refreshToken: string): Promise<TokenResult>;
  fetchTrades(accessToken: string, from: Date, to: Date): Promise<RawBrokerTrade[]>;
  fetchPositions(accessToken: string): Promise<RawBrokerPosition[]>;
  mapTrade(raw: RawBrokerTrade): BrokerTrade;
  mapPosition(raw: RawBrokerPosition): BrokerPosition;
}
```

**Broker Adapters**:
```typescript
// Zerodha Adapter
class ZerodhaAdapter implements BrokerAdapter {
  name = 'zerodha';
  private kiteConnect: KiteConnect;

  getAuthUrl(apiKey: string, redirectUrl: string, state: string): string {
    return `https://kite.zerodha.com/connect/login?api_key=${apiKey}&v=3&redirect_params=state%3D${state}`;
  }

  async exchangeToken(requestToken: string): Promise<TokenResult> {
    const session = await this.kiteConnect.generateSession(requestToken, apiSecret);
    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
  }

  mapTrade(raw: KiteTrade): BrokerTrade {
    return {
      brokerTradeId: raw.order_id,
      symbol: raw.tradingsymbol,
      exchange: raw.exchange,
      transactionType: raw.transaction_type === 'BUY' ? 'buy' : 'sell',
      quantity: raw.quantity,
      price: raw.average_price,
      timestamp: new Date(raw.order_timestamp),
      orderType: raw.order_type.toLowerCase(),
      product: raw.product, // MIS, CNC, etc.
    };
  }
}

// Upstox Adapter
class UpstoxAdapter implements BrokerAdapter {
  name = 'upstox';
  // Similar implementation...
}
```

---

### 2.5 AnalyticsService

**Responsibilities**:
- Compute dashboard overview metrics
- Generate period-based breakdowns (daily, weekly, monthly)
- Calculate risk metrics (Sharpe, Sortino, VaR)
- Category-wise analytics
- Heatmap generation
- Cache expensive computations

```typescript
class AnalyticsService {
  // Dependencies
  private tradeRepository: TradeRepository;
  private analyticsRepository: AnalyticsRepository;
  private cacheService: CacheService;
  private metricsCalculator: MetricsCalculator;

  // Dashboard
  async getOverview(userId: string, period: Period, options?: OverviewOptions): Promise<OverviewDTO>;

  // Period Breakdowns
  async getMonthlyBreakdown(userId: string, year: number, options?: BreakdownOptions): Promise<MonthlyDTO[]>;
  async getWeeklyBreakdown(userId: string, weeks: number, options?: BreakdownOptions): Promise<WeeklyDTO[]>;
  async getDailyBreakdown(userId: string, period: Period): Promise<DailyDTO[]>;

  // Category Analytics
  async getCategoryAnalytics(userId: string, category: CategoryType, period: Period, options?: CategoryOptions): Promise<CategoryDTO[]>;

  // Heatmap
  async getHeatmap(userId: string, year: number, type: HeatmapType): Promise<HeatmapDTO>;

  // Time Analysis
  async getTimeAnalysis(userId: string, period: Period, timezone: string): Promise<TimeAnalysisDTO>;

  // Risk Metrics
  async getRiskMetrics(userId: string, period: Period, options?: RiskOptions): Promise<RiskMetricsDTO>;

  // Comparison
  async comparePeriods(userId: string, period1: Period, period2: Period): Promise<ComparisonDTO>;
  async compareSegments(userId: string, segment1: string, segment2: string, period: Period): Promise<ComparisonDTO>;

  // Cache Management
  async invalidateCache(userId: string, scope?: CacheScope): Promise<void>;
  async warmCache(userId: string): Promise<void>;

  // Internal Calculations
  private calculateWinRate(trades: Trade[]): number;
  private calculateProfitFactor(trades: Trade[]): number;
  private calculateDrawdown(trades: Trade[]): DrawdownInfo;
  private calculateSharpeRatio(returns: number[], riskFreeRate: number): number;
  private calculateSortinoRatio(returns: number[], riskFreeRate: number): number;
  private calculateVaR(returns: number[], confidence: number): number;
}
```

**Metrics Calculation Examples**:
```typescript
private calculateWinRate(trades: Trade[]): number {
  const closedTrades = trades.filter(t => t.status === 'closed');
  if (closedTrades.length === 0) return 0;
  
  const winningTrades = closedTrades.filter(t => t.pnl.net > 0);
  return (winningTrades.length / closedTrades.length) * 100;
}

private calculateProfitFactor(trades: Trade[]): number {
  const closedTrades = trades.filter(t => t.status === 'closed');
  
  const totalProfit = closedTrades
    .filter(t => t.pnl.net > 0)
    .reduce((sum, t) => sum + t.pnl.net, 0);
  
  const totalLoss = Math.abs(closedTrades
    .filter(t => t.pnl.net < 0)
    .reduce((sum, t) => sum + t.pnl.net, 0));
  
  if (totalLoss === 0) return totalProfit > 0 ? Infinity : 0;
  return totalProfit / totalLoss;
}

private calculateSharpeRatio(returns: number[], riskFreeRate: number = 0.06): number {
  const n = returns.length;
  if (n < 2) return 0;
  
  const avgReturn = returns.reduce((a, b) => a + b, 0) / n;
  const stdDev = Math.sqrt(
    returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (n - 1)
  );
  
  if (stdDev === 0) return 0;
  return (avgReturn - riskFreeRate / 252) / stdDev * Math.sqrt(252); // Annualized
}
```

---

### 2.6 MarketDataService

**Responsibilities**:
- Fetch real-time quotes from market data providers
- Serve OHLC candle data
- Cache LTP and recent data in Redis
- Manage WebSocket subscriptions
- Aggregate data from multiple providers

```typescript
class MarketDataService {
  // Dependencies
  private ohlcRepository: OHLCRepository;
  private cacheService: CacheService;
  private wsManager: WebSocketManager;
  private providers: MarketDataProvider[];

  // Quotes
  async getQuote(symbol: string, exchange?: string): Promise<QuoteDTO>;
  async getMultipleQuotes(symbols: string[], exchange?: string): Promise<QuoteDTO[]>;
  async getIndexQuotes(indices?: string[]): Promise<IndexQuoteDTO[]>;

  // Candles
  async getCandles(symbol: string, interval: string, from: Date, to: Date, exchange?: string): Promise<CandleDTO[]>;
  async getLatestCandle(symbol: string, interval: string, exchange?: string): Promise<CandleDTO>;

  // Market Movers
  async getTopGainers(exchange?: string, index?: string, limit?: number): Promise<MoverDTO[]>;
  async getTopLosers(exchange?: string, index?: string, limit?: number): Promise<MoverDTO[]>;
  async getMostActive(exchange?: string, sortBy?: 'volume' | 'value', limit?: number): Promise<MoverDTO[]>;

  // Search
  async searchStocks(query: string, options?: SearchOptions): Promise<StockSearchResult[]>;

  // Market Status
  async getMarketStatus(): Promise<MarketStatusDTO>;
  async getHolidays(year?: number): Promise<HolidayDTO[]>;

  // WebSocket Management
  async subscribe(clientId: string, symbols: string[], mode: SubscriptionMode): Promise<SubscriptionResult>;
  async unsubscribe(clientId: string, symbols: string[]): Promise<void>;
  async unsubscribeAll(clientId: string): Promise<void>;

  // Real-time Push (internal)
  async pushTick(tick: TickDTO): Promise<void>;
  async broadcastToSubscribers(symbol: string, data: TickDTO): Promise<void>;

  // Cache Management
  private getCacheKey(type: string, symbol: string, exchange?: string): string;
  private async getFromCacheOrFetch<T>(key: string, fetcher: () => Promise<T>, ttl: number): Promise<T>;
}
```

**Caching Strategy**:
```typescript
// Cache TTLs
const CACHE_TTL = {
  LTP: 3,           // 3 seconds
  QUOTE: 5,         // 5 seconds
  INDEX: 3,         // 3 seconds
  CANDLE_1M: 60,    // 1 minute
  CANDLE_5M: 300,   // 5 minutes
  CANDLE_1D: 3600,  // 1 hour
  SEARCH: 86400,    // 24 hours
  MARKET_STATUS: 60 // 1 minute
};

// Cache Key Patterns
const CACHE_KEYS = {
  LTP: (symbol: string, exchange: string) => `market:ltp:${exchange}:${symbol}`,
  QUOTE: (symbol: string, exchange: string) => `market:quote:${exchange}:${symbol}`,
  INDEX: (symbol: string) => `market:index:${symbol}`,
  CANDLE: (symbol: string, exchange: string, interval: string) => 
    `market:candle:${exchange}:${symbol}:${interval}`,
};
```

---

### 2.7 WorkerService

**Responsibilities**:
- Process background jobs (sync, import, analytics)
- Manage job queues with BullMQ
- Handle retries and failures
- Emit progress events for real-time updates

```typescript
class WorkerService {
  // Dependencies
  private syncQueue: Queue;
  private importQueue: Queue;
  private analyticsQueue: Queue;
  private tradeService: TradeService;
  private brokerService: BrokerService;
  private analyticsService: AnalyticsService;
  private wsManager: WebSocketManager;

  // Queue Management
  async addSyncJob(data: SyncJobData): Promise<Job>;
  async addImportJob(data: ImportJobData): Promise<Job>;
  async addAnalyticsJob(data: AnalyticsJobData): Promise<Job>;

  // Job Processors
  async processSyncJob(job: Job<SyncJobData>): Promise<SyncResult>;
  async processImportJob(job: Job<ImportJobData>): Promise<ImportResult>;
  async processAnalyticsJob(job: Job<AnalyticsJobData>): Promise<void>;

  // Progress Reporting
  private emitProgress(jobId: string, userId: string, progress: ProgressData): void;

  // Error Handling
  private handleJobFailure(job: Job, error: Error): Promise<void>;
  private shouldRetry(error: Error, attemptsMade: number): boolean;
}

// Sync Job Processor
async processSyncJob(job: Job<SyncJobData>): Promise<SyncResult> {
  const { brokerAccountId, userId, syncType, dateRange } = job.data;

  try {
    // Step 1: Authenticate
    this.emitProgress(job.id, userId, { step: 'Authenticating', progress: 10 });
    await this.brokerService.refreshToken(brokerAccountId);

    // Step 2: Fetch trades
    this.emitProgress(job.id, userId, { step: 'Fetching trades', progress: 30 });
    const brokerTrades = await this.brokerService.fetchTrades(brokerAccountId, dateRange);

    // Step 3: Reconcile
    this.emitProgress(job.id, userId, { step: 'Importing trades', progress: 60 });
    const result = await this.tradeService.reconcileTrades(userId, brokerAccountId, brokerTrades);

    // Step 4: Invalidate analytics cache
    this.emitProgress(job.id, userId, { step: 'Updating analytics', progress: 90 });
    await this.analyticsService.invalidateCache(userId);

    this.emitProgress(job.id, userId, { step: 'Complete', progress: 100 });
    return result;
  } catch (error) {
    throw error;
  }
}
```

---

### 2.8 NotificationService

**Responsibilities**:
- Send email notifications
- Push notifications (optional)
- In-app notifications
- Price alerts

```typescript
class NotificationService {
  // Dependencies
  private emailProvider: EmailProvider;
  private pushProvider: PushProvider;
  private notificationRepository: NotificationRepository;
  private userService: UserService;

  // Email Notifications
  async sendEmail(userId: string, template: EmailTemplate, data: object): Promise<void>;
  async sendVerificationEmail(userId: string, token: string): Promise<void>;
  async sendPasswordResetEmail(userId: string, token: string): Promise<void>;
  async sendTradeAlertEmail(userId: string, alert: TradeAlert): Promise<void>;

  // In-App Notifications
  async createNotification(userId: string, notification: CreateNotificationDTO): Promise<Notification>;
  async getNotifications(userId: string, query?: NotificationQuery): Promise<PaginatedResult<Notification>>;
  async markAsRead(userId: string, notificationId: string): Promise<void>;
  async markAllAsRead(userId: string): Promise<void>;

  // Price Alerts
  async createPriceAlert(userId: string, alert: CreatePriceAlertDTO): Promise<PriceAlert>;
  async checkPriceAlerts(symbol: string, price: number): Promise<void>;
  async triggerAlert(alert: PriceAlert): Promise<void>;
}
```

---

## 3. Controller Layer

Controllers handle HTTP requests, validate input, call services, and format responses.

### 3.1 Controller Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        CONTROLLER ARCHITECTURE                           │
└──────────────────────────────────────────────────────────────────────────┘

                          HTTP Request
                               │
                               ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │                        MIDDLEWARE STACK                              │
    │  ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌───────────┐ ┌────────────┐ │
    │  │  CORS    │→│ Logger  │→│RateLimit │→│   Auth    │→│ Validator  │ │
    │  └──────────┘ └─────────┘ └──────────┘ └───────────┘ └────────────┘ │
    └──────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │                          ROUTER LAYER                                │
    │   /auth/*  →  AuthController                                         │
    │   /trades/*  →  TradeController                                      │
    │   /brokers/*  →  BrokerController                                    │
    │   /analytics/*  →  AnalyticsController                               │
    │   /market/*  →  MarketController                                     │
    │   /ws  →  WebSocketController                                        │
    └──────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │                       CONTROLLER METHODS                             │
    │  1. Parse & validate request (DTO)                                   │
    │  2. Extract user context from auth middleware                        │
    │  3. Call service method                                              │
    │  4. Transform result to response DTO                                 │
    │  5. Return formatted response                                        │
    └──────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   ▼
                          HTTP Response
```

### 3.2 Base Controller

```typescript
abstract class BaseController {
  // Response Helpers
  protected success<T>(res: Response, data: T, statusCode: number = 200): Response {
    return res.status(statusCode).json({
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId
      }
    });
  }

  protected paginated<T>(res: Response, data: T[], pagination: Pagination): Response {
    return res.status(200).json({
      success: true,
      data,
      pagination,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId
      }
    });
  }

  protected created<T>(res: Response, data: T): Response {
    return this.success(res, data, 201);
  }

  protected noContent(res: Response): Response {
    return res.status(204).send();
  }

  // Error Helpers
  protected handleError(error: Error, res: Response, next: NextFunction): void {
    next(error); // Delegate to error middleware
  }

  // User Context
  protected getUserId(req: Request): string {
    return req.user?.id;
  }

  protected getUser(req: Request): UserPayload {
    return req.user;
  }
}
```

### 3.3 AuthController

```typescript
@Controller('/auth')
class AuthController extends BaseController {
  constructor(private authService: AuthService) {}

  // POST /auth/register
  @Post('/register')
  @Validate(RegisterSchema)
  @RateLimit({ limit: 5, window: '1m' })
  async register(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const dto: RegisterDTO = req.body;
      const user = await this.authService.register(dto);
      
      // Send verification email asynchronously
      this.authService.sendVerificationEmail(user.id).catch(console.error);
      
      return this.created(res, {
        user: UserMapper.toDTO(user),
        message: 'Registration successful. Please verify your email.'
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // POST /auth/login
  @Post('/login')
  @Validate(LoginSchema)
  @RateLimit({ limit: 10, window: '1m' })
  async login(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const { email, password, rememberMe } = req.body;
      const result = await this.authService.login(email, password);
      const tokens = await this.authService.generateTokens(result.user, rememberMe);
      
      return this.success(res, {
        user: UserMapper.toDTO(result.user),
        tokens
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // POST /auth/refresh
  @Post('/refresh')
  @RateLimit({ limit: 30, window: '1h' })
  async refresh(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const { refreshToken } = req.body;
      const tokens = await this.authService.refreshTokens(refreshToken);
      return this.success(res, { tokens });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // POST /auth/logout
  @Post('/logout')
  @Auth()
  async logout(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const userId = this.getUserId(req);
      const { refreshToken, allDevices } = req.body;
      await this.authService.logout(userId, refreshToken, allDevices);
      return this.success(res, { message: 'Successfully logged out' });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // GET /auth/me
  @Get('/me')
  @Auth()
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const userId = this.getUserId(req);
      const user = await this.authService.getProfile(userId);
      return this.success(res, { user: UserMapper.toFullDTO(user) });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // PATCH /auth/me
  @Patch('/me')
  @Auth()
  @Validate(UpdateProfileSchema)
  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const userId = this.getUserId(req);
      const user = await this.authService.updateProfile(userId, req.body);
      return this.success(res, { user: UserMapper.toDTO(user), message: 'Profile updated successfully' });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // POST /auth/change-password
  @Post('/change-password')
  @Auth()
  @Validate(ChangePasswordSchema)
  @RateLimit({ limit: 5, window: '1h' })
  async changePassword(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const userId = this.getUserId(req);
      const { currentPassword, newPassword } = req.body;
      await this.authService.changePassword(userId, currentPassword, newPassword);
      return this.success(res, { message: 'Password changed successfully. Please login again.' });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // POST /auth/forgot-password
  @Post('/forgot-password')
  @Validate(ForgotPasswordSchema)
  @RateLimit({ limit: 3, window: '1h' })
  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const { email } = req.body;
      await this.authService.requestPasswordReset(email);
      // Always return success to prevent email enumeration
      return this.success(res, { 
        message: 'If an account exists with this email, you will receive a password reset link.' 
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // POST /auth/reset-password
  @Post('/reset-password')
  @Validate(ResetPasswordSchema)
  @RateLimit({ limit: 5, window: '1h' })
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const { token, newPassword } = req.body;
      await this.authService.resetPassword(token, newPassword);
      return this.success(res, { message: 'Password reset successfully. Please login with your new password.' });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // POST /auth/verify-email
  @Post('/verify-email')
  @Validate(VerifyEmailSchema)
  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const { token } = req.body;
      await this.authService.verifyEmail(token);
      return this.success(res, { message: 'Email verified successfully. You can now login.' });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }
}
```

### 3.4 TradeController

```typescript
@Controller('/trades')
@Auth() // All routes require authentication
class TradeController extends BaseController {
  constructor(private tradeService: TradeService) {}

  // POST /trades
  @Post('/')
  @Validate(CreateTradeSchema)
  async createTrade(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const userId = this.getUserId(req);
      const trade = await this.tradeService.createTrade(userId, req.body);
      return this.created(res, { trade: TradeMapper.toDTO(trade) });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // GET /trades
  @Get('/')
  @Validate(TradeQuerySchema, 'query')
  async listTrades(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const userId = this.getUserId(req);
      const query = this.parseTradeQuery(req.query);
      const result = await this.tradeService.listTrades(userId, query);
      
      return this.paginated(
        res,
        result.data.map(TradeMapper.toDTO),
        result.pagination
      );
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // GET /trades/:id
  @Get('/:id')
  async getTrade(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const userId = this.getUserId(req);
      const trade = await this.tradeService.getTrade(userId, req.params.id);
      return this.success(res, { trade: TradeMapper.toFullDTO(trade) });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // PUT /trades/:id
  @Put('/:id')
  @Validate(UpdateTradeSchema)
  async updateTrade(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const userId = this.getUserId(req);
      const trade = await this.tradeService.updateTrade(userId, req.params.id, req.body);
      return this.success(res, { trade: TradeMapper.toDTO(trade), message: 'Trade updated successfully' });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // PATCH /trades/:id
  @Patch('/:id')
  @Validate(PatchTradeSchema)
  async partialUpdate(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const userId = this.getUserId(req);
      const trade = await this.tradeService.partialUpdate(userId, req.params.id, req.body);
      return this.success(res, { trade: TradeMapper.toDTO(trade), message: 'Trade updated successfully' });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // POST /trades/:id/close
  @Post('/:id/close')
  @Validate(CloseTradeSchema)
  async closeTrade(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const userId = this.getUserId(req);
      const trade = await this.tradeService.closeTrade(userId, req.params.id, req.body);
      return this.success(res, { trade: TradeMapper.toDTO(trade), message: 'Trade closed successfully' });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // DELETE /trades/:id
  @Delete('/:id')
  async deleteTrade(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const userId = this.getUserId(req);
      const options = { permanent: req.query.permanent === 'true' };
      await this.tradeService.deleteTrade(userId, req.params.id, options);
      return this.success(res, { message: 'Trade deleted successfully', tradeId: req.params.id });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // POST /trades/bulk
  @Post('/bulk')
  @Validate(BulkCreateTradeSchema)
  @RateLimit({ limit: 10, window: '1m' })
  async bulkCreate(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const userId = this.getUserId(req);
      const { trades, options } = req.body;
      const result = await this.tradeService.bulkCreate(userId, trades, options);
      return this.created(res, result);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // GET /trades/stats
  @Get('/stats')
  @Validate(StatsQuerySchema, 'query')
  async getStats(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const userId = this.getUserId(req);
      const query = this.parseStatsQuery(req.query);
      const stats = await this.tradeService.getTradeStats(userId, query);
      return this.success(res, { stats });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // GET /trades/export
  @Get('/export')
  @RateLimit({ limit: 5, window: '1h' })
  async exportTrades(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = this.getUserId(req);
      const format = req.query.format as 'csv' | 'excel' || 'csv';
      const query = this.parseTradeQuery(req.query);
      
      const buffer = format === 'csv' 
        ? await this.tradeService.exportToCSV(userId, query)
        : await this.tradeService.exportToExcel(userId, query);
      
      const filename = `trades_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`;
      const contentType = format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // Helper methods
  private parseTradeQuery(query: any): TradeQueryDTO {
    return {
      page: parseInt(query.page) || 1,
      limit: Math.min(parseInt(query.limit) || 20, 100),
      sortBy: query.sortBy || 'entry.timestamp',
      sortOrder: query.sortOrder || 'desc',
      status: query.status?.split(','),
      symbol: query.symbol?.split(','),
      exchange: query.exchange?.split(','),
      segment: query.segment?.split(','),
      tradeType: query.tradeType?.split(','),
      position: query.position?.split(','),
      strategy: query.strategy,
      tags: query.tags?.split(','),
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      minPnl: query.minPnl ? parseFloat(query.minPnl) : undefined,
      maxPnl: query.maxPnl ? parseFloat(query.maxPnl) : undefined,
      search: query.search
    };
  }
}
```

### 3.5 BrokerController

```typescript
@Controller('/brokers')
@Auth()
class BrokerController extends BaseController {
  constructor(private brokerService: BrokerService) {}

  // GET /brokers
  @Get('/')
  async getAvailableBrokers(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const brokers = this.brokerService.getAvailableBrokers();
      return this.success(res, { brokers });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // GET /brokers/connected
  @Get('/connected')
  async getConnectedBrokers(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const userId = this.getUserId(req);
      const accounts = await this.brokerService.getConnectedAccounts(userId);
      return this.success(res, { accounts: accounts.map(BrokerMapper.toDTO) });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // POST /brokers/connect
  @Post('/connect')
  @Validate(BrokerConnectSchema)
  @RateLimit({ limit: 10, window: '1h' })
  async initiateConnect(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const userId = this.getUserId(req);
      const result = await this.brokerService.initiateConnect(userId, req.body.broker, req.body);
      return this.success(res, result);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // POST /brokers/callback
  @Post('/callback')
  @Validate(BrokerCallbackSchema)
  async completeConnect(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const userId = this.getUserId(req);
      const account = await this.brokerService.completeConnect(userId, req.body);
      return this.created(res, { 
        account: BrokerMapper.toDTO(account),
        message: 'Broker connected successfully. Initial sync will start shortly.'
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // DELETE /brokers/:brokerId
  @Delete('/:brokerId')
  async disconnect(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const userId = this.getUserId(req);
      const options = {
        deleteTrades: req.query.deleteTrades === 'true',
        revokeToken: req.query.revokeToken !== 'false'
      };
      await this.brokerService.disconnect(userId, req.params.brokerId, options);
      return this.success(res, { message: 'Broker disconnected successfully' });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // POST /brokers/:brokerId/sync
  @Post('/:brokerId/sync')
  @Validate(TriggerSyncSchema)
  @RateLimit({ limit: 10, window: '1h' })
  async triggerSync(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const userId = this.getUserId(req);
      const job = await this.brokerService.triggerSync(userId, req.params.brokerId, req.body);
      return this.success(res, {
        syncId: job.id,
        status: 'queued',
        message: 'Sync job queued successfully',
        webhookUrl: `wss://api.stocktracker.com/sync/${job.id}`
      }, 202);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // GET /brokers/:brokerId/sync/status
  @Get('/:brokerId/sync/status')
  async getSyncStatus(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const userId = this.getUserId(req);
      const status = await this.brokerService.getSyncStatus(userId, req.params.brokerId);
      return this.success(res, { syncStatus: status });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // GET /brokers/:brokerId/sync/history
  @Get('/:brokerId/sync/history')
  async getSyncHistory(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const userId = this.getUserId(req);
      const query = this.parsePaginatedQuery(req.query);
      const result = await this.brokerService.getSyncHistory(userId, req.params.brokerId, query);
      return this.paginated(res, result.data, result.pagination);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // PATCH /brokers/:brokerId
  @Patch('/:brokerId')
  @Validate(UpdateBrokerSettingsSchema)
  async updateSettings(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const userId = this.getUserId(req);
      const account = await this.brokerService.updateAccountSettings(userId, req.params.brokerId, req.body);
      return this.success(res, { account: BrokerMapper.toDTO(account), message: 'Settings updated successfully' });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // POST /brokers/:brokerId/refresh-token
  @Post('/:brokerId/refresh-token')
  @RateLimit({ limit: 10, window: '1h' })
  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const userId = this.getUserId(req);
      const account = await this.brokerService.getAccountDetails(userId, req.params.brokerId);
      const success = await this.brokerService.refreshToken(account.id);
      return this.success(res, { tokenRefreshed: success, message: 'Token refreshed successfully' });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }
}
```

### 3.6 AnalyticsController

```typescript
@Controller('/analytics')
@Auth()
class AnalyticsController extends BaseController {
  constructor(private analyticsService: AnalyticsService) {}

  // GET /analytics/overview
  @Get('/overview')
  @Validate(OverviewQuerySchema, 'query')
  async getOverview(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const userId = this.getUserId(req);
      const period = this.parsePeriod(req.query);
      const options = { compareWith: req.query.compareWith, segment: req.query.segment };
      const overview = await this.analyticsService.getOverview(userId, period, options);
      return this.success(res, { overview });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // GET /analytics/monthly
  @Get('/monthly')
  async getMonthly(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const userId = this.getUserId(req);
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const data = await this.analyticsService.getMonthlyBreakdown(userId, year);
      return this.success(res, { monthlyData: data });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // GET /analytics/weekly
  @Get('/weekly')
  async getWeekly(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const userId = this.getUserId(req);
      const weeks = parseInt(req.query.weeks as string) || 12;
      const data = await this.analyticsService.getWeeklyBreakdown(userId, weeks);
      return this.success(res, { weeklyData: data });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // GET /analytics/category
  @Get('/category')
  @Validate(CategoryQuerySchema, 'query')
  async getCategoryAnalytics(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const userId = this.getUserId(req);
      const category = req.query.category as string;
      const period = this.parsePeriod(req.query);
      const data = await this.analyticsService.getCategoryAnalytics(userId, category, period);
      return this.success(res, { category, breakdown: data });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // GET /analytics/heatmap
  @Get('/heatmap')
  async getHeatmap(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const userId = this.getUserId(req);
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const type = (req.query.type as string) || 'pnl';
      const heatmap = await this.analyticsService.getHeatmap(userId, year, type);
      return this.success(res, { heatmap });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // GET /analytics/time-analysis
  @Get('/time-analysis')
  async getTimeAnalysis(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const userId = this.getUserId(req);
      const period = this.parsePeriod(req.query);
      const timezone = (req.query.timezone as string) || 'Asia/Kolkata';
      const analysis = await this.analyticsService.getTimeAnalysis(userId, period, timezone);
      return this.success(res, { timeAnalysis: analysis });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // GET /analytics/risk
  @Get('/risk')
  async getRiskMetrics(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const userId = this.getUserId(req);
      const period = this.parsePeriod(req.query);
      const metrics = await this.analyticsService.getRiskMetrics(userId, period);
      return this.success(res, { riskAnalytics: metrics });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // GET /analytics/compare
  @Get('/compare')
  @Validate(CompareQuerySchema, 'query')
  async compare(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const userId = this.getUserId(req);
      const period1 = { start: new Date(req.query.period1Start as string), end: new Date(req.query.period1End as string) };
      const period2 = { start: new Date(req.query.period2Start as string), end: new Date(req.query.period2End as string) };
      const comparison = await this.analyticsService.comparePeriods(userId, period1, period2);
      return this.success(res, { comparison });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // Helper
  private parsePeriod(query: any): Period {
    if (query.startDate && query.endDate) {
      return { start: new Date(query.startDate), end: new Date(query.endDate) };
    }
    // Parse named periods: 'today', 'week', 'month', 'quarter', 'year'
    return this.getNamedPeriod(query.period || 'month');
  }
}
```

### 3.7 MarketController

```typescript
@Controller('/market')
@Auth()
class MarketController extends BaseController {
  constructor(private marketDataService: MarketDataService) {}

  // GET /market/indices
  @Get('/indices')
  async getIndices(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const indices = req.query.indices?.toString().split(',');
      const data = await this.marketDataService.getIndexQuotes(indices);
      return this.success(res, { indices: data });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // GET /market/stock/:symbol
  @Get('/stock/:symbol')
  async getStockQuote(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const { symbol } = req.params;
      const exchange = (req.query.exchange as string) || 'NSE';
      const quote = await this.marketDataService.getQuote(symbol, exchange);
      return this.success(res, { stock: quote });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // GET /market/stocks
  @Get('/stocks')
  async getMultipleQuotes(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const symbols = req.query.symbols?.toString().split(',') || [];
      const exchange = (req.query.exchange as string) || 'NSE';
      const quotes = await this.marketDataService.getMultipleQuotes(symbols, exchange);
      return this.success(res, { stocks: quotes });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // GET /market/candles/:symbol
  @Get('/candles/:symbol')
  @Validate(CandleQuerySchema, 'query')
  async getCandles(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const { symbol } = req.params;
      const { interval, from, to, exchange } = req.query;
      const candles = await this.marketDataService.getCandles(
        symbol,
        interval as string,
        new Date(from as string),
        new Date(to as string),
        exchange as string
      );
      return this.success(res, { symbol, interval, candles });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // GET /market/top-gainers
  @Get('/top-gainers')
  async getTopGainers(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const { exchange, index, limit } = req.query;
      const gainers = await this.marketDataService.getTopGainers(
        exchange as string,
        index as string,
        parseInt(limit as string) || 10
      );
      return this.success(res, { gainers });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // GET /market/top-losers
  @Get('/top-losers')
  async getTopLosers(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const { exchange, index, limit } = req.query;
      const losers = await this.marketDataService.getTopLosers(
        exchange as string,
        index as string,
        parseInt(limit as string) || 10
      );
      return this.success(res, { losers });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // GET /market/most-active
  @Get('/most-active')
  async getMostActive(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const { exchange, sortBy, limit } = req.query;
      const active = await this.marketDataService.getMostActive(
        exchange as string,
        sortBy as 'volume' | 'value',
        parseInt(limit as string) || 10
      );
      return this.success(res, { mostActive: active });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // GET /market/search
  @Get('/search')
  async searchStocks(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const { q, exchange, limit } = req.query;
      const results = await this.marketDataService.searchStocks(q as string, {
        exchange: exchange as string,
        limit: parseInt(limit as string) || 20
      });
      return this.success(res, { results, query: q });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  // GET /market/status
  @Get('/status')
  async getMarketStatus(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const status = await this.marketDataService.getMarketStatus();
      return this.success(res, { status });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }
}
```

### 3.8 Controller Summary Table

| Controller | Routes | Auth | Key Responsibilities |
|------------|--------|------|---------------------|
| **AuthController** | 11 | Mixed | Registration, login, tokens, profile |
| **TradeController** | 10 | ✅ All | CRUD, bulk, export, stats |
| **BrokerController** | 10 | ✅ All | OAuth, sync, status, settings |
| **AnalyticsController** | 8 | ✅ All | Overview, breakdowns, risk |
| **MarketController** | 10 | ✅ All | Quotes, candles, movers |

---

## 4. DTOs (Data Transfer Objects)

DTOs define the shape of data transferred between layers. They separate internal domain models from API contracts.

### 4.1 DTO Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           DTO ARCHITECTURE                               │
└──────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐         ┌─────────────────┐         ┌─────────────┐
    │   Request DTO   │         │  Domain Model   │         │Response DTO │
    │  (Input)        │   ──▶   │  (Internal)     │   ──▶   │  (Output)   │
    └─────────────────┘         └─────────────────┘         └─────────────┘
           │                           │                           │
           ▼                           ▼                           ▼
    ┌─────────────────┐         ┌─────────────────┐         ┌─────────────┐
    │   Validation    │         │   Business      │         │   Mapper    │
    │   Schema (Zod)  │         │   Logic         │         │   Function  │
    └─────────────────┘         └─────────────────┘         └─────────────┘

DTO Categories:
├── Request DTOs (CreateXxxDTO, UpdateXxxDTO, XxxQueryDTO)
├── Response DTOs (XxxResponseDTO, XxxListDTO)
├── Internal DTOs (for service-to-service communication)
└── Validation Schemas (Zod schemas for each request DTO)
```

### 4.2 Auth DTOs

```typescript
// ===== REQUEST DTOs =====

interface RegisterDTO {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  acceptTerms: boolean;
}

interface LoginDTO {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface RefreshTokenDTO {
  refreshToken: string;
}

interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

interface ResetPasswordDTO {
  token: string;
  newPassword: string;
  confirmNewPassword: string;
}

interface UpdateProfileDTO {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  preferences?: UserPreferencesDTO;
}

interface UserPreferencesDTO {
  theme?: 'light' | 'dark';
  currency?: string;
  timezone?: string;
  notifications?: NotificationPreferencesDTO;
  defaultBroker?: string;
}

// ===== RESPONSE DTOs =====

interface UserResponseDTO {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  roles: string[];
  verified: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

interface UserFullResponseDTO extends UserResponseDTO {
  preferences: UserPreferencesDTO;
  subscription: SubscriptionDTO;
  brokerAccounts: BrokerAccountSummaryDTO[];
}

interface TokensDTO {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
}

interface AuthResponseDTO {
  user: UserResponseDTO;
  tokens: TokensDTO;
}

// ===== VALIDATION SCHEMAS =====

const RegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number').optional(),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms' }) })
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional()
});
```

### 4.3 Trade DTOs

```typescript
// ===== REQUEST DTOs =====

interface CreateTradeDTO {
  symbol: string;
  exchange: 'NSE' | 'BSE' | 'MCX' | 'NFO';
  segment: 'equity' | 'futures' | 'options' | 'commodity';
  instrumentType: 'stock' | 'future' | 'call' | 'put' | 'commodity';
  tradeType: 'intraday' | 'delivery' | 'swing';
  position: 'long' | 'short';
  entry: TradeLegDTO;
  stopLoss?: number;
  target?: number;
  strategy?: string;
  tags?: string[];
  notes?: string;
  brokerId?: string;
}

interface TradeLegDTO {
  price: number;
  quantity: number;
  timestamp: string;
  orderType: 'market' | 'limit' | 'stop_loss';
  brokerage?: number;
  taxes?: TaxesDTO;
}

interface TaxesDTO {
  stt?: number;
  stampDuty?: number;
  gst?: number;
  sebiTurnover?: number;
  exchangeTxn?: number;
}

interface UpdateTradeDTO extends Partial<CreateTradeDTO> {
  exit?: TradeLegDTO;
}

interface CloseTradeDTO {
  exitPrice: number;
  exitQuantity?: number;
  exitTimestamp: string;
  orderType?: 'market' | 'limit';
  brokerage?: number;
  taxes?: TaxesDTO;
}

interface TradeQueryDTO {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string[];
  symbol?: string[];
  exchange?: string[];
  segment?: string[];
  tradeType?: string[];
  position?: string[];
  strategy?: string;
  tags?: string[];
  brokerId?: string;
  startDate?: Date;
  endDate?: Date;
  minPnl?: number;
  maxPnl?: number;
  search?: string;
}

interface BulkCreateTradeDTO {
  trades: CreateTradeDTO[];
  options?: {
    skipDuplicates?: boolean;
    validateOnly?: boolean;
  };
}

// ===== RESPONSE DTOs =====

interface TradeResponseDTO {
  id: string;
  userId: string;
  brokerId?: string;
  brokerTradeId?: string;
  symbol: string;
  exchange: string;
  segment: string;
  instrumentType: string;
  tradeType: string;
  position: string;
  entry: TradeLegDTO;
  exit?: TradeLegDTO;
  status: 'open' | 'closed' | 'cancelled';
  pnl: PnLDTO;
  stopLoss?: number;
  target?: number;
  riskRewardRatio?: number;
  strategy?: string;
  tags: string[];
  notes?: string;
  holdingPeriod?: number;
  createdAt: string;
  updatedAt: string;
}

interface PnLDTO {
  gross: number;
  net: number;
  percentage: number;
  charges: number;
}

interface TradeListResponseDTO {
  trades: TradeResponseDTO[];
  summary: {
    totalTrades: number;
    openTrades: number;
    closedTrades: number;
    totalPnl: number;
    winRate: number;
  };
}

interface BulkResultDTO {
  created: number;
  skipped: number;
  failed: number;
  trades: { id: string; symbol: string; status: string }[];
  errors: { index: number; error: string }[];
}

interface TradeStatsDTO {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  winRate: number;
  lossRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  averageHoldingPeriod: number;
  pnl: {
    gross: number;
    net: number;
    charges: number;
    realized: number;
    unrealized: number;
  };
  bySegment: Record<string, SegmentStatsDTO>;
  byTradeType: Record<string, TradeTypeStatsDTO>;
  topSymbols: SymbolStatsDTO[];
  topStrategies: StrategyStatsDTO[];
}

// ===== VALIDATION SCHEMAS =====

const CreateTradeSchema = z.object({
  symbol: z.string().min(1).max(20),
  exchange: z.enum(['NSE', 'BSE', 'MCX', 'NFO']),
  segment: z.enum(['equity', 'futures', 'options', 'commodity']),
  instrumentType: z.enum(['stock', 'future', 'call', 'put', 'commodity']),
  tradeType: z.enum(['intraday', 'delivery', 'swing']),
  position: z.enum(['long', 'short']),
  entry: z.object({
    price: z.number().positive('Price must be positive'),
    quantity: z.number().int().positive('Quantity must be a positive integer'),
    timestamp: z.string().datetime(),
    orderType: z.enum(['market', 'limit', 'stop_loss']),
    brokerage: z.number().nonnegative().optional(),
    taxes: z.object({
      stt: z.number().nonnegative().optional(),
      stampDuty: z.number().nonnegative().optional(),
      gst: z.number().nonnegative().optional(),
      sebiTurnover: z.number().nonnegative().optional(),
      exchangeTxn: z.number().nonnegative().optional()
    }).optional()
  }),
  stopLoss: z.number().positive().optional(),
  target: z.number().positive().optional(),
  strategy: z.string().max(50).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  notes: z.string().max(500).optional(),
  brokerId: z.string().optional()
});

const TradeQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  status: z.string().optional(),
  symbol: z.string().optional(),
  exchange: z.string().optional(),
  segment: z.string().optional(),
  tradeType: z.string().optional(),
  position: z.string().optional(),
  strategy: z.string().optional(),
  tags: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  minPnl: z.coerce.number().optional(),
  maxPnl: z.coerce.number().optional(),
  search: z.string().optional()
});
```

### 4.4 Broker DTOs

```typescript
// ===== REQUEST DTOs =====

interface BrokerConnectDTO {
  broker: 'zerodha' | 'upstox';
  redirectUrl?: string;
  permissions?: string[];
}

interface BrokerCallbackDTO {
  broker: 'zerodha' | 'upstox';
  requestToken?: string;
  code?: string;
  state: string;
}

interface TriggerSyncDTO {
  syncType?: 'full' | 'incremental';
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  includePositions?: boolean;
  includeHoldings?: boolean;
  force?: boolean;
}

interface UpdateBrokerSettingsDTO {
  isPrimary?: boolean;
  isActive?: boolean;
  syncFrequency?: '5m' | '15m' | '30m' | '1h' | 'manual';
  autoSync?: boolean;
  syncSettings?: {
    includePositions?: boolean;
    includeHoldings?: boolean;
    autoClosePositions?: boolean;
  };
}

// ===== RESPONSE DTOs =====

interface BrokerMetaDTO {
  id: string;
  name: string;
  displayName: string;
  logo: string;
  supported: boolean;
  features: string[];
  authType: 'oauth2';
  authUrl: string;
  documentation: string;
  comingSoon?: boolean;
}

interface BrokerAccountDTO {
  id: string;
  broker: string;
  brokerName: string;
  brokerId: string;
  clientId: string;
  isActive: boolean;
  isPrimary: boolean;
  permissions: string[];
  lastSyncAt?: string;
  nextSyncAt?: string;
  syncStatus: 'success' | 'failed' | 'pending' | 'in_progress';
  syncStats: {
    tradesImported: number;
    lastTradeDate?: string;
    syncFrequency: string;
  };
  tokenExpiresAt: string;
  createdAt: string;
}

interface AuthUrlDTO {
  authUrl: string;
  state: string;
  expiresAt: string;
}

interface SyncJobDTO {
  syncId: string;
  status: 'queued' | 'in_progress' | 'success' | 'failed';
  syncType: 'full' | 'incremental';
  progress: number;
  currentStep: string;
  steps: SyncStepDTO[];
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  stats?: SyncStatsDTO;
  error?: SyncErrorDTO;
}

interface SyncStepDTO {
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress?: number;
}

interface SyncStatsDTO {
  tradesImported: number;
  tradesUpdated: number;
  tradesSkipped: number;
  positionsUpdated: number;
  errors: number;
}

interface SyncStatusDTO {
  currentSync?: SyncJobDTO;
  lastSync?: SyncJobDTO;
  nextScheduledSync?: string;
  syncFrequency: string;
}

// ===== VALIDATION SCHEMAS =====

const BrokerConnectSchema = z.object({
  broker: z.enum(['zerodha', 'upstox']),
  redirectUrl: z.string().url().optional(),
  permissions: z.array(z.string()).optional()
});

const BrokerCallbackSchema = z.object({
  broker: z.enum(['zerodha', 'upstox']),
  requestToken: z.string().optional(),
  code: z.string().optional(),
  state: z.string().min(1)
}).refine(data => data.requestToken || data.code, {
  message: 'Either requestToken or code is required'
});

const TriggerSyncSchema = z.object({
  syncType: z.enum(['full', 'incremental']).optional(),
  dateRange: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime()
  }).optional(),
  includePositions: z.boolean().optional(),
  includeHoldings: z.boolean().optional(),
  force: z.boolean().optional()
});
```

### 4.5 Analytics DTOs

```typescript
// ===== REQUEST DTOs =====

interface OverviewQueryDTO {
  period?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom';
  startDate?: string;
  endDate?: string;
  compareWith?: 'previous' | 'none';
  segment?: 'equity' | 'futures' | 'options' | 'all';
}

interface CategoryQueryDTO {
  category: 'segment' | 'strategy' | 'symbol' | 'tradeType' | 'exchange' | 'broker' | 'tag';
  period?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  sortBy?: 'pnl' | 'trades' | 'winRate' | 'profitFactor';
  sortOrder?: 'asc' | 'desc';
}

interface CompareQueryDTO {
  type: 'period' | 'segment' | 'strategy' | 'broker';
  period1Start?: string;
  period1End?: string;
  period2Start?: string;
  period2End?: string;
  compare1?: string;
  compare2?: string;
}

// ===== RESPONSE DTOs =====

interface OverviewDTO {
  period: {
    start: string;
    end: string;
    label: string;
  };
  summary: {
    totalPnl: MetricWithChangeDTO;
    totalTrades: MetricWithChangeDTO;
    winRate: MetricWithChangeDTO;
    profitFactor: MetricWithChangeDTO;
    averageWin: MetricWithChangeDTO;
    averageLoss: MetricWithChangeDTO;
    largestWin: TradeReferenceDTO;
    largestLoss: TradeReferenceDTO;
    maxDrawdown: DrawdownDTO;
    consecutiveWins: { current: number; max: number };
    consecutiveLosses: { current: number; max: number };
  };
  capital: {
    starting: number;
    current: number;
    growth: number;
    peak: number;
    peakDate: string;
  };
  charges: ChargesBreakdownDTO;
  riskMetrics: RiskMetricsDTO;
}

interface MetricWithChangeDTO {
  value: number;
  change: number;
  changeType: 'increase' | 'decrease' | 'improvement';
}

interface TradeReferenceDTO {
  value: number;
  symbol: string;
  date: string;
  tradeId?: string;
}

interface DrawdownDTO {
  value: number;
  percentage: number;
  startDate: string;
  endDate: string;
  duration?: number;
  recoveryDays?: number;
}

interface RiskMetricsDTO {
  sharpeRatio: MetricInterpretationDTO;
  sortinoRatio: MetricInterpretationDTO;
  calmarRatio: MetricInterpretationDTO;
  maxDrawdown: DrawdownDTO;
  volatility: {
    daily: number;
    weekly: number;
    monthly: number;
    annualized: number;
  };
  beta: MetricInterpretationDTO;
  alpha: MetricInterpretationDTO;
  valueAtRisk: {
    daily95: number;
    daily99: number;
    weekly95: number;
    interpretation: string;
  };
  expectedShortfall: {
    daily95: number;
    interpretation: string;
  };
}

interface MetricInterpretationDTO {
  value: number;
  interpretation: string;
  benchmark?: number;
}

interface MonthlyDTO {
  month: string;
  monthName: string;
  trades: {
    total: number;
    winning: number;
    losing: number;
    breakeven: number;
  };
  pnl: {
    gross: number;
    net: number;
    charges: number;
  };
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  roi: number;
  maxDrawdown: number;
  tradingDays: number;
  averageTradesPerDay: number;
}

interface CategoryBreakdownDTO {
  name: string;
  displayName: string;
  trades: {
    total: number;
    winning: number;
    losing: number;
    breakeven: number;
  };
  pnl: {
    gross: number;
    net: number;
    charges: number;
  };
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  roi: number;
  contribution: number;
  avgHoldingPeriod: number;
}

interface HeatmapDTO {
  type: 'pnl' | 'trades' | 'winRate';
  year: number;
  data: HeatmapDayDTO[];
  statistics: HeatmapStatsDTO;
  monthSummary: MonthSummaryDTO[];
  weekdayAverage: Record<string, WeekdayStatsDTO>;
}

interface HeatmapDayDTO {
  date: string;
  value: number;
  trades: number;
  winRate: number;
  intensity: number; // -1 to 1 for color scaling
}

interface ComparisonDTO {
  type: 'period' | 'segment' | 'strategy';
  period1: PeriodDataDTO;
  period2: PeriodDataDTO;
  changes: Record<string, ChangeDTO>;
  insights: string[];
}

interface ChangeDTO {
  absolute: number;
  percentage: number;
}

// ===== VALIDATION SCHEMAS =====

const OverviewQuerySchema = z.object({
  period: z.enum(['today', 'week', 'month', 'quarter', 'year', 'all', 'custom']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  compareWith: z.enum(['previous', 'none']).optional(),
  segment: z.enum(['equity', 'futures', 'options', 'all']).optional()
}).refine(data => {
  if (data.period === 'custom') {
    return data.startDate && data.endDate;
  }
  return true;
}, { message: 'startDate and endDate required for custom period' });

const CategoryQuerySchema = z.object({
  category: z.enum(['segment', 'strategy', 'symbol', 'tradeType', 'exchange', 'broker', 'tag']),
  period: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  sortBy: z.enum(['pnl', 'trades', 'winRate', 'profitFactor']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});
```

### 4.6 Market Data DTOs

```typescript
// ===== REQUEST DTOs =====

interface CandleQueryDTO {
  interval: '1m' | '5m' | '15m' | '30m' | '1h' | '1d' | '1w' | '1M';
  from: string;
  to: string;
  exchange?: 'NSE' | 'BSE';
  adjustments?: boolean;
}

interface SubscribeDTO {
  symbols: string[];
  exchange?: 'NSE' | 'BSE';
  mode: 'ltp' | 'quote' | 'full';
}

// ===== RESPONSE DTOs =====

interface QuoteDTO {
  symbol: string;
  name?: string;
  exchange: string;
  lastPrice: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  close: number;
  previousClose: number;
  volume: number;
  value: number;
  avgPrice?: number;
  lastTradeTime?: string;
  timestamp: string;
}

interface QuoteFullDTO extends QuoteDTO {
  isin?: string;
  series?: string;
  lotSize: number;
  tickSize: number;
  priceRange: {
    week52High: number;
    week52Low: number;
    week52HighDate: string;
    week52LowDate: string;
  };
  depth?: OrderBookDepthDTO;
  fundamentals?: FundamentalsDTO;
  indices?: string[];
  status: string;
}

interface OrderBookDepthDTO {
  buy: DepthLevelDTO[];
  sell: DepthLevelDTO[];
  totalBuyQty: number;
  totalSellQty: number;
}

interface DepthLevelDTO {
  price: number;
  quantity: number;
  orders: number;
}

interface FundamentalsDTO {
  marketCap: number;
  marketCapCategory: 'Large Cap' | 'Mid Cap' | 'Small Cap';
  peRatio: number;
  pbRatio: number;
  dividendYield: number;
  eps: number;
  bookValue: number;
  faceValue: number;
  sector: string;
  industry: string;
}

interface CandleDTO {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  value?: number;
}

interface IndexQuoteDTO {
  symbol: string;
  name: string;
  exchange: string;
  lastPrice: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume?: number;
  value?: number;
  timestamp: string;
  status: 'open' | 'closed';
  advanceDecline?: {
    advances: number;
    declines: number;
    unchanged: number;
  };
}

interface MoverDTO {
  rank: number;
  symbol: string;
  name: string;
  exchange: string;
  lastPrice: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  value: number;
}

interface StockSearchResultDTO {
  symbol: string;
  name: string;
  exchange: string;
  segment: string;
  isin?: string;
  lastPrice?: number;
  changePercent?: number;
  matchType: 'symbol' | 'name' | 'isin';
}

interface MarketStatusDTO {
  nse: ExchangeStatusDTO;
  bse: ExchangeStatusDTO;
  mcx?: ExchangeStatusDTO;
  holidays: {
    upcoming: HolidayDTO[];
  };
  serverTime: string;
  timezone: string;
}

interface ExchangeStatusDTO {
  exchange: string;
  status: 'open' | 'closed' | 'pre-market' | 'post-market';
  session: string;
  lastUpdate: string;
  tradingHours: {
    preMarket: { start: string; end: string };
    regular: { start: string; end: string };
    postMarket: { start: string; end: string };
  };
  nextSession?: {
    type: string;
    starts: string;
  };
}

// ===== VALIDATION SCHEMAS =====

const CandleQuerySchema = z.object({
  interval: z.enum(['1m', '5m', '15m', '30m', '1h', '1d', '1w', '1M']),
  from: z.string().datetime(),
  to: z.string().datetime(),
  exchange: z.enum(['NSE', 'BSE']).optional(),
  adjustments: z.coerce.boolean().optional()
}).refine(data => {
  const from = new Date(data.from);
  const to = new Date(data.to);
  const maxDays = data.interval.includes('m') || data.interval === '1h' ? 30 : 365;
  const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= maxDays;
}, { message: 'Date range exceeds maximum allowed' });
```

### 4.7 Common DTOs

```typescript
// ===== PAGINATION =====

interface PaginatedQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: Pagination;
}

// ===== PERIOD =====

interface Period {
  start: Date;
  end: Date;
}

interface PeriodDTO {
  start: string;
  end: string;
  label?: string;
}

// ===== API RESPONSE WRAPPERS =====

interface SuccessResponse<T> {
  success: true;
  data: T;
  meta: ResponseMeta;
}

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  meta: ResponseMeta;
}

interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: Pagination;
  meta: ResponseMeta;
}

interface ResponseMeta {
  timestamp: string;
  requestId: string;
  cached?: boolean;
  cacheExpiry?: string;
}

// ===== COMMON VALIDATION SCHEMAS =====

const PaginatedQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

const DateRangeSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime()
}).refine(data => new Date(data.startDate) < new Date(data.endDate), {
  message: 'startDate must be before endDate'
});
```

### 4.8 DTO Summary

| Category | Request DTOs | Response DTOs | Schemas |
|----------|-------------|---------------|---------|
| **Auth** | 6 | 4 | 6 |
| **Trade** | 6 | 6 | 4 |
| **Broker** | 4 | 8 | 4 |
| **Analytics** | 3 | 12 | 3 |
| **Market** | 2 | 10 | 2 |
| **Common** | 2 | 4 | 3 |
| **Total** | **23** | **44** | **22** |

---

## 5. Utility Modules

Utility modules provide reusable helper functions and shared logic across the application.

### 5.1 Utility Module Structure

```
lib/
├── utils/
│   ├── validation.ts       # Generic validation helpers
│   ├── dates.ts            # Date/time utilities
│   ├── pnl.ts              # P&L calculation functions
│   ├── csv.ts              # CSV import/export helpers
│   ├── reconciliation.ts   # Trade reconciliation logic
│   ├── pagination.ts       # Pagination utilities
│   ├── cache.ts            # Redis cache helpers
│   ├── metrics.ts          # Prometheus metrics
│   ├── idempotency.ts      # Idempotent request handling
│   ├── sanitizer.ts        # PII/data sanitization
│   └── crypto.ts           # Encryption utilities
├── adapters/
│   ├── broker-adapter.ts   # Base broker adapter
│   ├── zerodha.adapter.ts  # Zerodha integration
│   ├── upstox.adapter.ts   # Upstox integration
│   └── market-provider.ts  # Market data provider
├── constants/
│   ├── error-codes.ts      # Error code definitions
│   ├── exchanges.ts        # Exchange constants
│   ├── charges.ts          # Brokerage/tax rates
│   └── limits.ts           # Rate limits, pagination limits
└── types/
    ├── common.types.ts     # Common TypeScript types
    ├── express.d.ts        # Express type extensions
    └── environment.d.ts    # Environment variables
```

### 5.2 Date Utilities (`utils/dates.ts`)

```typescript
import { format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek,
         startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks,
         subMonths, subYears, differenceInMinutes, differenceInDays,
         isWithinInterval, eachDayOfInterval, isSameDay } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime, formatInTimeZone } from 'date-fns-tz';

// Default timezone for Indian markets
const IST = 'Asia/Kolkata';

export class DateUtils {
  // ===== PERIOD PARSERS =====
  
  static getNamedPeriod(name: string, timezone: string = IST): Period {
    const now = utcToZonedTime(new Date(), timezone);
    
    switch (name) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      case 'week':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfDay(now) };
      case 'month':
        return { start: startOfMonth(now), end: endOfDay(now) };
      case 'quarter':
        return this.getCurrentQuarter(now);
      case 'year':
        return { start: startOfYear(now), end: endOfDay(now) };
      case 'ytd':
        return { start: startOfYear(now), end: endOfDay(now) };
      case 'fy': // Indian Financial Year (Apr-Mar)
        return this.getCurrentFinancialYear(now);
      case 'all':
        return { start: new Date(0), end: endOfDay(now) };
      default:
        return { start: startOfMonth(now), end: endOfDay(now) };
    }
  }

  static getPreviousPeriod(period: Period): Period {
    const duration = differenceInDays(period.end, period.start);
    return {
      start: subDays(period.start, duration + 1),
      end: subDays(period.start, 1)
    };
  }

  static getCurrentFinancialYear(date: Date): Period {
    const year = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
    return {
      start: new Date(year, 3, 1), // April 1
      end: new Date(year + 1, 2, 31, 23, 59, 59) // March 31
    };
  }

  static getCurrentQuarter(date: Date): Period {
    const quarter = Math.floor(date.getMonth() / 3);
    const startMonth = quarter * 3;
    return {
      start: new Date(date.getFullYear(), startMonth, 1),
      end: endOfMonth(new Date(date.getFullYear(), startMonth + 2, 1))
    };
  }

  // ===== TRADING HOURS =====
  
  static isMarketOpen(exchange: string = 'NSE', date: Date = new Date()): boolean {
    const ist = utcToZonedTime(date, IST);
    const day = ist.getDay();
    
    // Weekend check
    if (day === 0 || day === 6) return false;
    
    // TODO: Check holiday calendar
    
    const hours = ist.getHours();
    const minutes = ist.getMinutes();
    const time = hours * 60 + minutes;
    
    // NSE/BSE: 9:15 AM - 3:30 PM
    const marketOpen = 9 * 60 + 15; // 9:15 AM
    const marketClose = 15 * 60 + 30; // 3:30 PM
    
    return time >= marketOpen && time <= marketClose;
  }

  static getNextMarketOpen(exchange: string = 'NSE'): Date {
    const now = utcToZonedTime(new Date(), IST);
    let next = now;
    
    // If after market close, move to next day
    const hours = now.getHours();
    if (hours >= 15 || now.getDay() === 0 || now.getDay() === 6) {
      next = startOfDay(subDays(now, -1));
    }
    
    // Skip weekends
    while (next.getDay() === 0 || next.getDay() === 6) {
      next = subDays(next, -1);
    }
    
    // Set to 9:15 AM
    next.setHours(9, 15, 0, 0);
    
    return zonedTimeToUtc(next, IST);
  }

  // ===== HOLDING PERIOD =====
  
  static calculateHoldingPeriod(entry: Date, exit: Date): number {
    return differenceInMinutes(exit, entry);
  }

  static formatHoldingPeriod(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
  }

  // ===== FORMATTERS =====
  
  static formatDate(date: Date, formatStr: string = 'yyyy-MM-dd'): string {
    return format(date, formatStr);
  }

  static formatDateIST(date: Date, formatStr: string = 'yyyy-MM-dd HH:mm:ss'): string {
    return formatInTimeZone(date, IST, formatStr);
  }

  static toISO(date: Date): string {
    return date.toISOString();
  }

  static parseDate(dateStr: string): Date {
    return parseISO(dateStr);
  }

  // ===== TRADING DAY UTILS =====
  
  static getTradingDays(start: Date, end: Date, holidays: Date[] = []): Date[] {
    const days = eachDayOfInterval({ start, end });
    return days.filter(day => {
      const dayOfWeek = day.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidays.some(h => isSameDay(h, day));
      return !isWeekend && !isHoliday;
    });
  }

  static countTradingDays(start: Date, end: Date, holidays: Date[] = []): number {
    return this.getTradingDays(start, end, holidays).length;
  }
}
```

### 5.3 P&L Calculation (`utils/pnl.ts`)

```typescript
import { Trade, TradeLeg, PnL, Taxes } from '../types';
import { CHARGE_RATES } from '../constants/charges';

export class PnLCalculator {
  // ===== MAIN CALCULATIONS =====
  
  static calculatePnL(trade: Trade): PnL {
    if (!trade.exit) {
      // Open trade - only entry charges
      const entryCharges = this.calculateCharges(trade.entry, trade);
      return {
        gross: 0,
        net: -entryCharges,
        percentage: 0,
        charges: entryCharges
      };
    }

    const { entry, exit, position } = trade;
    const multiplier = position === 'long' ? 1 : -1;
    
    // Gross P&L
    const grossPnL = multiplier * (exit.price - entry.price) * entry.quantity;
    
    // Total charges
    const entryCharges = this.calculateCharges(entry, trade);
    const exitCharges = this.calculateCharges(exit, trade);
    const totalCharges = entryCharges + exitCharges;
    
    // Net P&L
    const netPnL = grossPnL - totalCharges;
    
    // Percentage (based on investment)
    const investment = entry.price * entry.quantity;
    const percentage = (netPnL / investment) * 100;

    return {
      gross: this.round(grossPnL),
      net: this.round(netPnL),
      percentage: this.round(percentage, 2),
      charges: this.round(totalCharges)
    };
  }

  // ===== CHARGE CALCULATION =====
  
  static calculateCharges(leg: TradeLeg, trade: Trade): number {
    // If taxes provided, use them
    if (leg.taxes) {
      return this.sumTaxes(leg.taxes) + (leg.brokerage || 0);
    }
    
    // Otherwise, calculate based on trade type
    const turnover = leg.price * leg.quantity;
    const rates = this.getChargeRates(trade.segment, trade.tradeType);
    
    const brokerage = leg.brokerage || this.calculateBrokerage(turnover, rates);
    const stt = this.calculateSTT(turnover, trade.segment, trade.tradeType, leg === trade.exit);
    const exchangeTxn = turnover * rates.exchangeTxn;
    const sebiTurnover = turnover * rates.sebiTurnover;
    const stampDuty = turnover * rates.stampDuty;
    const gst = (brokerage + exchangeTxn + sebiTurnover) * 0.18;
    
    return this.round(brokerage + stt + exchangeTxn + sebiTurnover + stampDuty + gst);
  }

  static calculateSTT(
    turnover: number,
    segment: string,
    tradeType: string,
    isSell: boolean
  ): number {
    switch (segment) {
      case 'equity':
        if (tradeType === 'intraday') {
          return isSell ? turnover * 0.00025 : 0; // 0.025% on sell only
        }
        return turnover * 0.001; // 0.1% on both buy & sell for delivery
      case 'futures':
        return isSell ? turnover * 0.0001 : 0; // 0.01% on sell
      case 'options':
        return isSell ? turnover * 0.0005 : 0; // 0.05% on sell (on premium)
      default:
        return 0;
    }
  }

  static calculateBrokerage(turnover: number, rates: ChargeRates): number {
    // Flat fee or percentage, whichever is lower
    const percentageFee = turnover * rates.brokeragePercent;
    return Math.min(percentageFee, rates.brokerageMax);
  }

  private static getChargeRates(segment: string, tradeType: string): ChargeRates {
    return CHARGE_RATES[segment]?.[tradeType] || CHARGE_RATES.default;
  }

  // ===== RISK METRICS =====
  
  static calculateRiskRewardRatio(
    entry: number,
    stopLoss: number,
    target: number,
    position: 'long' | 'short'
  ): number {
    if (!stopLoss || !target) return 0;
    
    const risk = position === 'long' 
      ? entry - stopLoss 
      : stopLoss - entry;
    
    const reward = position === 'long'
      ? target - entry
      : entry - target;
    
    if (risk <= 0) return 0;
    return this.round(reward / risk, 2);
  }

  static calculateBreakeven(
    entry: number,
    quantity: number,
    totalCharges: number,
    position: 'long' | 'short'
  ): number {
    const chargePerUnit = totalCharges / quantity;
    return position === 'long'
      ? entry + chargePerUnit
      : entry - chargePerUnit;
  }

  // ===== SUMMARY CALCULATIONS =====
  
  static calculateSummary(trades: Trade[]): TradeSummary {
    const closedTrades = trades.filter(t => t.status === 'closed');
    
    const winners = closedTrades.filter(t => t.pnl.net > 0);
    const losers = closedTrades.filter(t => t.pnl.net < 0);
    
    const totalProfit = winners.reduce((sum, t) => sum + t.pnl.net, 0);
    const totalLoss = Math.abs(losers.reduce((sum, t) => sum + t.pnl.net, 0));
    
    return {
      totalTrades: closedTrades.length,
      winners: winners.length,
      losers: losers.length,
      breakeven: closedTrades.length - winners.length - losers.length,
      winRate: closedTrades.length > 0 ? (winners.length / closedTrades.length) * 100 : 0,
      profitFactor: totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0,
      totalPnL: totalProfit - totalLoss,
      averageWin: winners.length > 0 ? totalProfit / winners.length : 0,
      averageLoss: losers.length > 0 ? totalLoss / losers.length : 0,
      expectancy: closedTrades.length > 0 
        ? (totalProfit - totalLoss) / closedTrades.length 
        : 0
    };
  }

  // ===== HELPERS =====
  
  private static sumTaxes(taxes: Taxes): number {
    return Object.values(taxes).reduce((sum, val) => sum + (val || 0), 0);
  }

  private static round(value: number, decimals: number = 2): number {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }
}
```

### 5.4 Cache Utilities (`utils/cache.ts`)

```typescript
import Redis from 'ioredis';

export class CacheService {
  private redis: Redis;
  private defaultTTL: number = 300; // 5 minutes

  constructor(redis: Redis) {
    this.redis = redis;
  }

  // ===== BASIC OPERATIONS =====
  
  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttl) {
      await this.redis.setex(key, ttl, serialized);
    } else {
      await this.redis.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.redis.exists(key)) === 1;
  }

  // ===== PATTERN OPERATIONS =====
  
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    
    const value = await fetcher();
    await this.set(key, value, ttl);
    return value;
  }

  async invalidatePattern(pattern: string): Promise<number> {
    const keys = await this.redis.keys(pattern);
    if (keys.length === 0) return 0;
    return await this.redis.del(...keys);
  }

  async invalidateUserCache(userId: string, scope?: string): Promise<void> {
    const pattern = scope 
      ? `user:${userId}:${scope}:*`
      : `user:${userId}:*`;
    await this.invalidatePattern(pattern);
  }

  // ===== KEY GENERATORS =====
  
  static keys = {
    // User analytics cache
    userOverview: (userId: string, period: string) => 
      `user:${userId}:analytics:overview:${period}`,
    userMonthly: (userId: string, year: number) => 
      `user:${userId}:analytics:monthly:${year}`,
    userStats: (userId: string, hash: string) =>
      `user:${userId}:stats:${hash}`,
    
    // Market data cache
    ltp: (exchange: string, symbol: string) => 
      `market:ltp:${exchange}:${symbol}`,
    quote: (exchange: string, symbol: string) => 
      `market:quote:${exchange}:${symbol}`,
    index: (symbol: string) => 
      `market:index:${symbol}`,
    candles: (exchange: string, symbol: string, interval: string) => 
      `market:candles:${exchange}:${symbol}:${interval}`,
    
    // Session/Auth
    session: (userId: string, sessionId: string) => 
      `session:${userId}:${sessionId}`,
    tokenBlacklist: (token: string) => 
      `token:blacklist:${token}`,
    refreshToken: (token: string) => 
      `token:refresh:${token}`,
    
    // Rate limiting
    rateLimit: (key: string, window: string) => 
      `ratelimit:${key}:${window}`,
    
    // Locks
    syncLock: (brokerAccountId: string) => 
      `lock:sync:${brokerAccountId}`,
    
    // Broker OAuth state
    oauthState: (state: string) =>
      `oauth:state:${state}`
  };

  // ===== TTL CONSTANTS =====
  
  static TTL = {
    LTP: 3,
    QUOTE: 5,
    INDEX: 3,
    CANDLE_1M: 60,
    CANDLE_5M: 300,
    CANDLE_1D: 3600,
    ANALYTICS_OVERVIEW: 300, // 5 min
    ANALYTICS_MONTHLY: 3600, // 1 hour
    SESSION: 86400, // 24 hours
    REFRESH_TOKEN: 604800, // 7 days
    OAUTH_STATE: 600, // 10 min
    SEARCH_RESULTS: 86400 // 24 hours
  };

  // ===== DISTRIBUTED LOCK =====
  
  async acquireLock(key: string, ttl: number = 30): Promise<string | null> {
    const lockId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const result = await this.redis.set(
      `lock:${key}`,
      lockId,
      'EX',
      ttl,
      'NX'
    );
    return result === 'OK' ? lockId : null;
  }

  async releaseLock(key: string, lockId: string): Promise<boolean> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    const result = await this.redis.eval(script, 1, `lock:${key}`, lockId);
    return result === 1;
  }

  async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = 30
  ): Promise<T> {
    const lockId = await this.acquireLock(key, ttl);
    if (!lockId) {
      throw new Error(`Failed to acquire lock: ${key}`);
    }
    try {
      return await fn();
    } finally {
      await this.releaseLock(key, lockId);
    }
  }
}
```

### 5.5 Pagination Utilities (`utils/pagination.ts`)

```typescript
export class PaginationUtils {
  static readonly DEFAULT_PAGE = 1;
  static readonly DEFAULT_LIMIT = 20;
  static readonly MAX_LIMIT = 100;

  // ===== PARSE & NORMALIZE =====
  
  static parse(query: any): PaginatedQuery {
    return {
      page: Math.max(1, parseInt(query.page) || this.DEFAULT_PAGE),
      limit: Math.min(
        this.MAX_LIMIT,
        Math.max(1, parseInt(query.limit) || this.DEFAULT_LIMIT)
      ),
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder === 'asc' ? 'asc' : 'desc'
    };
  }

  // ===== BUILD PAGINATION RESPONSE =====
  
  static buildPagination(
    page: number,
    limit: number,
    total: number
  ): Pagination {
    const totalPages = Math.ceil(total / limit);
    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }

  static buildResult<T>(
    data: T[],
    page: number,
    limit: number,
    total: number
  ): PaginatedResult<T> {
    return {
      data,
      pagination: this.buildPagination(page, limit, total)
    };
  }

  // ===== MONGODB HELPERS =====
  
  static buildMongoQuery(query: PaginatedQuery): MongoQueryOptions {
    const skip = (query.page - 1) * query.limit;
    const sort: Record<string, 1 | -1> = {
      [query.sortBy]: query.sortOrder === 'asc' ? 1 : -1
    };
    return { skip, limit: query.limit, sort };
  }

  // ===== CURSOR PAGINATION =====
  
  static decodeCursor(cursor: string): Record<string, any> | null {
    try {
      return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
    } catch {
      return null;
    }
  }

  static encodeCursor(data: Record<string, any>): string {
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  static buildCursorPagination<T extends { _id: string }>(
    data: T[],
    limit: number,
    hasMore: boolean
  ): CursorPaginatedResult<T> {
    const lastItem = data[data.length - 1];
    return {
      data,
      pagination: {
        nextCursor: hasMore && lastItem 
          ? this.encodeCursor({ id: lastItem._id }) 
          : null,
        hasMore
      }
    };
  }
}

interface CursorPaginatedResult<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
  };
}
```

### 5.6 CSV Utilities (`utils/csv.ts`)

```typescript
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';
import { Readable, Transform } from 'stream';

export class CSVUtils {
  // ===== IMPORT =====
  
  static async parseCSV<T>(
    buffer: Buffer,
    options: CSVParseOptions = {}
  ): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const results: T[] = [];
      const parser = parse({
        columns: options.columns ?? true,
        skip_empty_lines: true,
        trim: true,
        ...options
      });

      parser.on('readable', () => {
        let record;
        while ((record = parser.read()) !== null) {
          results.push(record);
        }
      });

      parser.on('error', reject);
      parser.on('end', () => resolve(results));

      parser.write(buffer);
      parser.end();
    });
  }

  static async parseTrades(
    buffer: Buffer,
    mapping: CSVColumnMapping
  ): Promise<ParsedTrade[]> {
    const rows = await this.parseCSV<Record<string, string>>(buffer);
    
    return rows.map((row, index) => {
      try {
        return {
          rowNumber: index + 2, // +2 for header and 0-index
          data: {
            symbol: row[mapping.symbol],
            exchange: row[mapping.exchange] || 'NSE',
            segment: this.parseSegment(row[mapping.segment]),
            tradeType: this.parseTradeType(row[mapping.tradeType]),
            position: this.parsePosition(row[mapping.position] || row[mapping.transactionType]),
            entryPrice: parseFloat(row[mapping.entryPrice]),
            entryQuantity: parseInt(row[mapping.quantity]),
            entryTimestamp: this.parseDate(row[mapping.entryDate], row[mapping.entryTime]),
            exitPrice: row[mapping.exitPrice] ? parseFloat(row[mapping.exitPrice]) : undefined,
            exitTimestamp: row[mapping.exitDate] 
              ? this.parseDate(row[mapping.exitDate], row[mapping.exitTime]) 
              : undefined,
            brokerage: row[mapping.brokerage] ? parseFloat(row[mapping.brokerage]) : undefined
          },
          valid: true
        };
      } catch (error) {
        return {
          rowNumber: index + 2,
          data: row,
          valid: false,
          error: (error as Error).message
        };
      }
    });
  }

  // ===== EXPORT =====
  
  static async generateCSV<T>(
    data: T[],
    columns: CSVColumn[]
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      
      const stringifier = stringify({
        header: true,
        columns: columns.map(c => ({ key: c.key, header: c.header }))
      });

      stringifier.on('readable', () => {
        let chunk;
        while ((chunk = stringifier.read()) !== null) {
          chunks.push(Buffer.from(chunk));
        }
      });

      stringifier.on('error', reject);
      stringifier.on('finish', () => resolve(Buffer.concat(chunks)));

      data.forEach(row => stringifier.write(row));
      stringifier.end();
    });
  }

  static getTradeExportColumns(): CSVColumn[] {
    return [
      { key: 'id', header: 'Trade ID' },
      { key: 'symbol', header: 'Symbol' },
      { key: 'exchange', header: 'Exchange' },
      { key: 'segment', header: 'Segment' },
      { key: 'tradeType', header: 'Trade Type' },
      { key: 'position', header: 'Position' },
      { key: 'entryPrice', header: 'Entry Price' },
      { key: 'entryQuantity', header: 'Quantity' },
      { key: 'entryDate', header: 'Entry Date' },
      { key: 'exitPrice', header: 'Exit Price' },
      { key: 'exitDate', header: 'Exit Date' },
      { key: 'grossPnL', header: 'Gross P&L' },
      { key: 'netPnL', header: 'Net P&L' },
      { key: 'charges', header: 'Charges' },
      { key: 'status', header: 'Status' },
      { key: 'strategy', header: 'Strategy' },
      { key: 'tags', header: 'Tags' },
      { key: 'notes', header: 'Notes' }
    ];
  }

  // ===== HELPERS =====
  
  private static parseDate(date: string, time?: string): Date {
    // Handle various date formats
    const dateStr = date.trim();
    const timeStr = time?.trim() || '00:00:00';
    
    // Try ISO format first
    if (dateStr.includes('T')) {
      return new Date(dateStr);
    }
    
    // DD/MM/YYYY or DD-MM-YYYY
    const parts = dateStr.split(/[/-]/);
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timeStr}`);
    }
    
    throw new Error(`Invalid date format: ${dateStr}`);
  }

  private static parseSegment(value: string): string {
    const normalized = value?.toLowerCase().trim();
    const mapping: Record<string, string> = {
      'eq': 'equity', 'cash': 'equity', 'equity': 'equity',
      'fo': 'futures', 'fut': 'futures', 'futures': 'futures',
      'opt': 'options', 'options': 'options',
      'mcx': 'commodity', 'commodity': 'commodity'
    };
    return mapping[normalized] || 'equity';
  }

  private static parseTradeType(value: string): string {
    const normalized = value?.toLowerCase().trim();
    const mapping: Record<string, string> = {
      'mis': 'intraday', 'intraday': 'intraday',
      'cnc': 'delivery', 'delivery': 'delivery',
      'swing': 'swing', 'positional': 'swing'
    };
    return mapping[normalized] || 'delivery';
  }

  private static parsePosition(value: string): string {
    const normalized = value?.toLowerCase().trim();
    if (['buy', 'long', 'b'].includes(normalized)) return 'long';
    if (['sell', 'short', 's'].includes(normalized)) return 'short';
    return 'long';
  }
}

interface CSVColumn {
  key: string;
  header: string;
}

interface CSVColumnMapping {
  symbol: string;
  exchange?: string;
  segment?: string;
  tradeType?: string;
  position?: string;
  transactionType?: string;
  entryPrice: string;
  quantity: string;
  entryDate: string;
  entryTime?: string;
  exitPrice?: string;
  exitDate?: string;
  exitTime?: string;
  brokerage?: string;
}
```

### 5.7 Crypto Utilities (`utils/crypto.ts`)

```typescript
import crypto from 'crypto';

export class CryptoUtils {
  private static algorithm = 'aes-256-gcm';
  private static ivLength = 16;
  private static tagLength = 16;
  private static saltLength = 32;

  // ===== ENCRYPTION =====
  
  static encrypt(text: string, key: string): string {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(
      this.algorithm,
      this.deriveKey(key),
      iv
    );
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Return iv:tag:encrypted
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  }

  static decrypt(encryptedText: string, key: string): string {
    const [ivHex, tagHex, encrypted] = encryptedText.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.deriveKey(key),
      iv
    );
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  private static deriveKey(password: string): Buffer {
    return crypto.scryptSync(password, 'salt', 32);
  }

  // ===== HASHING =====
  
  static hash(text: string, algorithm: string = 'sha256'): string {
    return crypto.createHash(algorithm).update(text).digest('hex');
  }

  static hashWithSalt(text: string): { hash: string; salt: string } {
    const salt = crypto.randomBytes(this.saltLength).toString('hex');
    const hash = crypto
      .pbkdf2Sync(text, salt, 100000, 64, 'sha512')
      .toString('hex');
    return { hash, salt };
  }

  static verifyHash(text: string, hash: string, salt: string): boolean {
    const computedHash = crypto
      .pbkdf2Sync(text, salt, 100000, 64, 'sha512')
      .toString('hex');
    return crypto.timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(computedHash, 'hex')
    );
  }

  // ===== RANDOM GENERATION =====
  
  static generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  static generateOTP(length: number = 6): string {
    const max = Math.pow(10, length);
    const min = Math.pow(10, length - 1);
    const num = crypto.randomInt(min, max);
    return num.toString();
  }

  static generateUUID(): string {
    return crypto.randomUUID();
  }

  // ===== HMAC =====
  
  static hmac(data: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');
  }

  static verifyHmac(data: string, signature: string, secret: string): boolean {
    const computed = this.hmac(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(computed, 'hex')
    );
  }
}
```

### 5.8 Utility Modules Summary

| Module | Functions | Purpose |
|--------|-----------|---------|
| `dates.ts` | 15 | Period parsing, market hours, holding period |
| `pnl.ts` | 10 | P&L, charges, risk-reward calculation |
| `cache.ts` | 12 | Redis operations, key patterns, locks |
| `pagination.ts` | 8 | Query parsing, response building |
| `csv.ts` | 8 | Import/export, parsing, column mapping |
| `crypto.ts` | 10 | Encryption, hashing, token generation |

---

## 6. Error Handling Layer

A robust error handling layer ensures consistent API responses, proper logging, and graceful failure management.

### 6.1 Error Class Hierarchy

```
Error (JavaScript built-in)
└── AppError (Base application error)
    ├── ValidationError (400)
    ├── AuthenticationError (401)
    ├── AuthorizationError (403)
    ├── NotFoundError (404)
    ├── ConflictError (409)
    ├── RateLimitError (429)
    ├── BrokerError (502/503)
    ├── ExternalServiceError (502)
    └── InternalError (500)
```

### 6.2 Base AppError Class

```typescript
// errors/AppError.ts

export interface ErrorDetails {
  field?: string;
  message?: string;
  code?: string;
  [key: string]: any;
}

export abstract class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: ErrorDetails[];
  public readonly timestamp: Date;
  public readonly requestId?: string;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational: boolean = true,
    details?: ErrorDetails[]
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date();
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp.toISOString(),
        requestId: this.requestId
      }
    };
  }
}
```

### 6.3 Specialized Error Classes

```typescript
// errors/ValidationError.ts
export class ValidationError extends AppError {
  constructor(
    message: string = 'Validation failed',
    details?: ErrorDetails[]
  ) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
  }

  static fromZod(zodError: ZodError): ValidationError {
    const details = zodError.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }));
    return new ValidationError('Validation failed', details);
  }

  static field(field: string, message: string): ValidationError {
    return new ValidationError('Validation failed', [{ field, message }]);
  }
}

// errors/AuthenticationError.ts
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR', true);
  }

  static invalidCredentials(): AuthenticationError {
    return new AuthenticationError('Invalid email or password');
  }

  static tokenExpired(): AuthenticationError {
    return new AuthenticationError('Token has expired');
  }

  static tokenInvalid(): AuthenticationError {
    return new AuthenticationError('Invalid or malformed token');
  }

  static tokenRevoked(): AuthenticationError {
    return new AuthenticationError('Token has been revoked');
  }
}

// errors/AuthorizationError.ts
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR', true);
  }

  static insufficientPermissions(): AuthorizationError {
    return new AuthorizationError('Insufficient permissions for this action');
  }

  static resourceOwnership(): AuthorizationError {
    return new AuthorizationError('You do not own this resource');
  }
}

// errors/NotFoundError.ts
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', id?: string) {
    const message = id
      ? `${resource} with ID '${id}' not found`
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND_ERROR', true);
  }

  static trade(id: string): NotFoundError {
    return new NotFoundError('Trade', id);
  }

  static user(id: string): NotFoundError {
    return new NotFoundError('User', id);
  }

  static brokerAccount(id: string): NotFoundError {
    return new NotFoundError('Broker account', id);
  }
}

// errors/ConflictError.ts
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR', true);
  }

  static emailExists(): ConflictError {
    return new ConflictError('Email already registered');
  }

  static duplicateTrade(): ConflictError {
    return new ConflictError('Duplicate trade entry');
  }

  static brokerAlreadyConnected(): ConflictError {
    return new ConflictError('Broker account already connected');
  }
}

// errors/RateLimitError.ts
export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(retryAfter: number = 60) {
    super('Rate limit exceeded', 429, 'RATE_LIMIT_ERROR', true);
    this.retryAfter = retryAfter;
  }
}

// errors/BrokerError.ts
export class BrokerError extends AppError {
  public readonly broker: string;
  public readonly originalError?: any;

  constructor(
    broker: string,
    message: string,
    statusCode: number = 502,
    originalError?: any
  ) {
    super(message, statusCode, 'BROKER_ERROR', true);
    this.broker = broker;
    this.originalError = originalError;
  }

  static connectionFailed(broker: string): BrokerError {
    return new BrokerError(broker, `Failed to connect to ${broker}`);
  }

  static tokenExpired(broker: string): BrokerError {
    return new BrokerError(broker, `${broker} token has expired`, 401);
  }

  static syncFailed(broker: string, reason: string): BrokerError {
    return new BrokerError(broker, `${broker} sync failed: ${reason}`);
  }

  static rateLimited(broker: string): BrokerError {
    return new BrokerError(broker, `${broker} rate limit exceeded`, 503);
  }
}

// errors/ExternalServiceError.ts
export class ExternalServiceError extends AppError {
  public readonly service: string;

  constructor(service: string, message?: string) {
    super(
      message || `External service '${service}' is unavailable`,
      502,
      'EXTERNAL_SERVICE_ERROR',
      true
    );
    this.service = service;
  }
}

// errors/InternalError.ts
export class InternalError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, 'INTERNAL_ERROR', false);
  }
}
```

### 6.4 Error Middleware

```typescript
// middleware/errorHandler.ts

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Attach request ID for tracing
  const requestId = req.headers['x-request-id'] as string || generateRequestId();

  // Handle AppError (operational errors)
  if (err instanceof AppError) {
    (err as any).requestId = requestId;
    
    // Log operational errors at appropriate level
    if (err.statusCode >= 500) {
      logger.error({
        err,
        requestId,
        path: req.path,
        method: req.method,
        userId: req.user?.id
      }, 'Server error occurred');
    } else if (err.statusCode >= 400) {
      logger.warn({
        code: err.code,
        message: err.message,
        requestId,
        path: req.path,
        userId: req.user?.id
      }, 'Client error');
    }

    // Add rate limit headers if applicable
    if (err instanceof RateLimitError) {
      res.setHeader('Retry-After', err.retryAfter);
      res.setHeader('X-RateLimit-Reset', Date.now() + err.retryAfter * 1000);
    }

    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    const validationError = ValidationError.fromZod(err as any);
    (validationError as any).requestId = requestId;
    res.status(400).json(validationError.toJSON());
    return;
  }

  // Handle MongoDB errors
  if (err.name === 'MongoServerError') {
    const mongoErr = err as any;
    if (mongoErr.code === 11000) {
      const field = Object.keys(mongoErr.keyPattern)[0];
      const conflictError = new ConflictError(`${field} already exists`);
      res.status(409).json(conflictError.toJSON());
      return;
    }
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    const authError = err.name === 'TokenExpiredError'
      ? AuthenticationError.tokenExpired()
      : AuthenticationError.tokenInvalid();
    res.status(401).json(authError.toJSON());
    return;
  }

  // Unknown/programming errors (non-operational)
  logger.error({
    err,
    stack: err.stack,
    requestId,
    path: req.path,
    method: req.method,
    body: req.body,
    userId: req.user?.id
  }, 'Unhandled error');

  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred'
    : err.message;

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message,
      requestId,
      timestamp: new Date().toISOString()
    }
  });
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
```

### 6.5 Async Handler Wrapper

```typescript
// middleware/asyncHandler.ts

import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Usage example
// router.get('/trades', asyncHandler(async (req, res) => {
//   const trades = await tradeService.list(req.user.id, req.query);
//   res.json(trades);
// }));
```

### 6.6 Error Factory Pattern

```typescript
// errors/ErrorFactory.ts

export class ErrorFactory {
  // ===== VALIDATION =====
  static validation(details: ErrorDetails[]): ValidationError {
    return new ValidationError('Validation failed', details);
  }

  static invalidField(field: string, message: string): ValidationError {
    return ValidationError.field(field, message);
  }

  static requiredField(field: string): ValidationError {
    return ValidationError.field(field, `${field} is required`);
  }

  static invalidFormat(field: string, expected: string): ValidationError {
    return ValidationError.field(field, `Invalid format. Expected: ${expected}`);
  }

  // ===== AUTH =====
  static unauthorized(message?: string): AuthenticationError {
    return new AuthenticationError(message);
  }

  static forbidden(message?: string): AuthorizationError {
    return new AuthorizationError(message);
  }

  // ===== RESOURCES =====
  static notFound(resource: string, id?: string): NotFoundError {
    return new NotFoundError(resource, id);
  }

  static conflict(message: string): ConflictError {
    return new ConflictError(message);
  }

  // ===== EXTERNAL =====
  static broker(broker: string, message: string): BrokerError {
    return new BrokerError(broker, message);
  }

  static externalService(service: string): ExternalServiceError {
    return new ExternalServiceError(service);
  }

  // ===== RATE LIMIT =====
  static rateLimit(retryAfter: number): RateLimitError {
    return new RateLimitError(retryAfter);
  }
}
```

### 6.7 Retry Policies

```typescript
// utils/retry.ts

interface RetryOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
  onRetry?: (error: Error, attempt: number, delay: number) => void;
}

const defaultOptions: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: Error | null = null;
  let delay = opts.initialDelay;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      if (!isRetryable(error, opts.retryableErrors)) {
        throw error;
      }

      // Last attempt failed
      if (attempt === opts.maxAttempts) {
        throw error;
      }

      // Notify retry callback
      opts.onRetry?.(error as Error, attempt, delay);

      // Wait before retry
      await sleep(delay);

      // Exponential backoff with jitter
      delay = Math.min(
        opts.maxDelay,
        delay * opts.backoffMultiplier * (0.5 + Math.random())
      );
    }
  }

  throw lastError;
}

function isRetryable(error: any, retryableErrors?: string[]): boolean {
  // Non-operational errors (bugs) should not be retried
  if (error instanceof AppError && !error.isOperational) {
    return false;
  }

  // Check specific error codes
  if (retryableErrors && retryableErrors.length > 0) {
    return retryableErrors.includes(error.code);
  }

  // Default retryable conditions
  const retryableCodes = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'EPIPE',
    'RATE_LIMIT_ERROR',
    'EXTERNAL_SERVICE_ERROR'
  ];

  return (
    retryableCodes.includes(error.code) ||
    (error.statusCode >= 500 && error.statusCode < 600) ||
    error.statusCode === 429
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== CIRCUIT BREAKER =====

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailure: Date | null = null;
  private nextAttempt: Date | null = null;

  constructor(
    private name: string,
    private options: CircuitBreakerOptions = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 30000,
      resetTimeout: 60000
    }
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.nextAttempt && new Date() > this.nextAttempt) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new ExternalServiceError(
          this.name,
          `Circuit breaker is OPEN. Retry after ${this.nextAttempt}`
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.options.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successes = 0;
        logger.info({ circuit: this.name }, 'Circuit breaker CLOSED');
      }
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailure = new Date();
    this.successes = 0;

    if (this.failures >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = new Date(Date.now() + this.options.resetTimeout);
      logger.warn({ circuit: this.name }, 'Circuit breaker OPEN');
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}
```

### 6.8 Error Codes Reference

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `AUTHENTICATION_ERROR` | 401 | Authentication required or failed |
| `AUTHORIZATION_ERROR` | 403 | Access denied / forbidden |
| `NOT_FOUND_ERROR` | 404 | Resource not found |
| `CONFLICT_ERROR` | 409 | Resource conflict (duplicate) |
| `RATE_LIMIT_ERROR` | 429 | Too many requests |
| `BROKER_ERROR` | 502/503 | Broker API failure |
| `EXTERNAL_SERVICE_ERROR` | 502 | External service unavailable |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## 7. Logging Architecture

A structured logging architecture provides observability, debugging capabilities, and audit trails.

### 7.1 Logging Stack

```
┌──────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
├──────────────────────────────────────────────────────────────┤
│  Logger (Pino/Winston)  │  Correlation ID Middleware        │
├──────────────────────────────────────────────────────────────┤
│                    Transport Layer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Console     │  │ File        │  │ External Services   │  │
│  │ (Dev/Debug) │  │ (Rotation)  │  │ (CloudWatch/Loki)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│                    Analysis Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Kibana/     │  │ Grafana     │  │ CloudWatch Logs     │  │
│  │ OpenSearch  │  │ Loki        │  │ Insights            │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 7.2 Logger Configuration

```typescript
// config/logger.ts

import pino, { Logger, LoggerOptions } from 'pino';
import { randomUUID } from 'crypto';

// ===== LOG LEVELS =====
export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

// ===== ENVIRONMENT-BASED CONFIG =====
function getLoggerConfig(): LoggerOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';

  const baseConfig: LoggerOptions = {
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
      bindings: (bindings) => ({
        pid: bindings.pid,
        host: bindings.hostname,
        node_version: process.version
      })
    },
    redact: {
      paths: [
        'password',
        'accessToken',
        'refreshToken',
        'apiKey',
        'secret',
        'authorization',
        '*.password',
        '*.accessToken',
        '*.refreshToken',
        'req.headers.authorization',
        'req.headers.cookie'
      ],
      censor: '[REDACTED]'
    }
  };

  // Development: Pretty print
  if (isDevelopment) {
    return {
      ...baseConfig,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          messageFormat: '{req.method} {req.url} - {msg}'
        }
      }
    };
  }

  // Production: JSON format with additional metadata
  return {
    ...baseConfig,
    base: {
      env: process.env.NODE_ENV,
      service: 'stock-trade-tracker',
      version: process.env.APP_VERSION || '1.0.0'
    }
  };
}

// ===== CREATE LOGGER =====
export const logger: Logger = pino(getLoggerConfig());

// ===== CHILD LOGGERS =====
export function createChildLogger(context: Record<string, any>): Logger {
  return logger.child(context);
}

export function createRequestLogger(requestId: string): Logger {
  return logger.child({ requestId });
}

// ===== SERVICE LOGGERS =====
export const loggers = {
  auth: logger.child({ module: 'auth' }),
  trade: logger.child({ module: 'trade' }),
  broker: logger.child({ module: 'broker' }),
  analytics: logger.child({ module: 'analytics' }),
  market: logger.child({ module: 'market' }),
  worker: logger.child({ module: 'worker' }),
  cache: logger.child({ module: 'cache' }),
  db: logger.child({ module: 'database' })
};
```

### 7.3 Correlation ID Middleware

```typescript
// middleware/correlationId.ts

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';

// Store for request context
export const requestContext = new AsyncLocalStorage<RequestContext>();

interface RequestContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  startTime: number;
}

export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Extract or generate request ID
  const requestId = (req.headers['x-request-id'] as string) ||
                    (req.headers['x-correlation-id'] as string) ||
                    generateRequestId();

  // Set on response headers
  res.setHeader('X-Request-Id', requestId);

  // Attach to request object
  req.requestId = requestId;

  // Create context
  const context: RequestContext = {
    requestId,
    startTime: Date.now()
  };

  // Run remaining middleware within context
  requestContext.run(context, () => next());
}

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;
}

// ===== CONTEXT HELPERS =====

export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}

export function setUserId(userId: string): void {
  const store = requestContext.getStore();
  if (store) {
    store.userId = userId;
  }
}

export function getRequestContext(): RequestContext | undefined {
  return requestContext.getStore();
}

// ===== TYPED REQUEST EXTENSION =====
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}
```

### 7.4 Request Logging Middleware

```typescript
// middleware/requestLogger.ts

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { getRequestId, getRequestContext } from './correlationId';

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();
  const requestId = getRequestId();

  // Log incoming request
  logger.info({
    type: 'request',
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: req.user?.id
  }, 'Incoming request');

  // Capture response
  const originalSend = res.send;
  res.send = function (body: any) {
    res.send = originalSend;
    
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 400 ? 'warn' : 'info';

    logger[level]({
      type: 'response',
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.id,
      contentLength: res.get('Content-Length')
    }, 'Request completed');

    return originalSend.call(this, body);
  };

  next();
}

// ===== SLOW REQUEST LOGGING =====

const SLOW_REQUEST_THRESHOLD = 3000; // 3 seconds

export function slowRequestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    if (duration > SLOW_REQUEST_THRESHOLD) {
      logger.warn({
        type: 'slow_request',
        requestId: getRequestId(),
        method: req.method,
        path: req.path,
        duration,
        threshold: SLOW_REQUEST_THRESHOLD,
        userId: req.user?.id
      }, 'Slow request detected');
    }
  });

  next();
}
```

### 7.5 Audit Logging

```typescript
// utils/auditLogger.ts

import { logger } from '../config/logger';
import { getRequestId } from '../middleware/correlationId';

export enum AuditAction {
  // Auth
  USER_REGISTER = 'USER_REGISTER',
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  
  // Trade
  TRADE_CREATE = 'TRADE_CREATE',
  TRADE_UPDATE = 'TRADE_UPDATE',
  TRADE_DELETE = 'TRADE_DELETE',
  TRADE_CLOSE = 'TRADE_CLOSE',
  TRADE_IMPORT = 'TRADE_IMPORT',
  TRADE_EXPORT = 'TRADE_EXPORT',
  
  // Broker
  BROKER_CONNECT = 'BROKER_CONNECT',
  BROKER_DISCONNECT = 'BROKER_DISCONNECT',
  BROKER_SYNC = 'BROKER_SYNC',
  
  // Settings
  SETTINGS_UPDATE = 'SETTINGS_UPDATE',
  PROFILE_UPDATE = 'PROFILE_UPDATE'
}

interface AuditLogEntry {
  action: AuditAction;
  userId: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

const auditLogger = logger.child({ type: 'audit' });

export function audit(entry: AuditLogEntry): void {
  const logEntry = {
    ...entry,
    requestId: getRequestId(),
    timestamp: new Date().toISOString()
  };

  if (entry.success) {
    auditLogger.info(logEntry, `Audit: ${entry.action}`);
  } else {
    auditLogger.warn(logEntry, `Audit (failed): ${entry.action}`);
  }
}

// ===== CONVENIENCE FUNCTIONS =====

export function auditAuth(
  action: AuditAction,
  userId: string,
  success: boolean,
  details?: Record<string, any>
): void {
  audit({
    action,
    userId,
    resourceType: 'auth',
    success,
    details
  });
}

export function auditTrade(
  action: AuditAction,
  userId: string,
  tradeId: string,
  success: boolean,
  details?: Record<string, any>
): void {
  audit({
    action,
    userId,
    resourceType: 'trade',
    resourceId: tradeId,
    success,
    details
  });
}

export function auditBroker(
  action: AuditAction,
  userId: string,
  broker: string,
  success: boolean,
  details?: Record<string, any>
): void {
  audit({
    action,
    userId,
    resourceType: 'broker',
    resourceId: broker,
    success,
    details
  });
}
```

### 7.6 Structured Log Format

```typescript
// Log format examples for different scenarios

// ===== STANDARD INFO LOG =====
{
  "level": "info",
  "time": "2024-01-15T10:30:00.000Z",
  "requestId": "req_1xyz_abc123",
  "module": "trade",
  "userId": "usr_abc123",
  "msg": "Trade created successfully",
  "tradeId": "trd_xyz789",
  "symbol": "RELIANCE",
  "quantity": 100
}

// ===== ERROR LOG =====
{
  "level": "error",
  "time": "2024-01-15T10:31:00.000Z",
  "requestId": "req_2abc_def456",
  "module": "broker",
  "userId": "usr_abc123",
  "err": {
    "type": "BrokerError",
    "message": "Zerodha sync failed: Rate limit exceeded",
    "code": "BROKER_ERROR",
    "statusCode": 503,
    "stack": "BrokerError: Zerodha sync failed..."
  },
  "msg": "Broker sync failed"
}

// ===== AUDIT LOG =====
{
  "level": "info",
  "time": "2024-01-15T10:32:00.000Z",
  "type": "audit",
  "action": "TRADE_CREATE",
  "userId": "usr_abc123",
  "resourceType": "trade",
  "resourceId": "trd_xyz789",
  "success": true,
  "details": {
    "symbol": "RELIANCE",
    "position": "long",
    "quantity": 100
  },
  "requestId": "req_3ghi_jkl789",
  "ipAddress": "192.168.1.1"
}

// ===== PERFORMANCE LOG =====
{
  "level": "warn",
  "time": "2024-01-15T10:33:00.000Z",
  "type": "slow_request",
  "requestId": "req_4mno_pqr012",
  "method": "GET",
  "path": "/api/v1/analytics/overview",
  "duration": 4523,
  "threshold": 3000,
  "userId": "usr_abc123",
  "msg": "Slow request detected"
}
```

### 7.7 Log Rotation & Retention

```typescript
// config/logRotation.ts

import { createStream } from 'rotating-file-stream';
import path from 'path';

// ===== FILE ROTATION CONFIG =====
const rotationOptions = {
  size: '10M',      // Rotate every 10MB
  interval: '1d',   // Rotate daily
  compress: 'gzip', // Compress rotated files
  maxFiles: 14,     // Keep 14 days
  path: process.env.LOG_PATH || './logs'
};

// Create rotating streams
export const accessLogStream = createStream('access.log', rotationOptions);
export const errorLogStream = createStream('error.log', {
  ...rotationOptions,
  maxFiles: 30 // Keep error logs longer
});
export const auditLogStream = createStream('audit.log', {
  ...rotationOptions,
  maxFiles: 90 // Keep audit logs 90 days
});

// ===== RETENTION POLICY =====
export const logRetention = {
  access: 14,   // 14 days
  error: 30,    // 30 days
  audit: 90,    // 90 days (compliance)
  debug: 7      // 7 days
};

// ===== CLOUDWATCH CONFIG =====
export const cloudwatchConfig = {
  logGroupName: `/stocktracker/${process.env.NODE_ENV}`,
  logStreams: {
    application: 'application',
    error: 'error',
    audit: 'audit',
    access: 'access'
  },
  retentionDays: {
    application: 14,
    error: 30,
    audit: 365,
    access: 14
  }
};
```

### 7.8 Metrics & Observability

```typescript
// utils/metrics.ts

import { Counter, Histogram, Gauge, Registry } from 'prom-client';

// Create custom registry
export const metricsRegistry = new Registry();

// ===== HTTP METRICS =====
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [metricsRegistry]
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  registers: [metricsRegistry]
});

// ===== BUSINESS METRICS =====
export const tradesCreated = new Counter({
  name: 'trades_created_total',
  help: 'Total trades created',
  labelNames: ['segment', 'trade_type', 'position'],
  registers: [metricsRegistry]
});

export const brokerSyncs = new Counter({
  name: 'broker_syncs_total',
  help: 'Total broker sync operations',
  labelNames: ['broker', 'status'],
  registers: [metricsRegistry]
});

export const activeSessions = new Gauge({
  name: 'active_sessions',
  help: 'Number of active user sessions',
  registers: [metricsRegistry]
});

export const websocketConnections = new Gauge({
  name: 'websocket_connections',
  help: 'Number of active WebSocket connections',
  registers: [metricsRegistry]
});

// ===== CACHE METRICS =====
export const cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Total cache hits',
  labelNames: ['cache_name'],
  registers: [metricsRegistry]
});

export const cacheMisses = new Counter({
  name: 'cache_misses_total',
  help: 'Total cache misses',
  labelNames: ['cache_name'],
  registers: [metricsRegistry]
});

// ===== DATABASE METRICS =====
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration',
  labelNames: ['operation', 'collection'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [metricsRegistry]
});

// ===== METRICS MIDDLEWARE =====
export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9;
    const path = req.route?.path || req.path;
    const labels = {
      method: req.method,
      path,
      status: res.statusCode.toString()
    };

    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, duration);
  });

  next();
}

// ===== EXPOSE METRICS ENDPOINT =====
export async function getMetrics(): Promise<string> {
  return metricsRegistry.metrics();
}
```

### 7.9 Logging Summary

| Component | Purpose | Retention |
|-----------|---------|-----------|
| **Request Logs** | HTTP request/response tracking | 14 days |
| **Error Logs** | Exception and error details | 30 days |
| **Audit Logs** | Security and compliance events | 90 days |
| **Debug Logs** | Development troubleshooting | 7 days |
| **Metrics** | Prometheus time-series data | 30 days |
| **Traces** | Distributed tracing (OpenTelemetry) | 7 days |

---

## 8. Summary

### 8.1 LLD Statistics

| Category | Count | Description |
|----------|-------|-------------|
| **Domain Classes** | 8 | User, Trade, TradeLeg, Pnl, BrokerAccount, SyncJob, OHLCandle, AnalyticsSummary |
| **Services** | 7 | Auth, Trade, Broker, Analytics, MarketData, Worker, Notification |
| **Controllers** | 5 | Auth, Trade, Broker, Analytics, Market |
| **Routes** | 49 | REST API endpoints |
| **DTOs** | 67+ | Data transfer objects |
| **Validation Schemas** | 22 | Zod validation schemas |
| **Utility Modules** | 6 | dates, pnl, cache, pagination, csv, crypto |
| **Error Classes** | 10 | Specialized error types |
| **Audit Actions** | 15 | Tracked security events |
| **Metrics** | 9 | Prometheus metrics |

### 8.2 File Structure

```
src/
├── controllers/        # 5 controllers
│   ├── auth.controller.ts
│   ├── trade.controller.ts
│   ├── broker.controller.ts
│   ├── analytics.controller.ts
│   └── market.controller.ts
├── services/           # 7 services
│   ├── auth.service.ts
│   ├── trade.service.ts
│   ├── broker.service.ts
│   ├── analytics.service.ts
│   ├── marketdata.service.ts
│   ├── worker.service.ts
│   └── notification.service.ts
├── models/             # 8 domain classes
│   ├── user.model.ts
│   ├── trade.model.ts
│   ├── broker-account.model.ts
│   ├── sync-job.model.ts
│   ├── ohlc.model.ts
│   └── analytics-summary.model.ts
├── dto/                # 67+ DTOs
│   ├── auth/
│   ├── trade/
│   ├── broker/
│   ├── analytics/
│   ├── market/
│   └── common/
├── lib/
│   ├── utils/          # 6 utility modules
│   ├── adapters/       # Broker adapters
│   ├── constants/      # App constants
│   └── types/          # TypeScript types
├── errors/             # 10 error classes
├── middleware/         # Request processing
│   ├── auth.middleware.ts
│   ├── validation.middleware.ts
│   ├── rateLimiter.middleware.ts
│   ├── errorHandler.middleware.ts
│   ├── correlationId.middleware.ts
│   └── requestLogger.middleware.ts
└── config/             # App configuration
    ├── logger.ts
    ├── database.ts
    ├── redis.ts
    └── env.ts
```

### 8.3 Next Steps

1. **Part 6**: Authentication Flow - Detailed auth sequences and JWT handling
2. **Part 7**: Chart Components - Technical charting and visualization design
3. **Part 8**: Testing Strategy - Unit, integration, E2E test specifications

---

**Document Stats**:
- Lines: ~4,600
- Sections: 8 major sections
- Code Examples: 25+ TypeScript snippets
- Tables: 15+
- Diagrams: 5 ASCII diagrams

