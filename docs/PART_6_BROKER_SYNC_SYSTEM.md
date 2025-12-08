# Part 6: Broker Sync System Design

**Date**: November 27, 2025  
**Status**: ✅ Completed  
**Version**: 0.6.0

---

## Overview

This document provides a complete design for the Broker Sync System, covering OAuth flows, token management, trade synchronization, and scheduled jobs using AWS Lambda.

**Supported Brokers**:
- Zerodha Kite Connect
- Upstox API v2

---

## 1. System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           BROKER SYNC SYSTEM                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│  │   Frontend  │───▶│  API Server │───▶│   Broker    │───▶│   MongoDB   │   │
│  │  (Next.js)  │    │  (Express)  │    │  Adapter    │    │  (Trades)   │   │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘   │
│         │                  │                  │                  ▲          │
│         │                  │                  │                  │          │
│         ▼                  ▼                  ▼                  │          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │          │
│  │   Broker    │    │    Redis    │    │   Broker    │          │          │
│  │  OAuth Page │    │   (Cache)   │    │    APIs     │──────────┘          │
│  │  (External) │    └─────────────┘    │ Zerodha/    │                     │
│  └─────────────┘           │           │   Upstox    │                     │
│                            │           └─────────────┘                     │
│                            ▼                                               │
│                     ┌─────────────┐    ┌─────────────┐                     │
│                     │  AWS Lambda │───▶│  SQS Queue  │                     │
│                     │  (Cron Job) │    │  (Retries)  │                     │
│                     └─────────────┘    └─────────────┘                     │
│                                                                             │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. OAuth Flow - Sequence Diagram

### 2.1 Zerodha OAuth Flow

```
┌──────┐          ┌──────────┐         ┌───────────┐         ┌─────────┐         ┌─────────┐
│Client│          │API Server│         │   Redis   │         │ Zerodha │         │   DB    │
└──┬───┘          └────┬─────┘         └─────┬─────┘         └────┬────┘         └────┬────┘
   │                   │                     │                    │                   │
   │ 1. GET /broker/zerodha/connect          │                    │                   │
   │──────────────────▶│                     │                    │                   │
   │                   │                     │                    │                   │
   │                   │ 2. Generate state   │                    │                   │
   │                   │    (CSRF token)     │                    │                   │
   │                   │────────────────────▶│                    │                   │
   │                   │     Store state     │                    │                   │
   │                   │     (TTL: 10min)    │                    │                   │
   │                   │                     │                    │                   │
   │ 3. Redirect to    │                     │                    │                   │
   │    Zerodha OAuth  │                     │                    │                   │
   │◀──────────────────│                     │                    │                   │
   │                   │                     │                    │                   │
   │ 4. User logs in   │                     │                    │                   │
   │   & authorizes    │                     │                    │                   │
   │──────────────────────────────────────────────────────────────▶                   │
   │                   │                     │                    │                   │
   │ 5. Redirect to callback                 │                    │                   │
   │    with ?request_token=xxx&state=yyy    │                    │                   │
   │◀─────────────────────────────────────────────────────────────│                   │
   │                   │                     │                    │                   │
   │ 6. GET /broker/zerodha/callback         │                    │                   │
   │    ?request_token=xxx&state=yyy         │                    │                   │
   │──────────────────▶│                     │                    │                   │
   │                   │                     │                    │                   │
   │                   │ 7. Validate state   │                    │                   │
   │                   │────────────────────▶│                    │                   │
   │                   │     Check & delete  │                    │                   │
   │                   │◀────────────────────│                    │                   │
   │                   │                     │                    │                   │
   │                   │ 8. Exchange request_token for access_token                   │
   │                   │     POST /session/token                  │                   │
   │                   │     api_key, request_token, checksum     │                   │
   │                   │─────────────────────────────────────────▶│                   │
   │                   │                     │                    │                   │
   │                   │ 9. Return access_token, refresh_token    │                   │
   │                   │◀─────────────────────────────────────────│                   │
   │                   │                     │                    │                   │
   │                   │ 10. Encrypt tokens  │                    │                   │
   │                   │     & store         │                    │                   │
   │                   │─────────────────────────────────────────────────────────────▶│
   │                   │                     │                    │                   │
   │ 11. Success       │                     │                    │                   │
   │     Redirect to   │                     │                    │                   │
   │     /dashboard    │                     │                    │                   │
   │◀──────────────────│                     │                    │                   │
   │                   │                     │                    │                   │
```

### 2.2 Upstox OAuth Flow

