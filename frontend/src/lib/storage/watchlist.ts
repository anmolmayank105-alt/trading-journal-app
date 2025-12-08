// Watchlist storage service

import { getFromStorage, setToStorage, generateId, STORAGE_KEYS } from './index';
import { getCurrentUser } from './auth';
import { Watchlist, StockQuote } from '@/types';
import { getMarketIndices as fetchMarketIndices, getStockQuotes as fetchStockQuotes } from '@/lib/api/market';

export interface WatchlistResult {
  success: boolean;
  watchlist?: Watchlist;
  error?: string;
}

// Get user's watchlists
export function getWatchlists(): Watchlist[] {
  const user = getCurrentUser();
  if (!user) return [];
  
  const allWatchlists = getFromStorage<Watchlist[]>(STORAGE_KEYS.WATCHLISTS, []);
  return allWatchlists.filter(w => w.userId === user.id);
}

// Get single watchlist by ID
export function getWatchlistById(id: string): Watchlist | null {
  const user = getCurrentUser();
  if (!user) return null;
  
  const allWatchlists = getFromStorage<Watchlist[]>(STORAGE_KEYS.WATCHLISTS, []);
  return allWatchlists.find(w => w.id === id && w.userId === user.id) || null;
}

// Create watchlist
export function createWatchlist(name: string, symbols: string[] = []): WatchlistResult {
  const user = getCurrentUser();
  if (!user) {
    return { success: false, error: 'Not logged in' };
  }
  
  const allWatchlists = getFromStorage<Watchlist[]>(STORAGE_KEYS.WATCHLISTS, []);
  
  const newWatchlist: Watchlist = {
    id: generateId(),
    userId: user.id,
    name,
    symbols,
    createdAt: new Date().toISOString(),
  };
  
  allWatchlists.push(newWatchlist);
  setToStorage(STORAGE_KEYS.WATCHLISTS, allWatchlists);
  
  return { success: true, watchlist: newWatchlist };
}

// Add symbol to watchlist
export function addToWatchlist(watchlistId: string, symbol: string): WatchlistResult {
  const user = getCurrentUser();
  if (!user) {
    return { success: false, error: 'Not logged in' };
  }
  
  const allWatchlists = getFromStorage<Watchlist[]>(STORAGE_KEYS.WATCHLISTS, []);
  const watchlistIndex = allWatchlists.findIndex(
    w => w.id === watchlistId && w.userId === user.id
  );
  
  if (watchlistIndex === -1) {
    return { success: false, error: 'Watchlist not found' };
  }
  
  if (allWatchlists[watchlistIndex].symbols.includes(symbol)) {
    return { success: false, error: 'Symbol already in watchlist' };
  }
  
  allWatchlists[watchlistIndex].symbols.push(symbol);
  setToStorage(STORAGE_KEYS.WATCHLISTS, allWatchlists);
  
  return { success: true, watchlist: allWatchlists[watchlistIndex] };
}

// Remove symbol from watchlist
export function removeFromWatchlist(watchlistId: string, symbol: string): WatchlistResult {
  const user = getCurrentUser();
  if (!user) {
    return { success: false, error: 'Not logged in' };
  }
  
  const allWatchlists = getFromStorage<Watchlist[]>(STORAGE_KEYS.WATCHLISTS, []);
  const watchlistIndex = allWatchlists.findIndex(
    w => w.id === watchlistId && w.userId === user.id
  );
  
  if (watchlistIndex === -1) {
    return { success: false, error: 'Watchlist not found' };
  }
  
  allWatchlists[watchlistIndex].symbols = allWatchlists[watchlistIndex].symbols.filter(
    s => s !== symbol
  );
  setToStorage(STORAGE_KEYS.WATCHLISTS, allWatchlists);
  
  return { success: true, watchlist: allWatchlists[watchlistIndex] };
}

// Delete watchlist
export function deleteWatchlist(id: string): WatchlistResult {
  const user = getCurrentUser();
  if (!user) {
    return { success: false, error: 'Not logged in' };
  }
  
  const allWatchlists = getFromStorage<Watchlist[]>(STORAGE_KEYS.WATCHLISTS, []);
  const watchlistIndex = allWatchlists.findIndex(
    w => w.id === id && w.userId === user.id
  );
  
  if (watchlistIndex === -1) {
    return { success: false, error: 'Watchlist not found' };
  }
  
  const deleted = allWatchlists.splice(watchlistIndex, 1)[0];
  setToStorage(STORAGE_KEYS.WATCHLISTS, allWatchlists);
  
  return { success: true, watchlist: deleted };
}

