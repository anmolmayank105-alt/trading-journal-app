# Part 8: Analytics Engine Design

**Date**: November 27, 2025  
**Status**: ✅ Complete  
**Version**: 0.8.0

---

## Overview

The Analytics Engine computes trading performance metrics from the `trades` collection. It powers dashboards, reports, and insights for users.

**Key Metrics**:
1. Total Profit/Loss (realized & unrealized)
2. Win Rate (% of profitable trades)
3. Best Trade Category
4. Worst Trade Category
5. Monthly P/L Breakdown
6. Maximum Drawdown
7. Average Profit & Average Loss
8. Time-based Performance (Heatmap)
9. Longest Winning Streak / Losing Streak

**Design Goals**:
- Sub-200ms response for dashboard queries
- Efficient MongoDB aggregation pipelines
- Aggressive caching with smart invalidation
- Incremental updates on trade sync

---

## 1. Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ANALYTICS ENGINE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │  API Layer   │───▶│  Analytics   │───▶│   MongoDB    │                  │
│  │  /analytics  │    │   Service    │    │   (trades)   │                  │
│  └──────────────┘    └──────┬───────┘    └──────────────┘                  │
│                             │                                               │
│                             ▼                                               │
│                      ┌──────────────┐                                       │
│                      │    Redis     │                                       │
│                      │   (Cache)    │                                       │
│                      └──────────────┘                                       │
│                             │                                               │
│         ┌───────────────────┼───────────────────┐                          │
│         ▼                   ▼                   ▼                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                     │
│  │  Overview   │    │  Monthly    │    │  Heatmap    │                     │
│  │  Pipeline   │    │  Pipeline   │    │  Pipeline   │                     │
│  └─────────────┘    └─────────────┘    └─────────────┘                     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Background Workers                                │   │
│  │  • Post-sync analytics refresh                                       │   │
│  │  • Scheduled pre-computation (hourly/daily)                          │   │
│  │  • Cache warming                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Metrics Definitions

### 2.1 Total Profit/Loss

```
Total P/L = Σ (netPnL) for all closed trades in period

Realized P/L  = Σ (netPnL) where status = 'closed'
Unrealized P/L = Σ (currentPrice - entryPrice) * qty for status = 'open'
```

### 2.2 Win Rate

```
Win Rate = (Winners / Total Closed Trades) × 100

Winner: trade where netPnL > 0
Loser:  trade where netPnL < 0
Breakeven: trade where netPnL = 0
```

### 2.3 Best/Worst Trade Category

Categories: `segment`, `tradeType`, `strategy`, `tags`

```
Best Category  = category with highest total netPnL
Worst Category = category with lowest (most negative) total netPnL
```

### 2.4 Monthly P/L

```
Group trades by month (exit date for closed, entry date for open)
Sum netPnL per month
```

### 2.5 Maximum Drawdown

```
Drawdown = (Peak Equity - Trough Equity) / Peak Equity × 100

Calculated from cumulative P/L curve:
1. Build daily cumulative P/L
2. Track running peak
3. Calculate drawdown at each point
4. Return maximum drawdown
```

### 2.6 Average Profit & Average Loss

```
Avg Profit = Σ (netPnL where netPnL > 0) / count(winners)
Avg Loss   = Σ (|netPnL| where netPnL < 0) / count(losers)

Risk/Reward Ratio = Avg Profit / Avg Loss
```

### 2.7 Time-based Performance (Heatmap)

```
Group by: dayOfWeek (0-6) × hourOfDay (0-23)
Aggregate: count, totalPnL, winRate per cell
Output: 7×24 matrix for visualization
```

### 2.8 Winning/Losing Streaks

```
Order trades by exit timestamp
Track consecutive wins/losses
Return: longestWinStreak, longestLoseStreak, currentStreak
```

---

## 3. MongoDB Aggregation Pipelines

### 3.1 Overview Analytics Pipeline

Returns: totalPnL, realizedPnL, unrealizedPnL, winRate, totalTrades, winners, losers

