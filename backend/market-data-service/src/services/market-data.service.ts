/**
 * Market Data Service
 * Provides market data, quotes, and real-time prices
 */

import NodeCache from 'node-cache';
import axios from 'axios';
import { logger } from '@stock-tracker/shared/utils';

export interface Quote {
  symbol: string;
  exchange: string;
  lastPrice: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: Date;
  bid?: number;
  ask?: number;
  bidSize?: number;
  askSize?: number;
}

export interface MarketStatus {
  exchange: string;
  status: 'open' | 'closed' | 'pre-market' | 'post-market';
  openTime?: string;
  closeTime?: string;
  nextOpenTime?: string;
}

export interface HistoricalData {
  symbol: string;
  exchange: string;
  interval: string;
  data: {
    timestamp: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
}

// In-memory cache for quotes
const cache = new NodeCache({
  stdTTL: parseInt(process.env.CACHE_TTL || '60'),
  checkperiod: 30,
});

// Pre-computed symbol index for O(1) search - built once at startup
const allSymbols = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', exchange: 'NSE', segment: 'equity', searchKey: 'reliance reliance industries ltd' },
  { symbol: 'TCS', name: 'Tata Consultancy Services Ltd', exchange: 'NSE', segment: 'equity', searchKey: 'tcs tata consultancy services ltd' },
  { symbol: 'INFY', name: 'Infosys Ltd', exchange: 'NSE', segment: 'equity', searchKey: 'infy infosys ltd' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', exchange: 'NSE', segment: 'equity', searchKey: 'hdfcbank hdfc bank ltd' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', exchange: 'NSE', segment: 'equity', searchKey: 'icicibank icici bank ltd' },
  { symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE', segment: 'equity', searchKey: 'sbin state bank of india' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', exchange: 'NSE', segment: 'equity', searchKey: 'bhartiartl bharti airtel ltd' },
  { symbol: 'WIPRO', name: 'Wipro Ltd', exchange: 'NSE', segment: 'equity', searchKey: 'wipro wipro ltd' },
  { symbol: 'HCLTECH', name: 'HCL Technologies Ltd', exchange: 'NSE', segment: 'equity', searchKey: 'hcltech hcl technologies ltd' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', exchange: 'NSE', segment: 'equity', searchKey: 'tatamotors tata motors ltd' },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd', exchange: 'NSE', segment: 'equity', searchKey: 'maruti maruti suzuki india ltd' },
  { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd', exchange: 'NSE', segment: 'equity', searchKey: 'asianpaint asian paints ltd' },
  { symbol: 'AXISBANK', name: 'Axis Bank Ltd', exchange: 'NSE', segment: 'equity', searchKey: 'axisbank axis bank ltd' },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd', exchange: 'NSE', segment: 'equity', searchKey: 'kotakbank kotak mahindra bank ltd' },
  { symbol: 'LT', name: 'Larsen & Toubro Ltd', exchange: 'NSE', segment: 'equity', searchKey: 'lt larsen toubro ltd' },
  { symbol: 'NIFTY50', name: 'Nifty 50 Index', exchange: 'NSE', segment: 'index', searchKey: 'nifty50 nifty 50 index' },
  { symbol: 'BANKNIFTY', name: 'Nifty Bank Index', exchange: 'NSE', segment: 'index', searchKey: 'banknifty nifty bank index' },
  { symbol: 'SENSEX', name: 'BSE Sensex', exchange: 'BSE', segment: 'index', searchKey: 'sensex bse sensex' },
];

// Build symbol lookup map for O(1) exact match
const symbolMap = new Map(allSymbols.map(s => [s.symbol, s]));

// Build trie-like prefix index for fast prefix search
const prefixIndex = new Map<string, typeof allSymbols>();
allSymbols.forEach(s => {
  // Index by first 1-3 characters of symbol and name
  const prefixes = new Set<string>();
  prefixes.add(s.symbol.substring(0, 1).toLowerCase());
  prefixes.add(s.symbol.substring(0, 2).toLowerCase());
  prefixes.add(s.symbol.substring(0, 3).toLowerCase());
  s.name.split(' ').forEach(word => {
    if (word.length >= 1) prefixes.add(word.substring(0, 1).toLowerCase());
    if (word.length >= 2) prefixes.add(word.substring(0, 2).toLowerCase());
    if (word.length >= 3) prefixes.add(word.substring(0, 3).toLowerCase());
  });
  prefixes.forEach(prefix => {
    if (!prefixIndex.has(prefix)) {
      prefixIndex.set(prefix, []);
    }
    prefixIndex.get(prefix)!.push(s);
  });
});

// Mock data for development (replace with actual API calls in production)
const mockQuotes: Map<string, Quote> = new Map([
  ['RELIANCE:NSE', {
    symbol: 'RELIANCE',
    exchange: 'NSE',
    lastPrice: 2495.50,
    change: 15.25,
    changePercent: 0.62,
    open: 2480.00,
    high: 2510.00,
    low: 2475.00,
    close: 2480.25,
    volume: 5234567,
    timestamp: new Date(),
  }],
  ['TCS:NSE', {
    symbol: 'TCS',
    exchange: 'NSE',
    lastPrice: 3650.75,
    change: -22.50,
    changePercent: -0.61,
    open: 3670.00,
    high: 3680.00,
    low: 3640.00,
    close: 3673.25,
    volume: 1234567,
    timestamp: new Date(),
  }],
  ['INFY:NSE', {
    symbol: 'INFY',
    exchange: 'NSE',
    lastPrice: 1485.30,
    change: 8.75,
    changePercent: 0.59,
    open: 1475.00,
    high: 1490.00,
    low: 1472.00,
    close: 1476.55,
    volume: 2345678,
    timestamp: new Date(),
  }],
  ['HDFCBANK:NSE', {
    symbol: 'HDFCBANK',
    exchange: 'NSE',
    lastPrice: 1625.80,
    change: 12.30,
    changePercent: 0.76,
    open: 1610.00,
    high: 1630.00,
    low: 1605.00,
    close: 1613.50,
    volume: 3456789,
    timestamp: new Date(),
  }],
  ['ICICIBANK:NSE', {
    symbol: 'ICICIBANK',
    exchange: 'NSE',
    lastPrice: 980.45,
    change: -5.20,
    changePercent: -0.53,
    open: 985.00,
    high: 990.00,
    low: 978.00,
    close: 985.65,
    volume: 4567890,
    timestamp: new Date(),
  }],
]);

class MarketDataService {
  /**
   * Get quote for a single symbol
   */
  async getQuote(symbol: string, exchange: string): Promise<Quote | null> {
    const cacheKey = `quote:${symbol}:${exchange}`;
    
    // Check cache first
    const cached = cache.get<Quote>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get from mock data (replace with API call in production)
    const quote = this.getMockQuote(symbol, exchange);
    
    if (quote) {
      cache.set(cacheKey, quote);
    }

    return quote;
  }