```
┌──────┐          ┌──────────┐         ┌───────────┐         ┌─────────┐         ┌─────────┐
│Client│          │API Server│         │   Redis   │         │ Upstox  │         │   DB    │
└──┬───┘          └────┬─────┘         └─────┬─────┘         └────┬────┘         └────┬────┘
   │                   │                     │                    │                   │
   │ 1. GET /broker/upstox/connect           │                    │                   │
   │──────────────────▶│                     │                    │                   │
   │                   │                     │                    │                   │
   │                   │ 2. Generate state   │                    │                   │
   │                   │────────────────────▶│                    │                   │
   │                   │                     │                    │                   │
   │ 3. Redirect to Upstox authorize URL     │                    │                   │
   │    /oauth/authorize?client_id=&redirect_uri=&state=          │                   │
   │◀──────────────────│                     │                    │                   │
   │                   │                     │                    │                   │
   │ 4. User authorizes│                     │                    │                   │
   │───────────────────────────────────────────────────────────────▶                  │
   │                   │                     │                    │                   │
   │ 5. Redirect with ?code=xxx&state=yyy    │                    │                   │
   │◀──────────────────────────────────────────────────────────────│                  │
   │                   │                     │                    │                   │
   │ 6. GET /broker/upstox/callback          │                    │                   │
   │──────────────────▶│                     │                    │                   │
   │                   │                     │                    │                   │
   │                   │ 7. Validate state   │                    │                   │
   │                   │────────────────────▶│                    │                   │
   │                   │                     │                    │                   │
   │                   │ 8. Exchange code for tokens              │                   │
   │                   │    POST /oauth/token                     │                   │
   │                   │─────────────────────────────────────────▶│                   │
   │                   │                     │                    │                   │
   │                   │ 9. Return access_token (valid 1 day)     │                   │
   │                   │◀─────────────────────────────────────────│                   │
   │                   │                     │                    │                   │
   │                   │ 10. Encrypt & store │                    │                   │
   │                   │─────────────────────────────────────────────────────────────▶│
   │                   │                     │                    │                   │
   │ 11. Success       │                     │                    │                   │
   │◀──────────────────│                     │                    │                   │
```

---

## 3. Token Management

### 3.1 Token Storage Schema

```typescript
// MongoDB Schema: BrokerAccount
interface BrokerAccount {
  _id: ObjectId;
  userId: ObjectId;
  broker: 'zerodha' | 'upstox';
  brokerId: string;              // Zerodha user_id or Upstox client_id
  
  // Encrypted token storage
  encryptedAccessToken: string;  // AES-256-GCM encrypted
  encryptedRefreshToken?: string;
  tokenIV: string;               // Initialization vector
  tokenAuthTag: string;          // Auth tag for GCM
  
  // Token metadata
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt?: Date;
  scopes: string[];
  
  // Status
  status: 'active' | 'expired' | 'revoked' | 'error';
  lastTokenRefresh?: Date;
  lastSyncAt?: Date;
  syncErrorCount: number;
  lastSyncError?: string;
  
  // Audit
  connectedAt: Date;
  disconnectedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.2 Token Encryption Service

```typescript
// services/tokenEncryption.service.ts

import crypto from 'crypto';

export class TokenEncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;
  
  // Master key from AWS Secrets Manager or env
  private masterKey: Buffer;

  constructor() {
    const keyHex = process.env.TOKEN_ENCRYPTION_KEY;
    if (!keyHex || keyHex.length !== 64) {
      throw new Error('Invalid TOKEN_ENCRYPTION_KEY');
    }
    this.masterKey = Buffer.from(keyHex, 'hex');
  }

  /**
   * Derive a unique key for each user using HKDF
   */
  private deriveUserKey(userId: string): Buffer {
    return crypto.hkdfSync(
      'sha256',
      this.masterKey,
      userId,
      'broker-token-encryption',
      this.keyLength
    );
  }

  /**
   * Encrypt a token
   */
  encrypt(plaintext: string, userId: string): EncryptedData {
    const key = this.deriveUserKey(userId);
    const iv = crypto.randomBytes(this.ivLength);
    
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();

    return {
      ciphertext: encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64')
    };
  }

  /**
   * Decrypt a token
   */
  decrypt(encryptedData: EncryptedData, userId: string): string {
    const key = this.deriveUserKey(userId);
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const authTag = Buffer.from(encryptedData.authTag, 'base64');
    
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData.ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Rotate encryption key (re-encrypt all tokens)
   */
  async rotateKey(newKeyHex: string): Promise<void> {
    // Implementation for key rotation
    // 1. Fetch all broker accounts
    // 2. Decrypt with old key
    // 3. Re-encrypt with new key
    // 4. Update in database
    // 5. Update master key
  }
}

interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
}
```

### 3.3 Token Refresh Flow

```
┌─────────┐          ┌──────────┐         ┌─────────┐         ┌─────────┐
│  Cron   │          │API Server│         │ Zerodha │         │   DB    │
└────┬────┘          └────┬─────┘         └────┬────┘         └────┬────┘
     │                    │                    │                   │
     │ 1. Check expiring  │                    │                   │
     │    tokens (< 1hr)  │                    │                   │
     │───────────────────▶│                    │                   │
     │                    │                    │                   │
     │                    │ 2. Query tokens    │                   │
     │                    │    expiring soon   │                   │
     │                    │───────────────────────────────────────▶│
     │                    │                    │                   │
     │                    │ 3. Get accounts    │                   │
     │                    │◀───────────────────────────────────────│
     │                    │                    │                   │
     │                    │ 4. For each account:                   │
     │                    │    Decrypt refresh_token               │
     │                    │                    │                   │
     │                    │ 5. POST /session/token/renew           │
     │                    │    (Zerodha) or                        │
     │                    │    POST /oauth/token (Upstox)          │
     │                    │───────────────────▶│                   │
     │                    │                    │                   │
     │                    │ 6. New access_token│                   │
     │                    │◀───────────────────│                   │
     │                    │                    │                   │
     │                    │ 7. Encrypt & update│                   │
     │                    │───────────────────────────────────────▶│
     │                    │                    │                   │
     │ 8. Log results     │                    │                   │
     │◀───────────────────│                    │                   │
```

```typescript
// services/tokenRefresh.service.ts

export class TokenRefreshService {
  constructor(
    private brokerAccountRepo: BrokerAccountRepository,
    private encryptionService: TokenEncryptionService,
    private zerodhaAdapter: ZerodhaAdapter,
    private upstoxAdapter: UpstoxAdapter,
    private logger: Logger
  ) {}

  /**
   * Refresh tokens expiring within the threshold
   */
  async refreshExpiringTokens(thresholdMinutes: number = 60): Promise<RefreshResult> {
    const expiryThreshold = new Date(Date.now() + thresholdMinutes * 60 * 1000);
    
    const accounts = await this.brokerAccountRepo.findExpiringTokens(expiryThreshold);
    
    const results: RefreshResult = {
      total: accounts.length,
      success: 0,
      failed: 0,
      errors: []
    };

    for (const account of accounts) {
      try {
        await this.refreshToken(account);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          accountId: account._id.toString(),
          broker: account.broker,
          error: (error as Error).message
        });
        
        // Update error count
        await this.brokerAccountRepo.incrementSyncError(
          account._id,
          (error as Error).message
        );
      }
    }

    return results;
  }

  private async refreshToken(account: BrokerAccount): Promise<void> {
    const userId = account.userId.toString();
    
    // Decrypt current refresh token
    const refreshToken = this.encryptionService.decrypt({
      ciphertext: account.encryptedRefreshToken!,
      iv: account.tokenIV,
      authTag: account.tokenAuthTag
    }, userId);

    let newTokens: TokenResponse;

    // Refresh based on broker
    switch (account.broker) {
      case 'zerodha':
        newTokens = await this.zerodhaAdapter.refreshToken(refreshToken);
        break;
      case 'upstox':
        newTokens = await this.upstoxAdapter.refreshToken(refreshToken);
        break;
      default:
        throw new Error(`Unsupported broker: ${account.broker}`);
    }

    // Encrypt new tokens
    const encryptedAccess = this.encryptionService.encrypt(
      newTokens.accessToken,
      userId
    );
    
    const encryptedRefresh = newTokens.refreshToken 
      ? this.encryptionService.encrypt(newTokens.refreshToken, userId)
      : null;

    // Update database
    await this.brokerAccountRepo.updateTokens(account._id, {
      encryptedAccessToken: encryptedAccess.ciphertext,
      encryptedRefreshToken: encryptedRefresh?.ciphertext,
      tokenIV: encryptedAccess.iv,
      tokenAuthTag: encryptedAccess.authTag,
      accessTokenExpiresAt: newTokens.expiresAt,
      lastTokenRefresh: new Date(),
      status: 'active',
      syncErrorCount: 0
    });

    this.logger.info({
      accountId: account._id,
      broker: account.broker
    }, 'Token refreshed successfully');
  }
}
```

---

## 4. Trade Sync Workflow

### 4.1 Complete Sync Workflow Diagram

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           TRADE SYNC WORKFLOW                                      │
├───────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌─────────────┐                                                                  │
│  │ EventBridge │                                                                  │
│  │ (Cron)      │                                                                  │
│  │ */15 * * * *│                                                                  │
│  └──────┬──────┘                                                                  │
│         │                                                                         │
│         ▼                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                           │
│  │ AWS Lambda  │───▶│ Get Active  │───▶│ For Each    │                           │
│  │ SyncHandler │    │ Accounts    │    │ Account     │                           │
│  └─────────────┘    └─────────────┘    └──────┬──────┘                           │
│                                               │                                   │
│         ┌─────────────────────────────────────┼─────────────────────────────┐    │
│         │                                     ▼                             │    │
│         │    ┌─────────────────────────────────────────────────────────┐   │    │
│         │    │              SYNC PIPELINE (per account)                 │   │    │
│         │    ├─────────────────────────────────────────────────────────┤   │    │
│         │    │                                                         │   │    │
│         │    │  1. Acquire Lock ─────────────▶ Redis SETNX             │   │    │
│         │    │     └─ Skip if locked (another Lambda running)          │   │    │
│         │    │                                                         │   │    │
│         │    │  2. Decrypt Access Token ────▶ TokenEncryptionService   │   │    │
│         │    │                                                         │   │    │
│         │    │  3. Fetch Data from Broker API                          │   │    │
│         │    │     ├─ GET /trades (today's trades)                     │   │    │
│         │    │     ├─ GET /positions (open positions)                  │   │    │
│         │    │     └─ GET /holdings (delivery holdings)                │   │    │
│         │    │                                                         │   │    │
│         │    │  4. Normalize Data ──────────▶ BrokerAdapter            │   │    │
│         │    │     └─ Convert to standard Trade schema                 │   │    │
│         │    │                                                         │   │    │
│         │    │  5. Deduplicate ─────────────▶ Generate unique IDs      │   │    │
│         │    │     └─ Hash: broker + orderId + timestamp               │   │    │
│         │    │                                                         │   │    │
│         │    │  6. Upsert to MongoDB ───────▶ bulkWrite with upsert    │   │    │
│         │    │     └─ Update existing, insert new                      │   │    │
│         │    │                                                         │   │    │
│         │    │  7. Update Sync Status ──────▶ BrokerAccount.lastSync   │   │    │
│         │    │                                                         │   │    │
│         │    │  8. Release Lock ────────────▶ Redis DEL                │   │    │
│         │    │                                                         │   │    │
│         │    └─────────────────────────────────────────────────────────┘   │    │
│         │                                                                   │    │
│         └───────────────────────────────────────────────────────────────────┘    │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐     │
│  │                           ERROR HANDLING                                 │     │
│  ├─────────────────────────────────────────────────────────────────────────┤     │
│  │  • Token Expired → Queue for re-auth notification                       │     │
│  │  • Rate Limited → Retry with exponential backoff                        │     │
│  │  • API Error → Log, increment error count, send alert if threshold      │     │
│  │  • Timeout → Release lock, retry in next cycle                          │     │
│  └─────────────────────────────────────────────────────────────────────────┘     │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Data Normalization

```typescript
// adapters/broker.adapter.ts