```javascript
// pipeline: getOverviewAnalytics(userId, fromDate, toDate)

db.trades.aggregate([
  // Stage 1: Match user and date range
  {
    $match: {
      userId: ObjectId(userId),
      "entry.timestamp": { $gte: fromDate, $lte: toDate }
    }
  },
  
  // Stage 2: Facet for parallel computations
  {
    $facet: {
      // Closed trades stats
      closed: [
        { $match: { status: "closed" } },
        {
          $group: {
            _id: null,
            totalPnL: { $sum: "$pnl.net" },
            totalCharges: { $sum: "$pnl.charges" },
            grossPnL: { $sum: "$pnl.gross" },
            count: { $sum: 1 },
            winners: {
              $sum: { $cond: [{ $gt: ["$pnl.net", 0] }, 1, 0] }
            },
            losers: {
              $sum: { $cond: [{ $lt: ["$pnl.net", 0] }, 1, 0] }
            },
            breakeven: {
              $sum: { $cond: [{ $eq: ["$pnl.net", 0] }, 1, 0] }
            },
            totalProfit: {
              $sum: { $cond: [{ $gt: ["$pnl.net", 0] }, "$pnl.net", 0] }
            },
            totalLoss: {
              $sum: { $cond: [{ $lt: ["$pnl.net", 0] }, { $abs: "$pnl.net" }, 0] }
            },
            maxProfit: { $max: "$pnl.net" },
            maxLoss: { $min: "$pnl.net" }
          }
        }
      ],
      
      // Open trades (unrealized)
      open: [
        { $match: { status: "open" } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalInvested: {
              $sum: { $multiply: ["$entry.price", "$entry.quantity"] }
            }
          }
        }
      ]
    }
  },
  
  // Stage 3: Merge results
  {
    $project: {
      closed: { $arrayElemAt: ["$closed", 0] },
      open: { $arrayElemAt: ["$open", 0] }
    }
  },
  
  // Stage 4: Calculate derived metrics
  {
    $project: {
      totalTrades: { $add: [
        { $ifNull: ["$closed.count", 0] },
        { $ifNull: ["$open.count", 0] }
      ]},
      closedTrades: { $ifNull: ["$closed.count", 0] },
      openTrades: { $ifNull: ["$open.count", 0] },
      
      realizedPnL: { $ifNull: ["$closed.totalPnL", 0] },
      totalCharges: { $ifNull: ["$closed.totalCharges", 0] },
      grossPnL: { $ifNull: ["$closed.grossPnL", 0] },
      
      winners: { $ifNull: ["$closed.winners", 0] },
      losers: { $ifNull: ["$closed.losers", 0] },
      breakeven: { $ifNull: ["$closed.breakeven", 0] },
      
      winRate: {
        $cond: [
          { $gt: ["$closed.count", 0] },
          { $multiply: [
            { $divide: ["$closed.winners", "$closed.count"] },
            100
          ]},
          0
        ]
      },
      
      avgProfit: {
        $cond: [
          { $gt: ["$closed.winners", 0] },
          { $divide: ["$closed.totalProfit", "$closed.winners"] },
          0
        ]
      },
      avgLoss: {
        $cond: [
          { $gt: ["$closed.losers", 0] },
          { $divide: ["$closed.totalLoss", "$closed.losers"] },
          0
        ]
      },
      
      profitFactor: {
        $cond: [
          { $gt: ["$closed.totalLoss", 0] },
          { $divide: ["$closed.totalProfit", "$closed.totalLoss"] },
          { $cond: [{ $gt: ["$closed.totalProfit", 0] }, 999, 0] }
        ]
      },
      
      maxProfit: { $ifNull: ["$closed.maxProfit", 0] },
      maxLoss: { $ifNull: ["$closed.maxLoss", 0] },
      
      expectancy: {
        $cond: [
          { $gt: ["$closed.count", 0] },
          { $divide: ["$closed.totalPnL", "$closed.count"] },
          0
        ]
      }
    }
  }
]);
```

**Required Index**:
```javascript
db.trades.createIndex({ userId: 1, "entry.timestamp": -1, status: 1 });
```

---

### 3.2 Monthly P/L Pipeline