  /**
   * Get quotes for multiple symbols
   * Optimized: Parallel batch fetch with cache check - O(n) concurrent, not sequential
   */
  async getQuotes(symbols: { symbol: string; exchange: string }[]): Promise<Quote[]> {
    // Separate cached and uncached symbols - O(n)
    const uncached: typeof symbols = [];
    const results: Quote[] = [];
    const resultMap = new Map<string, Quote>();
    
    for (const { symbol, exchange } of symbols) {
      const cacheKey = `quote:${symbol}:${exchange}`;
      const cached = cache.get<Quote>(cacheKey);
      if (cached) {
        resultMap.set(`${symbol}:${exchange}`, cached);
      } else {
        uncached.push({ symbol, exchange });
      }
    }
    
    // Fetch uncached quotes in parallel - O(1) parallel time complexity
    if (uncached.length > 0) {
      const fetchPromises = uncached.map(async ({ symbol, exchange }) => {
        const quote = this.getMockQuote(symbol, exchange);
        if (quote) {
          cache.set(`quote:${symbol}:${exchange}`, quote);
          resultMap.set(`${symbol}:${exchange}`, quote);
        }
        return quote;
      });
      
      await Promise.all(fetchPromises);
    }
    
    // Preserve original order
    for (const { symbol, exchange } of symbols) {
      const quote = resultMap.get(`${symbol}:${exchange}`);
      if (quote) {
        results.push(quote);
      }
    }

    return results;
  }

  /**
   * Get market status
   */
  async getMarketStatus(exchange: string): Promise<MarketStatus> {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const day = now.getDay();

    // Simple market hours check for NSE (9:15 AM - 3:30 PM IST, Mon-Fri)
    let status: MarketStatus['status'] = 'closed';
    
    if (exchange === 'NSE' || exchange === 'BSE') {
      if (day >= 1 && day <= 5) { // Monday to Friday
        const timeInMinutes = hours * 60 + minutes;
        const openTime = 9 * 60 + 15; // 9:15 AM
        const closeTime = 15 * 60 + 30; // 3:30 PM
        const preMarketStart = 9 * 60; // 9:00 AM
        const postMarketEnd = 16 * 60; // 4:00 PM

        if (timeInMinutes >= openTime && timeInMinutes < closeTime) {
          status = 'open';
        } else if (timeInMinutes >= preMarketStart && timeInMinutes < openTime) {
          status = 'pre-market';
        } else if (timeInMinutes >= closeTime && timeInMinutes < postMarketEnd) {
          status = 'post-market';
        }
      }
    }

    return {
      exchange,
      status,
      openTime: '09:15:00',
      closeTime: '15:30:00',
    };
  }