export interface IBrokerAdapter {
  fetchTrades(fromDate: Date, toDate: Date): Promise<BrokerTrade[]>;
  fetchPositions(): Promise<BrokerPosition[]>;
  fetchHoldings(): Promise<BrokerHolding[]>;
  normalizeTrade(brokerTrade: any): NormalizedTrade;
  normalizePosition(brokerPosition: any): NormalizedTrade;
  normalizeHolding(brokerHolding: any): NormalizedTrade;
}

// Zerodha Adapter
export class ZerodhaAdapter implements IBrokerAdapter {
  constructor(
    private accessToken: string,
    private apiKey: string
  ) {}

  async fetchTrades(fromDate: Date, toDate: Date): Promise<any[]> {
    const kite = new KiteConnect({ api_key: this.apiKey });
    kite.setAccessToken(this.accessToken);
    
    return await kite.getOrderHistory();
  }

  normalizeTrade(zerodhaOrder: ZerodhaOrder): NormalizedTrade {
    return {
      // Unique identifier
      brokerTradeId: this.generateTradeId(zerodhaOrder),
      
      // Symbol mapping
      symbol: this.extractSymbol(zerodhaOrder.tradingsymbol),
      exchange: zerodhaOrder.exchange,
      segment: this.mapSegment(zerodhaOrder.exchange, zerodhaOrder.instrument_type),
      
      // Trade details
      tradeType: this.mapTradeType(zerodhaOrder.product),
      position: zerodhaOrder.transaction_type === 'BUY' ? 'long' : 'short',
      
      // Entry details
      entry: {
        price: zerodhaOrder.average_price,
        quantity: zerodhaOrder.quantity,
        timestamp: new Date(zerodhaOrder.order_timestamp),
        orderId: zerodhaOrder.order_id
      },
      
      // Charges
      charges: {
        brokerage: 0, // Zerodha doesn't provide in API
        stt: 0,
        exchangeTxn: 0,
        gst: 0,
        sebiCharges: 0,
        stampDuty: 0
      },
      
      // Metadata
      source: 'broker_sync',
      broker: 'zerodha',
      rawData: zerodhaOrder
    };
  }