```javascript
// pipeline: getMonthlyPnL(userId, year)

db.trades.aggregate([
  // Match closed trades for the year
  {
    $match: {
      userId: ObjectId(userId),
      status: "closed",
      "exit.timestamp": {
        $gte: ISODate(`${year}-01-01`),
        $lt: ISODate(`${year + 1}-01-01`)
      }
    }
  },
  
  // Group by month
  {
    $group: {
      _id: { $month: "$exit.timestamp" },
      totalPnL: { $sum: "$pnl.net" },
      grossPnL: { $sum: "$pnl.gross" },
      charges: { $sum: "$pnl.charges" },
      trades: { $sum: 1 },
      winners: { $sum: { $cond: [{ $gt: ["$pnl.net", 0] }, 1, 0] } },
      losers: { $sum: { $cond: [{ $lt: ["$pnl.net", 0] }, 1, 0] } }
    }
  },
  
  // Calculate monthly metrics
  {
    $project: {
      month: "$_id",
      totalPnL: { $round: ["$totalPnL", 2] },
      grossPnL: { $round: ["$grossPnL", 2] },
      charges: { $round: ["$charges", 2] },
      trades: 1,
      winners: 1,
      losers: 1,
      winRate: {
        $round: [
          { $multiply: [{ $divide: ["$winners", "$trades"] }, 100] },
          2
        ]
      }
    }
  },
  
  // Sort by month
  { $sort: { month: 1 } },
  
  // Fill missing months with zeros
  {
    $group: {
      _id: null,
      months: { $push: "$$ROOT" }
    }
  },
  {
    $project: {
      data: {
        $map: {
          input: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
          as: "m",
          in: {
            $let: {
              vars: {
                match: {
                  $filter: {
                    input: "$months",
                    cond: { $eq: ["$$this.month", "$$m"] }
                  }
                }
              },
              in: {
                $ifNull: [
                  { $arrayElemAt: ["$$match", 0] },
                  {
                    month: "$$m",
                    totalPnL: 0,
                    grossPnL: 0,
                    charges: 0,
                    trades: 0,
                    winners: 0,
                    losers: 0,
                    winRate: 0
                  }
                ]
              }
            }
          }
        }
      }
    }
  },
  { $unwind: "$data" },
  { $replaceRoot: { newRoot: "$data" } }
]);
```

**Required Index**:
```javascript
db.trades.createIndex({ userId: 1, status: 1, "exit.timestamp": -1 });
```

---

### 3.3 Category Performance Pipeline

```javascript
// pipeline: getCategoryPerformance(userId, categoryField, fromDate, toDate)
// categoryField: 'segment' | 'tradeType' | 'strategy'

db.trades.aggregate([
  {
    $match: {
      userId: ObjectId(userId),
      status: "closed",
      "exit.timestamp": { $gte: fromDate, $lte: toDate }
    }
  },
  
  // Group by category
  {
    $group: {
      _id: `$${categoryField}`,  // dynamic field
      totalPnL: { $sum: "$pnl.net" },
      trades: { $sum: 1 },
      winners: { $sum: { $cond: [{ $gt: ["$pnl.net", 0] }, 1, 0] } },
      losers: { $sum: { $cond: [{ $lt: ["$pnl.net", 0] }, 1, 0] } },
      avgPnL: { $avg: "$pnl.net" },
      maxProfit: { $max: "$pnl.net" },
      maxLoss: { $min: "$pnl.net" }
    }
  },
  
  // Calculate win rate and sort
  {
    $project: {
      category: "$_id",
      totalPnL: { $round: ["$totalPnL", 2] },
      trades: 1,
      winners: 1,
      losers: 1,
      winRate: {
        $round: [
          { $multiply: [{ $divide: ["$winners", "$trades"] }, 100] },
          2
        ]
      },
      avgPnL: { $round: ["$avgPnL", 2] },
      maxProfit: { $round: ["$maxProfit", 2] },
      maxLoss: { $round: ["$maxLoss", 2] }
    }
  },
  
  // Sort by total P/L descending
  { $sort: { totalPnL: -1 } }
]);
```

**Best/Worst extraction**:
```javascript
// After pipeline execution:
const results = await pipeline.toArray();
const best = results[0];                    // highest P/L
const worst = results[results.length - 1];  // lowest P/L
```

---

### 3.4 Maximum Drawdown Pipeline

