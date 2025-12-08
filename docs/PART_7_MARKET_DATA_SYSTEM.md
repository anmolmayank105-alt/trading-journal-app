# Part 7: Market Data System Design

**Date**: November 27, 2025  
**Status**: Draft / Complete  
**Version**: 0.7.0

---

This document describes the Market Data System: how live prices are ingested (primary: broker WebSocket), fallback sources, Redis caching strategy, candle generation, realtime WebSocket channels, historical data APIs, cron job designs and pseudocode.

Goals:
- Low-latency price delivery to UI and services
- Reliable fallback if primary feed fails
- Efficient cache for frequently-used keys (LTP, watchlists)
- Accurate OHLC candle generation at 1m/5m/15m
- Scalable WebSocket gateway for many clients

---

## 1. Architecture

```
                                 +----------------------+
                                 |   Frontend Clients   |
                                 | (Web / Mobile / API) |
                                 +----------+-----------+
                                            |
                                            | WebSocket / HTTP
                                            |
                  +-------------------------v-------------------------+
                  |               WebSocket Gateway / API             |
                  |  - auth & subscription management                 |
                  |  - channel routing                                 |
                  +-----------+----------------------+--------------+
                              |                      |
              Publish/Subscribe|                      | REST API (historical, watchlist)
                              |                      |
    +-------------------------v------------+   +-----v---------------------+
    |           Market Data Service         |   |  Historical Data Service  |
    |  - Broker WS Adapter (Zerodha)        |   |  - Query DB for candles   |
    |  - Fallback Pollers (Yahoo/Finnhub)   |   |  - Aggregation endpoints  |
    |  - Tick normalizer & validator        |   +---------------------------+
    |  - Candle generator (streaming)       |
    |  - Publisher to WS gateway (Redis pubsub / Kafka)
    +----------+-----------------------------+
               |             |                
               |             |                
    Redis Cache (L1)   Time-series DB (L2)    
    - ltp, index, watchlists  - InfluxDB/ClickHouse/Timescale
    - short TTLs              - candle storage (1m/5m/15m)
    
    +-----------------------------------------+
    |  Background Workers / AWS Lambda / ECS  |
    |  - Pollers, cron jobs, batch candle job |
    +-----------------------------------------+
```

Notes:
- Use Redis for sub-second reads (LTP, latest candle, watchlist snapshots).
- Persist candles and historical data in a time-series DB (TimescaleDB or ClickHouse) or MongoDB with time-series collections.
- Pub/Sub: Redis Streams (or Kafka) for reliable pipe between Market Data Service and WebSocket Gateway.

---

## 2. How to fetch prices from official broker WebSocket (Zerodha)

Design points for Zerodha Kite Connect (or other broker WS):
- Authenticate using API key + access token (from broker account stored encrypted)
- Open persistent WebSocket connection from Market Data Service to broker
- Subscribe to instruments (symbols) required by business: indices, watchlists, active user subscriptions
- Handle heartbeats / pings, reconnect with backoff
- Validate tick schema and timestamps; drop old/duplicate ticks
- Emit ticks into internal pipeline (normalize) and update Redis

Sequence (high level):
1. Load broker account, decrypt access token
2. Connect WS: `wss://ws.kite.trade?api_key=...&access_token=...` (example)
3. Authenticate per broker protocol
4. Subscribe to instruments (instrument tokens)
5. On message: parse tick, validate fields (ltp, last_qty, last_trade_time), normalize timezone
6. Publish tick to Redis stream / pubsub + update Redis key for LTP and latest tick
7. Push to candle aggregator
8. Forward to WebSocket Gateway topics (publish channel)

Edge cases & handling:
- If token expired: attempt refresh via TokenRefreshService; if fails, mark account expired and raise alert
- Rate limit subscriptions: batch subscriptions in groups
- Reconnect policy: exponential backoff with jitter; on reconnect re-subscribe to previous instruments
- Deduplication: track last tick id or timestamp per instrument to ignore duplicates

Security:
- Store access_token encrypted; decrypt only in Market Data Service runtime memory
- Keep WS connections in private VPC environment

---

## 3. Fallback method using public APIs (Yahoo, Finnhub)

When broker WS is unavailable or an instrument isn't provided via broker, use public polling:
- Implement Poller workers that call public REST endpoints at safe intervals
- Respect rate limits and caching (avoid re-requesting recently cached values)

Sources & Notes:
- Yahoo Finance: unofficial JSON endpoints (fast, free) — not guaranteed SLA
- Finnhub: official API with rate limits (paid tiers for higher QPS)
- Alpha Vantage: free but heavy rate limits