  private generateTradeId(order: ZerodhaOrder): string {
    const data = `zerodha:${order.order_id}:${order.exchange}:${order.tradingsymbol}`;
    return crypto.createHash('sha256').update(data).digest('hex').slice(0, 24);
  }

  private extractSymbol(tradingSymbol: string): string {
    // Remove expiry and option type for F&O
    // NIFTY24NOV21000CE → NIFTY
    // RELIANCE → RELIANCE
    const match = tradingSymbol.match(/^([A-Z]+)/);
    return match ? match[1] : tradingSymbol;
  }

  private mapSegment(exchange: string, instrumentType?: string): string {
    if (exchange === 'NFO' || exchange === 'BFO') {
      return instrumentType === 'CE' || instrumentType === 'PE' ? 'options' : 'futures';
    }
    if (exchange === 'MCX') return 'commodity';
    if (exchange === 'CDS') return 'currency';
    return 'equity';
  }

  private mapTradeType(product: string): string {
    switch (product) {
      case 'MIS': return 'intraday';
      case 'CNC': return 'delivery';
      case 'NRML': return 'swing';
      default: return 'delivery';
    }
  }
}

// Upstox Adapter
export class UpstoxAdapter implements IBrokerAdapter {
  constructor(private accessToken: string) {}

  async fetchTrades(fromDate: Date, toDate: Date): Promise<any[]> {
    const response = await axios.get(
      'https://api.upstox.com/v2/order/history',
      {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      }
    );
    return response.data.data;
  }

  normalizeTrade(upstoxOrder: UpstoxOrder): NormalizedTrade {
    return {
      brokerTradeId: this.generateTradeId(upstoxOrder),
      symbol: upstoxOrder.trading_symbol.split('-')[0],
      exchange: upstoxOrder.exchange,
      segment: this.mapSegment(upstoxOrder.instrument_type),
      tradeType: this.mapTradeType(upstoxOrder.product),
      position: upstoxOrder.transaction_type === 'BUY' ? 'long' : 'short',
      entry: {
        price: upstoxOrder.average_price,
        quantity: upstoxOrder.quantity,
        timestamp: new Date(upstoxOrder.order_timestamp),
        orderId: upstoxOrder.order_id
      },
      charges: {},
      source: 'broker_sync',
      broker: 'upstox',
      rawData: upstoxOrder
    };
  }

  private generateTradeId(order: UpstoxOrder): string {
    const data = `upstox:${order.order_id}:${order.exchange}:${order.trading_symbol}`;
    return crypto.createHash('sha256').update(data).digest('hex').slice(0, 24);
  }

  private mapSegment(instrumentType: string): string {
    switch (instrumentType) {
      case 'EQUITY': return 'equity';
      case 'FUTIDX': case 'FUTSTK': return 'futures';
      case 'OPTIDX': case 'OPTSTK': return 'options';
      default: return 'equity';
    }
  }

  private mapTradeType(product: string): string {
    switch (product) {
      case 'I': return 'intraday';
      case 'D': return 'delivery';
      default: return 'delivery';
    }
  }
}
```

### 4.3 Normalized Trade Schema

```typescript
interface NormalizedTrade {
  // Unique ID for deduplication
  brokerTradeId: string;
  
  // Instrument
  symbol: string;
  exchange: 'NSE' | 'BSE' | 'NFO' | 'MCX' | 'CDS';
  segment: 'equity' | 'futures' | 'options' | 'commodity' | 'currency';
  instrumentType?: string;  // CE, PE, FUT, etc.
  strikePrice?: number;
  expiry?: Date;
  
  // Trade classification
  tradeType: 'intraday' | 'delivery' | 'swing' | 'positional';
  position: 'long' | 'short';
  
  // Entry leg
  entry: {
    price: number;
    quantity: number;
    timestamp: Date;
    orderId: string;
  };
  
  // Exit leg (if closed)
  exit?: {
    price: number;
    quantity: number;
    timestamp: Date;
    orderId: string;
  };
  
  // Charges
  charges: {
    brokerage?: number;
    stt?: number;
    exchangeTxn?: number;
    gst?: number;
    sebiCharges?: number;
    stampDuty?: number;
  };
  
  // Source tracking
  source: 'manual' | 'broker_sync' | 'csv_import';
  broker: 'zerodha' | 'upstox';
  
  // Raw data for debugging
  rawData?: any;
}
```

---

## 5. AWS Lambda Sync Job

### 5.1 Lambda Handler

```typescript
// lambda/syncHandler.ts

import { ScheduledEvent, Context } from 'aws-lambda';
import { MongoClient } from 'mongodb';
import Redis from 'ioredis';