```javascript
// pipeline: getMaxDrawdown(userId, fromDate, toDate)
// This requires daily cumulative P/L first

db.trades.aggregate([
  // Match and sort by exit date
  {
    $match: {
      userId: ObjectId(userId),
      status: "closed",
      "exit.timestamp": { $gte: fromDate, $lte: toDate }
    }
  },
  
  // Group by day
  {
    $group: {
      _id: {
        $dateToString: { format: "%Y-%m-%d", date: "$exit.timestamp" }
      },
      dailyPnL: { $sum: "$pnl.net" }
    }
  },
  
  { $sort: { _id: 1 } },
  
  // Collect into array for cumulative calculation
  {
    $group: {
      _id: null,
      days: {
        $push: { date: "$_id", pnl: "$dailyPnL" }
      }
    }
  },
  
  // Calculate cumulative P/L and drawdown
  {
    $project: {
      analysis: {
        $reduce: {
          input: "$days",
          initialValue: {
            cumulative: 0,
            peak: 0,
            maxDrawdown: 0,
            maxDrawdownPercent: 0,
            results: []
          },
          in: {
            $let: {
              vars: {
                newCumulative: { $add: ["$$value.cumulative", "$$this.pnl"] },
                newPeak: {
                  $max: [
                    "$$value.peak",
                    { $add: ["$$value.cumulative", "$$this.pnl"] }
                  ]
                }
              },
              in: {
                cumulative: "$$newCumulative",
                peak: "$$newPeak",
                maxDrawdown: {
                  $max: [
                    "$$value.maxDrawdown",
                    { $subtract: ["$$newPeak", "$$newCumulative"] }
                  ]
                },
                maxDrawdownPercent: {
                  $cond: [
                    { $gt: ["$$newPeak", 0] },
                    {
                      $max: [
                        "$$value.maxDrawdownPercent",
                        {
                          $multiply: [
                            { $divide: [
                              { $subtract: ["$$newPeak", "$$newCumulative"] },
                              "$$newPeak"
                            ]},
                            100
                          ]
                        }
                      ]
                    },
                    "$$value.maxDrawdownPercent"
                  ]
                },
                results: {
                  $concatArrays: [
                    "$$value.results",
                    [{
                      date: "$$this.date",
                      dailyPnL: "$$this.pnl",
                      cumulative: "$$newCumulative",
                      peak: "$$newPeak",
                      drawdown: { $subtract: ["$$newPeak", "$$newCumulative"] }
                    }]
                  ]
                }
              }
            }
          }
        }
      }
    }
  },
  
  // Final projection
  {
    $project: {
      maxDrawdown: { $round: ["$analysis.maxDrawdown", 2] },
      maxDrawdownPercent: { $round: ["$analysis.maxDrawdownPercent", 2] },
      finalCumulative: { $round: ["$analysis.cumulative", 2] },
      peak: { $round: ["$analysis.peak", 2] },
      dailyData: "$analysis.results"
    }
  }
]);
```

---

### 3.5 Time-based Heatmap Pipeline

```javascript
// pipeline: getPerformanceHeatmap(userId, fromDate, toDate)
// Returns 7 (days) × 24 (hours) performance grid

db.trades.aggregate([
  {
    $match: {
      userId: ObjectId(userId),
      status: "closed",
      "exit.timestamp": { $gte: fromDate, $lte: toDate }
    }
  },
  
  // Extract day of week and hour (IST timezone)
  {
    $project: {
      dayOfWeek: {
        $dayOfWeek: {
          date: "$entry.timestamp",
          timezone: "Asia/Kolkata"
        }
      },
      hour: {
        $hour: {
          date: "$entry.timestamp",
          timezone: "Asia/Kolkata"
        }
      },
      pnl: "$pnl.net",
      isWinner: { $gt: ["$pnl.net", 0] }
    }
  },
  
  // Group by day and hour
  {
    $group: {
      _id: { day: "$dayOfWeek", hour: "$hour" },
      totalPnL: { $sum: "$pnl" },
      trades: { $sum: 1 },
      winners: { $sum: { $cond: ["$isWinner", 1, 0] } }
    }
  },
  
  // Calculate metrics per cell
  {
    $project: {
      day: "$_id.day",
      hour: "$_id.hour",
      totalPnL: { $round: ["$totalPnL", 2] },
      trades: 1,
      winRate: {
        $round: [
          { $multiply: [{ $divide: ["$winners", "$trades"] }, 100] },
          1
        ]
      },
      avgPnL: {
        $round: [{ $divide: ["$totalPnL", "$trades"] }, 2]
      }
    }
  },
  
  // Sort for consistent output
  { $sort: { day: 1, hour: 1 } }
]);

// Note: dayOfWeek: 1=Sunday, 2=Monday, ..., 7=Saturday
```