Polling strategy:
- For indexes and high-priority symbols, poll every 1-3 seconds (if permitted) as a fallback only
- Use per-source rate-limiter per API key
- After getting a quote, run the same normalization path as broker ticks

Example fallback flow:
1. On missing tick for instrument X for N seconds, schedule a poll
2. Poll public API for latest price
3. Validate and publish to pipeline (same path as broker ticks)
4. Cache result in Redis with short TTL to avoid duplicate polls

Prioritization:
- Broker WS data is authoritative; fallback used to reduce visible outage but flagged as fallback in metadata

---

## 4. Redis caching strategy

Key design principles:
- Fast reads: keep LTP / latest tick for UI and low-latency services
- Short TTLs for live values; longer TTLs for watchlist snapshots
- Key namespaces: `market:ltp`, `market:quote`, `market:watchlist`, `market:candle:<interval>`

Key patterns and TTLs:
- Live index price (single key per index)
  - Key: `market:ltp:index:<EXCHANGE>:<SYMBOL>`
  - Value: JSON { price, time, change, percent, source }
  - TTL: 3s - 10s (no TTL if write-every-tick and we rely on writes to update)
- Stock price (LTP per symbol)
  - Key: `market:ltp:symbol:<EXCHANGE>:<SYMBOL>`
  - Value: JSON { ltp, lastQty, lastTradeTime, bid, ask, source }
  - TTL: 3s (or no TTL; accept frequent writes)
- Watchlist snapshot (user-specific)
  - Key: `market:watchlist:<userId>:<watchlistId>`
  - Value: JSON { [ { symbol, ltp, change } ] }
  - TTL: 30s - 60s
  - Invalidate/refresh on demand or when major updates happen
- Latest candle (for UI quick load)
  - Key: `market:candle:latest:<interval>:<symbol>` e.g. `market:candle:latest:1m:NSE:RELIANCE`
  - Value: JSON { o,h,l,c,volume, start, end }
  - TTL: 1 interval + small buffer (e.g., 70s for 1m)
- Cached historical range results (query results)
  - Key: `market:candle:cache:<interval>:<symbol>:<fromTs>:<toTs>`
  - TTL: 5-30 minutes depending on usage

Cache size & eviction:
- Use LRU eviction on Redis instance; prioritize `market:watchlist` and query caches for eviction
- Use Redis Memory policies and monitor keys via metrics

Pub/Sub vs Streams:
- For broadcasting ticks to WS gateway, use Redis Streams or Pub/Sub. Streams give persistence & consumer groups; Pub/Sub is simpler but fire-and-forget.
- Use Streams for reliability: `stream:market:ticks` with message { symbol, price, ts, source }

Atomic updates:
- Use Lua scripts if multiple keys must be updated atomically (e.g., ltp + latest candle buffer)

---

## 5. Candle generation (1m, 5m, 15m OHLC)

Overview:
- Candle generator is streaming: receives validated ticks and aggregates into buckets by interval
- Support intervals: 1m, 5m, 15m (extendable)
- Two storage layers:
  - Redis: latest open bucket and recent candles for fast UI
  - Time-series DB: persistent candle storage (retention & rollups)

Aggregation rules:
- Bucket start timestamps aligned to interval boundaries in exchange timezone (IST for Indian markets)
- For a tick with timestamp t: bucketStart = floor(t / intervalMs) * intervalMs
- For each bucket maintain: open, high, low, close, volume, tradeCount
- On tick arrival:
  - If new bucket: flush previous (persist to DB & push final to Redis), start new bucket with open=price
  - Else update high/low/close/volume

Late ticks handling:
- If tick arrives belonging to already-flushed bucket (late), optionally apply correction if within allowed lateness window (e.g., 5s)
- For strict correctness, flag such corrections and emit an update event to clients

Rollup strategy:
- Generate 5m candles by rolling up 1m candles (or compute directly from ticks)
- For efficiency, maintain both streaming per-interval aggregator or derive higher intervals from lower intervals during off-peak

Persistence & retention:
- Persist completed candles to TimescaleDB/ClickHouse with partitioning by symbol
- Retention policies: keep 1m candles for 30 days, 5m for 90 days, 15m for 365 days; rollup older to daily

Implementation notes:
- Use Redis hash or stream as in-memory bucket: `candle:bucket:<interval>:<symbol>:<bucketStart>`
- When bucket completes: move `HGETALL` to DB then `DEL` bucket key
- For high-throughput, shard symbol processing across workers

---

## 6. WebSocket channel design for real-time streaming