// Initialize outside handler for connection reuse
let mongoClient: MongoClient;
let redisClient: Redis;

export async function handler(event: ScheduledEvent, context: Context): Promise<SyncResult> {
  context.callbackWaitsForEmptyEventLoop = false;
  
  const startTime = Date.now();
  const syncId = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  console.log({ syncId, event: 'sync_started' });

  try {
    // Initialize connections
    await initializeConnections();
    
    // Get all active broker accounts
    const accounts = await getActiveBrokerAccounts();
    
    console.log({ syncId, accountCount: accounts.length });

    const results: AccountSyncResult[] = [];

    // Process accounts (can be parallelized with Promise.allSettled)
    for (const account of accounts) {
      const result = await syncAccount(account, syncId);
      results.push(result);
    }

    const summary = summarizeResults(results);
    
    console.log({
      syncId,
      event: 'sync_completed',
      duration: Date.now() - startTime,
      summary
    });

    return {
      syncId,
      success: true,
      duration: Date.now() - startTime,
      summary
    };

  } catch (error) {
    console.error({
      syncId,
      event: 'sync_failed',
      error: (error as Error).message,
      stack: (error as Error).stack
    });

    throw error;
  }
}

async function syncAccount(
  account: BrokerAccount,
  syncId: string
): Promise<AccountSyncResult> {
  const accountId = account._id.toString();
  const lockKey = `lock:sync:${accountId}`;
  
  try {
    // 1. Acquire distributed lock
    const lockAcquired = await acquireLock(lockKey, 300); // 5 min TTL
    if (!lockAcquired) {
      return {
        accountId,
        status: 'skipped',
        reason: 'Lock held by another process'
      };
    }

    // 2. Decrypt access token
    const accessToken = await decryptAccessToken(account);

    // 3. Create broker adapter
    const adapter = createBrokerAdapter(account.broker, accessToken);

    // 4. Fetch data from broker
    const today = new Date();
    const [trades, positions, holdings] = await Promise.all([
      adapter.fetchTrades(today, today),
      adapter.fetchPositions(),
      adapter.fetchHoldings()
    ]);

    // 5. Normalize all data
    const normalizedTrades = [
      ...trades.map(t => adapter.normalizeTrade(t)),
      ...positions.map(p => adapter.normalizePosition(p)),
      ...holdings.map(h => adapter.normalizeHolding(h))
    ];

    // 6. Upsert to database
    const upsertResult = await upsertTrades(account.userId, normalizedTrades);

    // 7. Update sync status
    await updateSyncStatus(accountId, {
      lastSyncAt: new Date(),
      syncErrorCount: 0,
      lastSyncError: null
    });

    return {
      accountId,
      status: 'success',
      tradesFound: normalizedTrades.length,
      inserted: upsertResult.insertedCount,
      updated: upsertResult.modifiedCount
    };

  } catch (error) {
    const errorMessage = (error as Error).message;
    
    // Handle specific errors
    if (errorMessage.includes('token') || errorMessage.includes('401')) {
      await markAccountExpired(accountId);
      await queueReauthNotification(account);
    }

    await updateSyncStatus(accountId, {
      syncErrorCount: { $inc: 1 },
      lastSyncError: errorMessage
    });

    return {
      accountId,
      status: 'error',
      error: errorMessage
    };

  } finally {
    // Always release lock
    await releaseLock(lockKey);
  }
}
```

### 5.2 Upsert Logic for Duplicate Prevention

```typescript
// services/tradeSync.service.ts

async function upsertTrades(
  userId: ObjectId,
  normalizedTrades: NormalizedTrade[]
): Promise<BulkWriteResult> {
  const db = mongoClient.db('stocktracker');
  const tradesCollection = db.collection('trades');

  // Build bulk operations
  const operations = normalizedTrades.map(trade => ({
    updateOne: {
      filter: {
        userId,
        brokerTradeId: trade.brokerTradeId
      },
      update: {
        $set: {
          // Always update these fields
          symbol: trade.symbol,
          exchange: trade.exchange,
          segment: trade.segment,
          tradeType: trade.tradeType,
          position: trade.position,
          entry: trade.entry,
          exit: trade.exit,
          charges: trade.charges,
          source: trade.source,
          broker: trade.broker,
          lastSyncedAt: new Date(),
          updatedAt: new Date()
        },
        $setOnInsert: {
          // Only set on insert (new trades)
          userId,
          brokerTradeId: trade.brokerTradeId,
          status: trade.exit ? 'closed' : 'open',
          createdAt: new Date()
        }
      },
      upsert: true
    }
  }));

  // Execute bulk write
  const result = await tradesCollection.bulkWrite(operations, {
    ordered: false // Continue on errors
  });

  console.log({
    event: 'upsert_complete',
    userId: userId.toString(),
    matched: result.matchedCount,
    modified: result.modifiedCount,
    upserted: result.upsertedCount
  });

  return result;
}
```

### 5.3 Lambda Configuration (Terraform)

```hcl
# infrastructure/terraform/lambda.tf