**Output structure for frontend**:
```typescript
interface HeatmapCell {
  day: number;      // 1-7 (Sunday-Saturday)
  hour: number;     // 0-23
  totalPnL: number;
  trades: number;
  winRate: number;
  avgPnL: number;
}

// Transform to 7×24 matrix
function toHeatmapMatrix(cells: HeatmapCell[]): number[][] {
  const matrix = Array(7).fill(null).map(() => Array(24).fill(0));
  cells.forEach(cell => {
    matrix[cell.day - 1][cell.hour] = cell.totalPnL;
  });
  return matrix;
}
```

---

### 3.6 Winning/Losing Streak Pipeline

```javascript
// pipeline: getStreaks(userId, fromDate, toDate)
// This requires ordered iteration - best done in application code

db.trades.aggregate([
  {
    $match: {
      userId: ObjectId(userId),
      status: "closed",
      "exit.timestamp": { $gte: fromDate, $lte: toDate }
    }
  },
  
  // Sort by exit time
  { $sort: { "exit.timestamp": 1 } },
  
  // Project win/loss indicator
  {
    $project: {
      exitTime: "$exit.timestamp",
      pnl: "$pnl.net",
      result: {
        $cond: [
          { $gt: ["$pnl.net", 0] },
          "win",
          { $cond: [{ $lt: ["$pnl.net", 0] }, "loss", "even"] }
        ]
      }
    }
  },
  
  // Collect all results
  {
    $group: {
      _id: null,
      trades: { $push: { result: "$result", pnl: "$pnl", time: "$exitTime" } }
    }
  }
]);

// Application-side streak calculation:
function calculateStreaks(trades: { result: string }[]): StreakResult {
  let currentStreak = 0;
  let currentType: string | null = null;
  let longestWin = 0;
  let longestLoss = 0;
  
  for (const trade of trades) {
    if (trade.result === 'even') continue;
    
    if (trade.result === currentType) {
      currentStreak++;
    } else {
      currentStreak = 1;
      currentType = trade.result;
    }
    
    if (currentType === 'win') {
      longestWin = Math.max(longestWin, currentStreak);
    } else {
      longestLoss = Math.max(longestLoss, currentStreak);
    }
  }
  
  return {
    longestWinStreak: longestWin,
    longestLossStreak: longestLoss,
    currentStreak,
    currentStreakType: currentType
  };
}
```

---

### 3.7 Tag-based Analytics Pipeline

```javascript
// pipeline: getTagPerformance(userId, fromDate, toDate)

db.trades.aggregate([
  {
    $match: {
      userId: ObjectId(userId),
      status: "closed",
      tags: { $exists: true, $ne: [] },
      "exit.timestamp": { $gte: fromDate, $lte: toDate }
    }
  },
  
  // Unwind tags array
  { $unwind: "$tags" },
  
  // Group by tag
  {
    $group: {
      _id: "$tags",
      totalPnL: { $sum: "$pnl.net" },
      trades: { $sum: 1 },
      winners: { $sum: { $cond: [{ $gt: ["$pnl.net", 0] }, 1, 0] } },
      avgPnL: { $avg: "$pnl.net" }
    }
  },
  
  {
    $project: {
      tag: "$_id",
      totalPnL: { $round: ["$totalPnL", 2] },
      trades: 1,
      winRate: {
        $round: [
          { $multiply: [{ $divide: ["$winners", "$trades"] }, 100] },
          1
        ]
      },
      avgPnL: { $round: ["$avgPnL", 2] }
    }
  },
  
  { $sort: { totalPnL: -1 } }
]);
```

---

## 4. Indexes for Analytics Performance

```javascript
// Essential compound indexes for analytics queries

// Overview & general queries
db.trades.createIndex(
  { userId: 1, status: 1, "entry.timestamp": -1 },
  { name: "idx_user_status_entry" }
);

// Monthly P/L (exit-based grouping)
db.trades.createIndex(
  { userId: 1, status: 1, "exit.timestamp": -1 },
  { name: "idx_user_status_exit" }
);

// Category performance
db.trades.createIndex(
  { userId: 1, status: 1, segment: 1, "exit.timestamp": -1 },
  { name: "idx_user_segment" }
);

db.trades.createIndex(
  { userId: 1, status: 1, tradeType: 1, "exit.timestamp": -1 },
  { name: "idx_user_tradeType" }
);

db.trades.createIndex(
  { userId: 1, status: 1, strategy: 1, "exit.timestamp": -1 },
  { name: "idx_user_strategy" }
);

// Tag analytics (multikey)
db.trades.createIndex(
  { userId: 1, status: 1, tags: 1 },
  { name: "idx_user_tags" }
);

// P/L range queries
db.trades.createIndex(
  { userId: 1, status: 1, "pnl.net": -1 },
  { name: "idx_user_pnl" }
);
```