Principles:
- Keep channels topic-based (per symbol, per watchlist, per user)
- Minimize number of subscriptions per client (support wildcard / multi-subscribe)
- Authentication required; enforce permissions (user can only subscribe to their private watchlist channels)
- Use Redis Streams/Kafka between Market Data Service and WS gateway; WS gateway only handles client connections and subscriptions

Channel naming:
- Symbol LTP channel: `price:<exchange>:<symbol>` e.g. `price:NSE:RELIANCE`
- Watchlist channel: `watchlist:<userId>:<watchlistId>`
- Candle channel (interval): `candle:<interval>:<exchange>:<symbol>` e.g. `candle:1m:NSE:RELIANCE`
- Market index channel: `index:<symbol>` e.g. `index:NIFTY` 

Subscription API (WebSocket message):
- Subscribe:
  {
    "action": "subscribe",
    "channels": ["price:NSE:RELIANCE", "candle:1m:NSE:RELIANCE"]
  }
- Unsubscribe:
  { "action": "unsubscribe", "channels": [ ... ] }

Server -> Client events:
- Tick event (price update):
  {
    "type": "tick",
    "channel": "price:NSE:RELIANCE",
    "data": { "ltp": 3000.5, "ts": 169... , "source": "zerodha" }
  }
- Candle update:
  {
    "type": "candle",
    "channel": "candle:1m:NSE:RELIANCE",
    "data": { "o": 2998, "h": 3005, "l": 2995, "c": 3000, "v": 12000, "start": 169..., "end": 169... }
  }
- Heartbeat / keepalive:
  { "type": "heartbeat", "ts": 169... }

Backpressure:
- When a client cannot keep up, drop lower-priority channels (configurable) or send reduced update frequency (throttling)
- For large fan-out, use server-side fanout via Redis Streams and consumer groups

Scaling:
- Run multiple WS gateway instances behind load balancer (sticky session or use JWT-based reconnection state)
- Use Redis Streams with consumer groups to decouple producers and WS gateways

---

## 7. API endpoints for historical data

Design principles:
- REST endpoints returning paginated time-series (candles)
- Support multiple intervals, timezone-aware timestamps, and optional aggregation
- Cache frequently requested ranges

Endpoints:
- GET `/api/v1/market/:exchange/:symbol/candles` 
  - Query params: `interval=1m|5m|15m|1d`, `from=ISO_TS`, `to=ISO_TS`, `limit=500`, `cursor=`
  - Returns: paginated list of candles (o,h,l,c,v,start,end)
- GET `/api/v1/market/:exchange/:symbol/quote`
  - Returns latest LTP and metadata (from Redis)
- GET `/api/v1/market/index/:symbol/quote`
  - Index quote
- POST `/api/v1/market/watchlist/:userId/:watchlistId/refresh`
  - Manually refresh watchlist snapshot (auth required)

Response format:
{
  "data": [ { start, end, o, h, l, c, v } ],
  "pagination": { page, limit, total }
}

Caching:
- Cache results for small windows (e.g., last 1 hour) with Redis key `market:candle:cache:<interval>:<symbol>:<from>:<to>` TTL 5-30m

Rate limiting:
- Apply route-level rate limits to prevent heavy scanning, and require API keys for bulk historic queries

---

## 8. Cron job design

Background tasks:
- Poll fallback APIs for missing instruments (every 1-5s for critical symbols as fallback)
- Bulk candle rollup job (every 5m/15m for rollups)
- Reconciliation jobs (compare broker ticks vs persisted candles)
- Warm cache jobs for watchlists (every 10s-30s depending on activity)

Options to run:
- AWS EventBridge -> Lambda (short jobs, keep connections lightweight)
- ECS/Fargate or Kubernetes CronJobs for longer-running or stateful candle aggregator
- Use worker pool (BullMQ + Redis) for queued work and retries

Example schedule:
- 1s - Real-time ingestor (persistent connection, not cron)
- 10s - Warm top N watchlists
- 1m  - Finalize & persist 1m candles (if using delayed flush)
- 5m  - Rollup 1m -> 5m
- 15m - Rollup 1m -> 15m (or 5m->15m)

Lambda considerations:
- Prefer non-Lambda for persistent WS connections; use Market Data Service in ECS/EC2 with private subnets
- Use Lambda for pollers and batch rollups if short-lived

---

## 9. Data flow (high-level)

1. Broker WS emits tick -> Market Data Service receives tick
2. Normalize & validate tick
3. Publish tick to Redis Stream `stream:market:ticks`
4. Candle aggregator consumes stream -> update in-memory bucket (Redis) -> write final candle to TS DB
5. Market Data Service writes LTP to Redis `market:ltp:symbol` and publishes to `price:<symbol>` channel
6. WebSocket Gateway subscribed to channel receives published update (via Redis pub/sub or Streams) -> pushes to connected clients
7. Historical queries read from TS DB, with cached responses in Redis