// Create default watchlist for new users
export function createDefaultWatchlist(): void {
  const user = getCurrentUser();
  if (!user) return;
  
  const existingWatchlists = getWatchlists();
  if (existingWatchlists.length > 0) return;
  
  createWatchlist('My Watchlist', [
    'RELIANCE',
    'TCS',
    'INFY',
    'HDFCBANK',
    'ICICIBANK',
    'BHARTIARTL',
    'SBIN',
    'WIPRO',
  ]);
}

// Fallback mock prices for when API fails
const MOCK_PRICES: Record<string, { price: number; change: number; volume: number }> = {
  RELIANCE: { price: 2485.50, change: 1.25, volume: 5423120 },
  TCS: { price: 3842.75, change: -0.45, volume: 2341560 },
  INFY: { price: 1835.20, change: 0.85, volume: 4521890 },
  HDFCBANK: { price: 1695.80, change: -0.32, volume: 3214560 },
  ICICIBANK: { price: 1045.30, change: 1.45, volume: 6542310 },
  BHARTIARTL: { price: 1125.60, change: 2.15, volume: 3214560 },
  SBIN: { price: 585.40, change: -1.05, volume: 8542310 },
  WIPRO: { price: 425.80, change: 0.65, volume: 2145680 },
  TATAMOTORS: { price: 745.20, change: 1.85, volume: 4521890 },
  LT: { price: 3245.60, change: -0.55, volume: 1254680 },
  KOTAKBANK: { price: 1785.40, change: 0.35, volume: 2145680 },
  AXISBANK: { price: 1085.20, change: -0.85, volume: 3542180 },
};

// Get quotes for symbols - now fetches real-time data
export async function getQuotes(symbols: string[]): Promise<StockQuote[]> {
  try {
    // Try to fetch real-time data
    const quotes = await fetchStockQuotes(symbols);
    if (quotes && quotes.length > 0) {
      return quotes;
    }
  } catch (error) {
    console.warn('Failed to fetch real-time quotes, using fallback:', error);
  }
  
  // Fallback to mock data if API fails
  return symbols.map(symbol => {
    const data = MOCK_PRICES[symbol] || {
      price: 100 + Math.random() * 2000,
      change: (Math.random() - 0.5) * 4,
      volume: Math.floor(Math.random() * 10000000),
    };
    
    // Add some randomness to simulate live data
    const variation = 1 + (Math.random() - 0.5) * 0.005;
    const price = data.price * variation;
    const change = data.change + (Math.random() - 0.5) * 0.2;
    
    return {
      symbol,
      exchange: 'NSE',
      ltp: price,
      change: price * change / 100,
      changePercent: change,
      open: price * 0.998,
      high: price * 1.012,
      low: price * 0.992,
      close: price / (1 + change / 100),
      volume: data.volume + Math.floor((Math.random() - 0.5) * 500000),
      timestamp: new Date().toISOString(),
    };
  });
}

// Get market indices - now fetches real-time data
export async function getMarketIndices() {
  try {
    // Try to fetch real-time data
    const indices = await fetchMarketIndices();
    if (indices && indices.length > 0) {
      return indices;
    }
  } catch (error) {
    console.warn('Failed to fetch real-time indices, using fallback:', error);
  }
  
  // Fallback to static data if API fails
  return [
    {
      symbol: 'NIFTY 50',
      value: 21452.30 + (Math.random() - 0.5) * 50,
      change: 145.20 + (Math.random() - 0.5) * 20,
      changePercent: 0.68 + (Math.random() - 0.5) * 0.2,
      high: 21485.60,
      low: 21325.40,
      open: 21345.80,
    },
    {
      symbol: 'NIFTY BANK',
      value: 45862.50 + (Math.random() - 0.5) * 100,
      change: -125.80 + (Math.random() - 0.5) * 30,
      changePercent: -0.27 + (Math.random() - 0.5) * 0.1,
      high: 46125.40,
      low: 45785.20,
      open: 45985.60,
    },
    {
      symbol: 'SENSEX',
      value: 70852.45 + (Math.random() - 0.5) * 100,
      change: 425.60 + (Math.random() - 0.5) * 40,
      changePercent: 0.60 + (Math.random() - 0.5) * 0.15,
      high: 70965.80,
      low: 70485.20,
      open: 70542.60,
    },
    {
      symbol: 'NIFTY IT',
      value: 35425.80 + (Math.random() - 0.5) * 80,
      change: 285.40 + (Math.random() - 0.5) * 25,
      changePercent: 0.81 + (Math.random() - 0.5) * 0.2,
      high: 35542.60,
      low: 35185.40,
      open: 35245.20,
    },
  ];
}