---

## 5. Caching Strategy

### 5.1 Cache Key Patterns

```typescript
const CACHE_KEYS = {
  // Overview (most accessed)
  overview: (userId: string, period: string) => 
    `analytics:overview:${userId}:${period}`,
  
  // Monthly breakdown
  monthly: (userId: string, year: number) => 
    `analytics:monthly:${userId}:${year}`,
  
  // Category performance
  category: (userId: string, category: string, period: string) => 
    `analytics:category:${userId}:${category}:${period}`,
  
  // Heatmap (expensive to compute)
  heatmap: (userId: string, period: string) => 
    `analytics:heatmap:${userId}:${period}`,
  
  // Streaks
  streaks: (userId: string, period: string) => 
    `analytics:streaks:${userId}:${period}`,
  
  // Drawdown
  drawdown: (userId: string, period: string) => 
    `analytics:drawdown:${userId}:${period}`,
  
  // Last update timestamp (for invalidation)
  lastUpdate: (userId: string) => 
    `analytics:lastUpdate:${userId}`
};
```

### 5.2 TTL Configuration

```typescript
const CACHE_TTL = {
  // Frequently changing - short TTL
  overview: 60,           // 1 minute (during market hours)
  overviewOffHours: 300,  // 5 minutes (after market)
  
  // Less frequent - medium TTL
  monthly: 300,           // 5 minutes
  category: 300,          // 5 minutes
  
  // Expensive computations - longer TTL
  heatmap: 900,           // 15 minutes
  drawdown: 600,          // 10 minutes
  streaks: 600,           // 10 minutes
  
  // Pre-computed daily summaries
  dailySummary: 86400     // 24 hours
};
```

### 5.3 Cache-Aside Pattern

```typescript
class AnalyticsCacheService {
  constructor(
    private redis: Redis,
    private analyticsService: AnalyticsService
  ) {}

  async getOverview(
    userId: string,
    period: string,
    forceRefresh = false
  ): Promise<OverviewAnalytics> {
    const cacheKey = CACHE_KEYS.overview(userId, period);
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }
    
    // Compute from database
    const result = await this.analyticsService.computeOverview(userId, period);
    
    // Cache with appropriate TTL
    const ttl = this.isMarketHours() 
      ? CACHE_TTL.overview 
      : CACHE_TTL.overviewOffHours;
    
    await this.redis.setex(cacheKey, ttl, JSON.stringify(result));
    
    // Update last computation timestamp
    await this.redis.set(
      CACHE_KEYS.lastUpdate(userId),
      Date.now().toString()
    );
    
    return result;
  }

  // Invalidate all analytics cache for a user
  async invalidateUserCache(userId: string): Promise<void> {
    const pattern = `analytics:*:${userId}:*`;
    const keys = await this.redis.keys(pattern);
    
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    
    // Update timestamp to signal refresh needed
    await this.redis.set(
      CACHE_KEYS.lastUpdate(userId),
      Date.now().toString()
    );
  }

  private isMarketHours(): boolean {
    const now = new Date();
    const hours = now.getUTCHours() + 5.5; // IST offset
    const day = now.getDay();
    
    // Mon-Fri, 9:15 AM - 3:30 PM IST
    return day >= 1 && day <= 5 && hours >= 9.25 && hours <= 15.5;
  }
}
```

### 5.4 Pre-computation Strategy

```typescript
// Background job to pre-compute expensive analytics

async function precomputeAnalytics(): Promise<void> {
  const activeUsers = await getActiveUserIds();
  
  for (const userId of activeUsers) {
    // Pre-compute for common periods
    const periods = ['today', 'week', 'month', 'quarter', 'year', 'all'];
    
    for (const period of periods) {
      await analyticsCache.getOverview(userId, period, true);
      await analyticsCache.getHeatmap(userId, period, true);
    }
    
    // Pre-compute current year monthly
    const currentYear = new Date().getFullYear();
    await analyticsCache.getMonthly(userId, currentYear, true);
    
    // Small delay to avoid overwhelming DB
    await sleep(100);
  }
}

// Schedule: Run every 5 minutes during market hours
// Run once after market close
```

---