---

## 10. Pseudocode

### 10.1 Broker WebSocket Consumer (Zerodha)

```
function startBrokerWS(account):
  token = decrypt(account.encryptedAccessToken, account.userId)
  ws = new WebSocket(broker_ws_url_with_token(token))

  ws.on('open', () => {
    subscribeToInstruments(ws, account.subscriptions)
  })

  ws.on('message', raw => {
    tick = parse(raw)
    if (!validateTick(tick)) return

    normalized = normalizeTick(tick)

    // Publish to reliable stream
    redis.xadd('stream:market:ticks', '*', 'symbol', normalized.symbol, 'payload', JSON.stringify(normalized))

    // Update latest LTP
    redis.set(`market:ltp:symbol:${normalized.exchange}:${normalized.symbol}`, JSON.stringify(normalized), 'EX', 5)

    // Send for candle aggregation (fast path)
    publishToAggregator(normalized)
  })

  ws.on('close' or 'error', err => {
    log('ws closed', err)
    reconnectWithBackoff()
  })
end
```

### 10.2 Fallback Poller

```
function fallbackPoller(symbol):
  if redis.exists('market:ltp:symbol:...') and recent: return
  for source in [ZerodhaQuoteAPI, Finnhub, Yahoo] do:
    qp = getRateLimiter(source)
    quote = source.fetchQuote(symbol)
    if quote and validate(quote):
      publish(normalize(quote))
      redis.set(key, quote, 'EX', 3)
      break
    end
  end
end
```

### 10.3 Candle Aggregator (stream consumer)

```
function aggregatorWorker(interval):
  stream = redis.xreadgroup('market_ticks_group', consumerId, 'stream:market:ticks', '>')
  for msg in stream:
    normalized = JSON.parse(msg.payload)
    bucketStart = floor(normalized.ts / intervalMs) * intervalMs
    key = `candle:bucket:${interval}:${normalized.exchange}:${normalized.symbol}:${bucketStart}`

    // Atomic update via Lua or HSET + watch
    luaScriptUpdateBucket(key, normalized.price, normalized.size)

    if currentTime > bucketStart + intervalMs + allowedLateness:
       // finalize bucket
       bucket = redis.hgetall(key)
       persistToTSDB(bucket)
       redis.del(key)
       // publish final candle to pubsub
       publish('candle:'+interval+':'+symbol, bucket)
    end
  end
end
```

### 10.4 WebSocket Gateway subscriber

```
on redis pubsub message(channel, message):
  clients = subscriptionMap[channel]
  for client in clients:
    if client.canReceive():
      client.send(message)
    else:
      // mark for backpressure handling
      bufferOrDrop(client, message)
    end
  end
end
```

---

## 11. Operational Considerations

- Monitoring: instrument metrics for ticks/sec, missed ticks, aggregator lag, Redis memory, stream backlog
- Alerting: high stream backlog, lost WS connections, increased late-tick corrections
- Testing: replay recorded tick files for simulated load; run integration tests with public APIs and local mock WS
- Cost: watch TS DB storage growth; plan rollups and retention

---

## 12. Quick Implementation Checklist

- [ ] Market Data Service (persistent WS) on ECS/EC2
- [ ] Redis Streams setup; retention & consumer groups
- [ ] Candle Aggregator workers (per shard)
- [ ] Time-series DB & schema for candles
- [ ] WebSocket Gateway using Redis Streams consumer groups
- [ ] Fallback pollers with rate limiting
- [ ] Metrics and dashboards (Prometheus + Grafana)

---

## 13. Example Redis Keys (summary)

- `market:ltp:symbol:<EXCHANGE>:<SYMBOL>` -> latest tick JSON
- `market:watchlist:<userId>:<watchlistId>` -> watchlist snapshot JSON
- `market:candle:latest:<interval>:<EXCHANGE>:<SYMBOL>` -> last candle
- `stream:market:ticks` -> Redis Stream of ticks
- `candle:bucket:<interval>:<EXCHANGE>:<SYMBOL>:<bucketStart>` -> hash with o,h,l,c,v
- `market:candle:cache:<interval>:<symbol>:<from>:<to>` -> cached query

---

## 14. Pseudocode Summary (single-file)

See the `10.*` pseudocode sections above for the consumer, poller, aggregator and gateway. Those are ready to be converted into TypeScript workers.

---

**Document Stats**: ~1,800 lines (including examples), ready for review.