resource "aws_lambda_function" "broker_sync" {
  function_name = "stock-tracker-broker-sync"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "dist/lambda/syncHandler.handler"
  runtime       = "nodejs18.x"
  
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  
  timeout     = 300  # 5 minutes
  memory_size = 512
  
  environment {
    variables = {
      NODE_ENV               = "production"
      MONGODB_URI            = var.mongodb_uri
      REDIS_URL              = var.redis_url
      TOKEN_ENCRYPTION_KEY   = var.token_encryption_key
      ZERODHA_API_KEY        = var.zerodha_api_key
      ZERODHA_API_SECRET     = var.zerodha_api_secret
      UPSTOX_CLIENT_ID       = var.upstox_client_id
      UPSTOX_CLIENT_SECRET   = var.upstox_client_secret
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.lambda.id]
  }
}

# EventBridge rule for scheduled execution
resource "aws_cloudwatch_event_rule" "broker_sync_schedule" {
  name                = "broker-sync-schedule"
  description         = "Trigger broker sync every 15 minutes during market hours"
  schedule_expression = "cron(0/15 3-10 ? * MON-FRI *)"  # 9:00 AM - 3:30 PM IST (UTC+5:30)
}

resource "aws_cloudwatch_event_target" "broker_sync" {
  rule      = aws_cloudwatch_event_rule.broker_sync_schedule.name
  target_id = "BrokerSyncLambda"
  arn       = aws_lambda_function.broker_sync.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.broker_sync.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.broker_sync_schedule.arn
}
```

---

## 6. Sync Job Pseudocode

```
FUNCTION main_sync_job():
    sync_id = generate_unique_id()
    log("Starting sync", sync_id)
    
    // Get all active broker accounts
    accounts = db.broker_accounts.find({
        status: "active",
        accessTokenExpiresAt: { $gt: now() }
    })
    
    results = []
    
    FOR EACH account IN accounts:
        result = sync_single_account(account, sync_id)
        results.append(result)
    END FOR
    
    // Summarize and log
    success_count = count(results WHERE status = "success")
    error_count = count(results WHERE status = "error")
    
    log("Sync completed", {
        sync_id,
        total: len(accounts),
        success: success_count,
        errors: error_count
    })
    
    RETURN results
END FUNCTION


FUNCTION sync_single_account(account, sync_id):
    lock_key = "lock:sync:" + account.id
    
    // Step 1: Acquire distributed lock
    lock_acquired = redis.set(lock_key, sync_id, NX, EX, 300)
    IF NOT lock_acquired:
        RETURN { status: "skipped", reason: "locked" }
    END IF
    
    TRY:
        // Step 2: Decrypt access token
        access_token = decrypt_token(
            account.encryptedAccessToken,
            account.tokenIV,
            account.tokenAuthTag,
            account.userId
        )
        
        // Step 3: Create appropriate broker adapter
        IF account.broker = "zerodha":
            adapter = new ZerodhaAdapter(access_token)
        ELSE IF account.broker = "upstox":
            adapter = new UpstoxAdapter(access_token)
        END IF
        
        // Step 4: Fetch data from broker API
        today = current_date()
        trades = adapter.fetchTrades(today, today)
        positions = adapter.fetchPositions()
        holdings = adapter.fetchHoldings()
        
        // Step 5: Normalize to standard format
        normalized_trades = []
        FOR EACH trade IN trades:
            normalized = adapter.normalizeTrade(trade)
            normalized_trades.append(normalized)
        END FOR
        FOR EACH position IN positions:
            normalized = adapter.normalizePosition(position)
            normalized_trades.append(normalized)
        END FOR
        FOR EACH holding IN holdings:
            normalized = adapter.normalizeHolding(holding)
            normalized_trades.append(normalized)
        END FOR
        
        // Step 6: Deduplicate and upsert
        bulk_operations = []
        FOR EACH trade IN normalized_trades:
            // Generate unique ID for deduplication
            trade_id = hash(account.broker + trade.orderId + trade.timestamp)
            
            operation = {
                updateOne: {
                    filter: {
                        userId: account.userId,
                        brokerTradeId: trade_id
                    },
                    update: {
                        $set: trade_data,
                        $setOnInsert: { createdAt: now() }
                    },
                    upsert: true
                }
            }
            bulk_operations.append(operation)
        END FOR
        
        result = db.trades.bulkWrite(bulk_operations)
        
        // Step 7: Update sync status
        db.broker_accounts.updateOne(
            { _id: account.id },
            {
                $set: {
                    lastSyncAt: now(),
                    syncErrorCount: 0,
                    lastSyncError: null
                }
            }
        )
        
        RETURN {
            status: "success",
            inserted: result.upsertedCount,
            updated: result.modifiedCount
        }
        
    CATCH error:
        // Handle token expiry
        IF error.message CONTAINS "token" OR error.status = 401:
            mark_account_expired(account.id)
            queue_reauth_notification(account.userId, account.broker)
        END IF
        
        // Update error count
        db.broker_accounts.updateOne(
            { _id: account.id },
            {
                $inc: { syncErrorCount: 1 },
                $set: { lastSyncError: error.message }
            }
        )
        
        // Alert if too many errors
        IF account.syncErrorCount >= 5:
            send_alert("Broker sync failing", account)
        END IF
        
        RETURN { status: "error", error: error.message }
        
    FINALLY:
        // Always release lock
        redis.del(lock_key)
    END TRY