## 6. Analytics Update After Sync

### 6.1 Update Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Broker Sync │───▶│  Trades DB  │───▶│  Invalidate │───▶│  Refresh    │
│ Completes   │    │  Updated    │    │  Cache      │    │  Analytics  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                             │
                                             ▼
                                      ┌─────────────┐
                                      │  WebSocket  │
                                      │  Notify UI  │
                                      └─────────────┘
```

### 6.2 Post-Sync Hook

```typescript
// Called after broker sync completes

async function onSyncComplete(
  userId: string,
  syncResult: SyncResult
): Promise<void> {
  // 1. Invalidate analytics cache
  await analyticsCache.invalidateUserCache(userId);
  
  // 2. Re-compute critical metrics (async)
  const refreshPromises = [
    analyticsCache.getOverview(userId, 'today', true),
    analyticsCache.getOverview(userId, 'month', true),
  ];
  
  // Don't await - let it happen in background
  Promise.all(refreshPromises).catch(err => {
    logger.error({ userId, err }, 'Failed to refresh analytics post-sync');
  });
  
  // 3. Notify connected clients
  await wsGateway.publish(`user:${userId}:analytics`, {
    type: 'analytics_updated',
    timestamp: Date.now(),
    tradesAdded: syncResult.inserted,
    tradesUpdated: syncResult.updated
  });
}
```

### 6.3 Manual Trade Update Hook

```typescript
// Called after manual trade create/update/delete

async function onTradeModified(
  userId: string,
  tradeId: string,
  action: 'create' | 'update' | 'delete'
): Promise<void> {
  // Invalidate cache
  await analyticsCache.invalidateUserCache(userId);
  
  // If it's a significant trade (closed with P/L), refresh immediately
  if (action !== 'delete') {
    const trade = await tradeRepo.findById(tradeId);
    if (trade?.status === 'closed') {
      await analyticsCache.getOverview(userId, 'today', true);
    }
  }
}
```

---

## 7. Optimized Query Structures

### 7.1 Query with Period Resolution

```typescript
function getPeriodDateRange(period: string): { from: Date; to: Date } {
  const now = new Date();
  const to = now;
  let from: Date;
  
  switch (period) {
    case 'today':
      from = startOfDay(now);
      break;
    case 'week':
      from = startOfWeek(now, { weekStartsOn: 1 });
      break;
    case 'month':
      from = startOfMonth(now);
      break;
    case 'quarter':
      from = startOfQuarter(now);
      break;
    case 'year':
      from = startOfYear(now);
      break;
    case 'fy': // Indian Financial Year (Apr-Mar)
      const fyYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      from = new Date(fyYear, 3, 1); // April 1
      break;
    case 'all':
      from = new Date(0);
      break;
    default:
      from = startOfMonth(now);
  }
  
  return { from, to };
}
```

### 7.2 Batch Aggregation for Dashboard

```typescript
// Single query to get multiple metrics for dashboard

async function getDashboardAnalytics(userId: string): Promise<DashboardData> {
  const { from, to } = getPeriodDateRange('month');
  
  const pipeline = [
    {
      $match: {
        userId: new ObjectId(userId),
        status: 'closed',
        'exit.timestamp': { $gte: from, $lte: to }
      }
    },
    {
      $facet: {
        // Overview stats
        overview: [
          {
            $group: {
              _id: null,
              totalPnL: { $sum: '$pnl.net' },
              trades: { $sum: 1 },
              winners: { $sum: { $cond: [{ $gt: ['$pnl.net', 0] }, 1, 0] } },
              totalProfit: { $sum: { $cond: [{ $gt: ['$pnl.net', 0] }, '$pnl.net', 0] } },
              totalLoss: { $sum: { $cond: [{ $lt: ['$pnl.net', 0] }, { $abs: '$pnl.net' }, 0] } }
            }
          }
        ],
        
        // By segment
        bySegment: [
          { $group: { _id: '$segment', pnl: { $sum: '$pnl.net' }, count: { $sum: 1 } } },
          { $sort: { pnl: -1 } }
        ],
        
        // Recent trades
        recentTrades: [
          { $sort: { 'exit.timestamp': -1 } },
          { $limit: 5 },
          { $project: { symbol: 1, pnl: '$pnl.net', exitTime: '$exit.timestamp' } }
        ],
        
        // Daily totals for chart
        dailyPnL: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$exit.timestamp' } },
              pnl: { $sum: '$pnl.net' }
            }
          },
          { $sort: { _id: 1 } }
        ]
      }
    }
  ];
  
  const [result] = await db.collection('trades').aggregate(pipeline).toArray();
  
  return transformToDashboardData(result);
}
```

---

## 8. Analytics Service Implementation

```typescript
// services/analytics.service.ts