  /**
   * Get historical data for a symbol
   */
  async getHistoricalData(
    symbol: string,
    exchange: string,
    interval: '1m' | '5m' | '15m' | '30m' | '1h' | '1d' | '1w' | '1M',
    from: Date,
    to: Date
  ): Promise<HistoricalData> {
    // Generate mock historical data
    const data: HistoricalData['data'] = [];
    const currentPrice = mockQuotes.get(`${symbol}:${exchange}`)?.lastPrice || 1000;
    
    let intervalMs: number;
    switch (interval) {
      case '1m': intervalMs = 60 * 1000; break;
      case '5m': intervalMs = 5 * 60 * 1000; break;
      case '15m': intervalMs = 15 * 60 * 1000; break;
      case '30m': intervalMs = 30 * 60 * 1000; break;
      case '1h': intervalMs = 60 * 60 * 1000; break;
      case '1d': intervalMs = 24 * 60 * 60 * 1000; break;
      case '1w': intervalMs = 7 * 24 * 60 * 60 * 1000; break;
      case '1M': intervalMs = 30 * 24 * 60 * 60 * 1000; break;
    }

    let price = currentPrice * 0.95; // Start 5% lower
    for (let timestamp = from.getTime(); timestamp <= to.getTime(); timestamp += intervalMs) {
      const change = (Math.random() - 0.48) * price * 0.02; // Random walk with slight upward bias
      price += change;
      
      const high = price * (1 + Math.random() * 0.01);
      const low = price * (1 - Math.random() * 0.01);
      
      data.push({
        timestamp: new Date(timestamp),
        open: price - change / 2,
        high,
        low,
        close: price,
        volume: Math.floor(Math.random() * 1000000) + 100000,
      });
    }

    return {
      symbol,
      exchange,
      interval,
      data,
    };
  }

  /**
   * Search symbols
   * Optimized: O(1) with prefix index instead of O(n) full scan
   */
  async searchSymbols(query: string): Promise<{ symbol: string; name: string; exchange: string; segment: string }[]> {
    if (!query || query.length === 0) {
      return allSymbols.map(s => ({ symbol: s.symbol, name: s.name, exchange: s.exchange, segment: s.segment }));
    }
    
    const queryLower = query.toLowerCase().trim();
    
    // Exact match first - O(1)
    const exactMatch = symbolMap.get(query.toUpperCase());
    if (exactMatch) {
      return [{ symbol: exactMatch.symbol, name: exactMatch.name, exchange: exactMatch.exchange, segment: exactMatch.segment }];
    }
    
    // Use prefix index for first 1-3 chars - O(1) lookup + O(k) filter where k << n
    const prefixKey = queryLower.substring(0, Math.min(3, queryLower.length));
    let candidates = prefixIndex.get(prefixKey);
    
    // Fallback to shorter prefix if no match
    if (!candidates && prefixKey.length >= 2) {
      candidates = prefixIndex.get(prefixKey.substring(0, 2));
    }
    if (!candidates && prefixKey.length >= 1) {
      candidates = prefixIndex.get(prefixKey.substring(0, 1));
    }
    
    if (!candidates) {
      return [];
    }
    
    // Filter candidates by full query - O(k) where k is small subset
    const results = candidates.filter(s => s.searchKey.includes(queryLower));
    
    // Remove duplicates using Set
    const seen = new Set<string>();
    return results.filter(s => {
      if (seen.has(s.symbol)) return false;
      seen.add(s.symbol);
      return true;
    }).map(s => ({ symbol: s.symbol, name: s.name, exchange: s.exchange, segment: s.segment }));
  }

  /**
   * Get top gainers
   */
  async getTopGainers(exchange: string, limit: number = 10): Promise<Quote[]> {
    const quotes = Array.from(mockQuotes.values())
      .filter((q) => q.exchange === exchange)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, limit);

    return quotes;
  }

  /**
   * Get top losers
   */
  async getTopLosers(exchange: string, limit: number = 10): Promise<Quote[]> {
    const quotes = Array.from(mockQuotes.values())
      .filter((q) => q.exchange === exchange)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, limit);

    return quotes;
  }

  /**
   * Get mock quote (replace with real API in production)
   */
  private getMockQuote(symbol: string, exchange: string): Quote | null {
    const key = `${symbol}:${exchange}`;
    const base = mockQuotes.get(key);
    
    if (!base) {
      // Generate random quote for unknown symbols
      const basePrice = 100 + Math.random() * 4900;
      const change = (Math.random() - 0.5) * basePrice * 0.05;
      
      return {
        symbol,
        exchange,
        lastPrice: Math.round(basePrice * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round((change / basePrice) * 10000) / 100,
        open: Math.round((basePrice - change / 2) * 100) / 100,
        high: Math.round((basePrice * 1.02) * 100) / 100,
        low: Math.round((basePrice * 0.98) * 100) / 100,
        close: Math.round((basePrice - change) * 100) / 100,
        volume: Math.floor(Math.random() * 1000000) + 100000,
        timestamp: new Date(),
      };
    }

    // Add some random variation to simulate live data
    const variation = (Math.random() - 0.5) * 0.002;
    const newPrice = base.lastPrice * (1 + variation);
    const change = newPrice - base.close;

    return {
      ...base,
      lastPrice: Math.round(newPrice * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round((change / base.close) * 10000) / 100,
      timestamp: new Date(),
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    cache.flushAll();
    logger.info('Market data cache cleared');
  }
}

export const marketDataService = new MarketDataService();