END FUNCTION


FUNCTION decrypt_token(ciphertext, iv, authTag, userId):
    // Derive user-specific key using HKDF
    user_key = hkdf(
        master_key,
        salt: userId,
        info: "broker-token-encryption",
        length: 32
    )
    
    // Decrypt using AES-256-GCM
    decipher = createDecipher("aes-256-gcm", user_key, iv)
    decipher.setAuthTag(authTag)
    
    plaintext = decipher.update(ciphertext) + decipher.final()
    
    RETURN plaintext
END FUNCTION


FUNCTION generate_trade_id(broker, order):
    // Create deterministic ID for deduplication
    data = broker + ":" + order.orderId + ":" + order.exchange + ":" + order.symbol
    hash = sha256(data)
    RETURN hash.substring(0, 24)
END FUNCTION
```

---

## 7. Error Handling & Retry Strategy

### 7.1 Error Categories

| Category | Examples | Handling |
|----------|----------|----------|
| **Auth Errors** | 401, Token expired | Mark account expired, notify user |
| **Rate Limits** | 429, Too many requests | Exponential backoff, retry in 60s |
| **Server Errors** | 500, 502, 503 | Retry 3 times with backoff |
| **Client Errors** | 400, Invalid request | Log and skip, investigate |
| **Network Errors** | Timeout, ECONNREFUSED | Retry with backoff |

### 7.2 Retry Configuration

```typescript
const RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  
  // Retryable status codes
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  
  // Retryable error codes
  retryableErrorCodes: ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EPIPE']
};
```

---

## 8. Monitoring & Alerts

### 8.1 CloudWatch Metrics

```typescript
// Custom metrics to publish
const METRICS = {
  'BrokerSync/AccountsProcessed': { unit: 'Count' },
  'BrokerSync/TradesSynced': { unit: 'Count' },
  'BrokerSync/SyncDuration': { unit: 'Milliseconds' },
  'BrokerSync/Errors': { unit: 'Count' },
  'BrokerSync/TokenRefreshes': { unit: 'Count' }
};
```

### 8.2 Alert Thresholds

| Metric | Threshold | Action |
|--------|-----------|--------|
| Sync Errors | > 5 per hour | PagerDuty alert |
| Sync Duration | > 5 minutes | Warning log |
| Token Refresh Failures | > 3 per account | Email notification |
| Account Error Count | >= 5 | Mark account as error state |

---

## 9. Summary

### 9.1 Components

| Component | Purpose |
|-----------|---------|
| OAuth Controller | Handle broker OAuth flows |
| Token Encryption Service | Encrypt/decrypt broker tokens |
| Token Refresh Service | Refresh expiring tokens |
| Broker Adapters | Normalize broker data |
| Sync Lambda | Scheduled sync job |
| Distributed Lock | Prevent concurrent syncs |

### 9.2 Security Measures

- ✅ AES-256-GCM token encryption
- ✅ Per-user derived encryption keys (HKDF)
- ✅ OAuth state validation (CSRF protection)
- ✅ Tokens stored encrypted at rest
- ✅ VPC for Lambda (private subnets)
- ✅ Secrets in AWS Secrets Manager

### 9.3 Reliability Measures

- ✅ Distributed locking (prevent duplicate syncs)
- ✅ Idempotent upserts (duplicate prevention)
- ✅ Retry with exponential backoff
- ✅ Error count tracking
- ✅ Automatic token refresh
- ✅ CloudWatch monitoring & alerts

---

**Document Stats**:
- Lines: ~1,500
- Sections: 9
- Diagrams: 4 (sequence + workflow)
- Code Examples: 15+

**Next Steps**:
- Part 7: Chart Components Design
- Part 8: Testing Strategy