export class AnalyticsService {
  constructor(
    private db: Db,
    private cache: AnalyticsCacheService
  ) {}

  async getOverview(
    userId: string,
    period: string
  ): Promise<OverviewAnalytics> {
    return this.cache.getOverview(userId, period);
  }

  async getMonthlyPnL(
    userId: string,
    year: number
  ): Promise<MonthlyPnL[]> {
    return this.cache.getMonthly(userId, year);
  }

  async getCategoryPerformance(
    userId: string,
    category: 'segment' | 'tradeType' | 'strategy',
    period: string
  ): Promise<CategoryPerformance[]> {
    return this.cache.getCategory(userId, category, period);
  }

  async getHeatmap(
    userId: string,
    period: string
  ): Promise<HeatmapData> {
    return this.cache.getHeatmap(userId, period);
  }

  async getMaxDrawdown(
    userId: string,
    period: string
  ): Promise<DrawdownData> {
    return this.cache.getDrawdown(userId, period);
  }

  async getStreaks(
    userId: string,
    period: string
  ): Promise<StreakData> {
    return this.cache.getStreaks(userId, period);
  }

  // Force refresh all analytics
  async refreshAll(userId: string): Promise<void> {
    await this.cache.invalidateUserCache(userId);
    
    // Re-compute in parallel
    await Promise.all([
      this.cache.getOverview(userId, 'month', true),
      this.cache.getMonthly(userId, new Date().getFullYear(), true),
      this.cache.getHeatmap(userId, 'month', true),
    ]);
  }
}
```

---

## 9. API Response Types

```typescript
interface OverviewAnalytics {
  period: string;
  totalTrades: number;
  closedTrades: number;
  openTrades: number;
  
  realizedPnL: number;
  unrealizedPnL: number;
  totalPnL: number;
  
  grossPnL: number;
  totalCharges: number;
  
  winners: number;
  losers: number;
  breakeven: number;
  winRate: number;
  
  avgProfit: number;
  avgLoss: number;
  profitFactor: number;
  expectancy: number;
  
  maxProfit: number;
  maxLoss: number;
  
  computedAt: string;
}

interface MonthlyPnL {
  month: number;
  monthName: string;
  totalPnL: number;
  grossPnL: number;
  charges: number;
  trades: number;
  winners: number;
  losers: number;
  winRate: number;
}

interface CategoryPerformance {
  category: string;
  totalPnL: number;
  trades: number;
  winners: number;
  losers: number;
  winRate: number;
  avgPnL: number;
  maxProfit: number;
  maxLoss: number;
}

interface HeatmapData {
  cells: HeatmapCell[];
  matrix: number[][];  // 7×24 for visualization
  bestDay: number;
  bestHour: number;
  worstDay: number;
  worstHour: number;
}

interface DrawdownData {
  maxDrawdown: number;
  maxDrawdownPercent: number;
  currentDrawdown: number;
  peak: number;
  trough: number;
  recoveryDays: number | null;
  dailyData: DailyEquity[];
}

interface StreakData {
  longestWinStreak: number;
  longestLossStreak: number;
  currentStreak: number;
  currentStreakType: 'win' | 'loss' | null;
}
```

---

## 10. Summary

| Component | Implementation |
|-----------|----------------|
| **Metrics** | 9 core metrics with MongoDB aggregation |
| **Pipelines** | 7 optimized aggregation pipelines |
| **Indexes** | 7 compound indexes for query performance |
| **Caching** | Redis with TTL-based invalidation |
| **Updates** | Hook-based refresh after sync/trade changes |
| **API** | Typed responses with period support |

**Performance Targets**:
- Overview query: < 50ms (cached), < 200ms (computed)
- Monthly P/L: < 100ms
- Heatmap: < 200ms (cached)
- Drawdown: < 300ms (cached)

---

**Document Stats**:
- Lines: ~1,200
- Aggregation Pipelines: 7
- Code Examples: 15+

**Next Steps**:
- Part 9: Frontend Design
- Part 10: Testing Strategy & Deployment
