// Trade storage service - handles trade CRUD operations with localStorage

import { getFromStorage, setToStorage, generateId, STORAGE_KEYS } from './index';
import { getCurrentUser } from './auth';
import { Trade, TradeFilter } from '@/types';

export interface TradeResult {
  success: boolean;
  trade?: Trade;
  trades?: Trade[];
  error?: string;
}

// Claim ALL trades in storage for current user (useful for data recovery)
export function claimAllTrades(): { claimed: number; error?: string } {
  const user = getCurrentUser();
  if (!user) {
    console.log('💾 [Storage] claimAllTrades: No user logged in');
    return { claimed: 0, error: 'Not logged in' };
  }
  
  const allTrades = getFromStorage<Trade[]>(STORAGE_KEYS.TRADES, []);
  console.log('💾 [Storage] claimAllTrades: Found', allTrades.length, 'total trades');
  
  let claimed = 0;
  const updatedTrades = allTrades.map(t => {
    if (t.userId !== user.id) {
      claimed++;
      return { ...t, userId: user.id };
    }
    return t;
  });
  
  if (claimed > 0) {
    setToStorage(STORAGE_KEYS.TRADES, updatedTrades);
    console.log('💾 [Storage] claimAllTrades: Claimed', claimed, 'trades for user', user.id);
  }
  
  return { claimed };
}

// Debug functions - only available in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Debug: Get all trades regardless of user
  const getAllTradesDebug = (): Trade[] => {
    return getFromStorage<Trade[]>(STORAGE_KEYS.TRADES, []);
  };
  
  (window as any).claimAllTrades = claimAllTrades;
  (window as any).getAllTradesDebug = getAllTradesDebug;
}

// Get user's trades
export function getTrades(filters?: TradeFilter): Trade[] {
  const user = getCurrentUser();
  if (!user) return [];
  
  const allTrades = getFromStorage<Trade[]>(STORAGE_KEYS.TRADES, []);
  let userTrades = allTrades.filter(t => t.userId === user.id);
  
  // Apply filters
  if (filters) {
    if (filters.symbol) {
      userTrades = userTrades.filter(t => 
        t.symbol.toLowerCase().includes(filters.symbol!.toLowerCase())
      );
    }
    if (filters.tradeType) {
      userTrades = userTrades.filter(t => t.tradeType === filters.tradeType);
    }
    if (filters.segment) {
      userTrades = userTrades.filter(t => t.segment === filters.segment);
    }
    if (filters.status) {
      userTrades = userTrades.filter(t => t.status === filters.status);
    }
    if (filters.startDate) {
      userTrades = userTrades.filter(t => 
        new Date(t.entryDate) >= new Date(filters.startDate!)
      );
    }
    if (filters.endDate) {
      userTrades = userTrades.filter(t => 
        new Date(t.entryDate) <= new Date(filters.endDate!)
      );
    }
    if (filters.exitDate) {
      userTrades = userTrades.filter(t => {
        if (!t.exitDate) return false;
        const tradeExitDate = new Date(t.exitDate).toISOString().split('T')[0];
        return tradeExitDate === filters.exitDate;
      });
    }
    if (filters.minPnl !== undefined) {
      userTrades = userTrades.filter(t => (t.pnl || 0) >= filters.minPnl!);
    }
    if (filters.maxPnl !== undefined) {
      userTrades = userTrades.filter(t => (t.pnl || 0) <= filters.maxPnl!);
    }
  }
  
  // Sort by entry date descending
  return userTrades.sort((a, b) => 
    new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
  );
}

// Get single trade by ID
export function getTradeById(id: string): Trade | null {
  const user = getCurrentUser();
  if (!user) return null;
  
  const allTrades = getFromStorage<Trade[]>(STORAGE_KEYS.TRADES, []);
  return allTrades.find(t => t.id === id && t.userId === user.id) || null;
}

// Create new trade
export function createTrade(tradeData: Omit<Trade, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): TradeResult {
  const user = getCurrentUser();
  if (!user) {
    return { success: false, error: 'Not logged in' };
  }
  
  const allTrades = getFromStorage<Trade[]>(STORAGE_KEYS.TRADES, []);
  
  // Calculate P&L if exit price is provided
  let pnl: number | undefined;
  let pnlPercentage: number | undefined;
  
  if (tradeData.exitPrice && tradeData.status === 'closed') {
    const entry = tradeData.entryPrice;
    const exit = tradeData.exitPrice;
    const qty = tradeData.quantity;
    const charges = tradeData.charges || 0;
    
    if (tradeData.tradeType === 'long') {
      pnl = (exit - entry) * qty - charges;
      pnlPercentage = ((exit - entry) / entry) * 100;
    } else {
      pnl = (entry - exit) * qty - charges;
      pnlPercentage = ((entry - exit) / entry) * 100;
    }
  }
  
  const newTrade: Trade = {
    ...tradeData,
    id: generateId(),
    userId: user.id,
    pnl,
    pnlPercentage,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  allTrades.push(newTrade);
  setToStorage(STORAGE_KEYS.TRADES, allTrades);
  
  return { success: true, trade: newTrade };
}

// Update trade
export function updateTrade(id: string, updates: Partial<Trade>): TradeResult {
  const user = getCurrentUser();
  if (!user) {
    return { success: false, error: 'Not logged in' };
  }
  
  const allTrades = getFromStorage<Trade[]>(STORAGE_KEYS.TRADES, []);
  const tradeIndex = allTrades.findIndex(t => t.id === id && t.userId === user.id);
  
  if (tradeIndex === -1) {
    return { success: false, error: 'Trade not found' };
  }
  
  const existingTrade = allTrades[tradeIndex];
  const updatedTrade = { ...existingTrade, ...updates, updatedAt: new Date().toISOString() };
  
  // Recalculate P&L if relevant fields changed
  if (updatedTrade.exitPrice && updatedTrade.status === 'closed') {
    const entry = updatedTrade.entryPrice;
    const exit = updatedTrade.exitPrice;
    const qty = updatedTrade.quantity;
    const charges = updatedTrade.charges || 0;
    
    if (updatedTrade.tradeType === 'long') {
      updatedTrade.pnl = (exit - entry) * qty - charges;
      updatedTrade.pnlPercentage = ((exit - entry) / entry) * 100;
    } else {
      updatedTrade.pnl = (entry - exit) * qty - charges;
      updatedTrade.pnlPercentage = ((entry - exit) / entry) * 100;
    }
  }
  
  allTrades[tradeIndex] = updatedTrade;
  setToStorage(STORAGE_KEYS.TRADES, allTrades);
  
  return { success: true, trade: updatedTrade };
}

// Delete trade
export function deleteTrade(id: string): TradeResult {
  const user = getCurrentUser();
  if (!user) {
    return { success: false, error: 'Not logged in' };
  }
  
  const allTrades = getFromStorage<Trade[]>(STORAGE_KEYS.TRADES, []);
  const tradeIndex = allTrades.findIndex(t => t.id === id && t.userId === user.id);
  
  if (tradeIndex === -1) {
    return { success: false, error: 'Trade not found' };
  }
  
  const deletedTrade = allTrades.splice(tradeIndex, 1)[0];
  setToStorage(STORAGE_KEYS.TRADES, allTrades);
  
  return { success: true, trade: deletedTrade };
}

// Bulk delete trades
export function bulkDeleteTrades(ids: string[]): TradeResult {
  const user = getCurrentUser();
  if (!user) {
    return { success: false, error: 'Not logged in' };
  }
  
  const allTrades = getFromStorage<Trade[]>(STORAGE_KEYS.TRADES, []);
  const remainingTrades = allTrades.filter(
    t => !(ids.includes(t.id) && t.userId === user.id)
  );
  
  setToStorage(STORAGE_KEYS.TRADES, remainingTrades);
  
  return { success: true };
}

// Get trade statistics
export function getTradeStats() {
  const trades = getTrades();
  const closedTrades = trades.filter(t => t.status === 'closed' && t.exitPrice);
  
  // Calculate P&L for each closed trade (using helper function)
  const tradesWithPnL = closedTrades.map(t => ({
    ...t,
    calculatedPnl: calculateTradePnL(t)
  }));
  
  const totalTrades = tradesWithPnL.length;
  const winningTrades = tradesWithPnL.filter(t => t.calculatedPnl > 0);
  const losingTrades = tradesWithPnL.filter(t => t.calculatedPnl < 0);
  
  const totalPnl = tradesWithPnL.reduce((sum, t) => sum + t.calculatedPnl, 0);
  const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
  
  const avgWin = winningTrades.length > 0
    ? winningTrades.reduce((sum, t) => sum + t.calculatedPnl, 0) / winningTrades.length
    : 0;
  const avgLoss = losingTrades.length > 0
    ? Math.abs(losingTrades.reduce((sum, t) => sum + t.calculatedPnl, 0) / losingTrades.length)
    : 0;
  
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;
  
  const openTrades = trades.filter(t => t.status === 'open');
  
  return {
    totalTrades,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate,
    totalPnl,
    avgWin,
    avgLoss,
    profitFactor,
    openPositions: openTrades.length,
    openPnl: 0, // Open trades don't have realized P&L
    bestTrade: tradesWithPnL.length > 0 
      ? tradesWithPnL.reduce((max, t) => t.calculatedPnl > (max?.calculatedPnl || -Infinity) ? t : max, tradesWithPnL[0])
      : undefined,
    worstTrade: tradesWithPnL.length > 0
      ? tradesWithPnL.reduce((min, t) => t.calculatedPnl < (min?.calculatedPnl || Infinity) ? t : min, tradesWithPnL[0])
      : undefined,
  };
}

// Helper to calculate P&L for a trade (in case pnl field is missing)
function calculateTradePnL(trade: Trade): number {
  if (trade.pnl !== undefined) return trade.pnl;
  if (!trade.exitPrice || trade.status !== 'closed') return 0;
  
  const entry = trade.entryPrice;
  const exit = trade.exitPrice;
  const qty = trade.quantity;
  const charges = trade.charges || 0;
  
  if (trade.tradeType === 'long') {
    return (exit - entry) * qty - charges;
  } else {
    return (entry - exit) * qty - charges;
  }
}

// Get P&L curve data
export function getPnLCurve() {
  const trades = getTrades();
  const closedTrades = trades
    .filter(t => t.status === 'closed' && t.exitDate && t.exitPrice)
    .map(t => ({
      ...t,
      exitDate: new Date(t.exitDate!).toISOString().split('T')[0] // Normalize to YYYY-MM-DD
    }))
    .sort((a, b) => new Date(a.exitDate!).getTime() - new Date(b.exitDate!).getTime());
  
  // Group trades by date and sum P&L for each day
  const dailyPnL = new Map<string, number>();
  
  closedTrades.forEach(trade => {
    const date = trade.exitDate!; // Already normalized to YYYY-MM-DD
    const pnl = calculateTradePnL(trade);
    dailyPnL.set(date, (dailyPnL.get(date) || 0) + pnl);
  });
  
  // Convert to array and calculate cumulative
  let cumulative = 0;
  return Array.from(dailyPnL.entries())
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([date, pnl]) => {
      cumulative += pnl;
      return {
        date,
        pnl,
        cumulative,
      };
    });
}

// Get monthly P&L data for the last 6 months
export function getMonthlyPnL(): { month: string; pnl: number }[] {
  const trades = getTrades();
  const closedTrades = trades.filter(t => t.status === 'closed' && t.exitDate && t.exitPrice);
  
  // Get last 6 months
  const months: { month: string; pnl: number }[] = [];
  const now = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const monthName = monthDate.toLocaleDateString('en-IN', { month: 'short' });
    
    // Calculate P&L for this month
    const monthPnl = closedTrades
      .filter(trade => {
        const exitDate = new Date(trade.exitDate!);
        return exitDate >= monthDate && exitDate <= monthEnd;
      })
      .reduce((sum, trade) => sum + calculateTradePnL(trade), 0);
    
    months.push({ month: monthName, pnl: monthPnl });
  }
  
  return months;
}

// Get symbol analysis
export function getSymbolAnalysis() {
  const trades = getTrades();
  const closedTrades = trades.filter(t => t.status === 'closed' && t.exitPrice);
  
  const symbolMap = new Map<string, { trades: Trade[]; pnl: number }>();
  
  closedTrades.forEach(trade => {
    const tradePnl = calculateTradePnL(trade);
    const existing = symbolMap.get(trade.symbol) || { trades: [], pnl: 0 };
    existing.trades.push(trade);
    existing.pnl += tradePnl;
    symbolMap.set(trade.symbol, existing);
  });
  
  return Array.from(symbolMap.entries()).map(([symbol, data]) => {
    const winningTrades = data.trades.filter(t => calculateTradePnL(t) > 0);
    return {
      symbol,
      totalTrades: data.trades.length,
      winningTrades: winningTrades.length,
      totalPnl: data.pnl,
      winRate: (winningTrades.length / data.trades.length) * 100,
      avgPnl: data.pnl / data.trades.length,
    };
  }).sort((a, b) => b.totalPnl - a.totalPnl);
}

// Add demo trades for new users
export function addDemoTrades(): void {
  const user = getCurrentUser();
  if (!user) return;
  
  const existingTrades = getTrades();
  if (existingTrades.length > 0) {
    console.log('💾 [Storage] addDemoTrades: User already has trades, skipping');
    return; // Already has trades
  }
  
  // Check if there are orphan trades that should be claimed
  const allTrades = getFromStorage<Trade[]>(STORAGE_KEYS.TRADES, []);
  const orphanTrades = allTrades.filter(t => !t.userId || t.userId.startsWith('user_'));
  
  if (orphanTrades.length > 0) {
    console.log('💾 [Storage] addDemoTrades: Found', orphanTrades.length, 'orphan trades, claiming them');
    // Claim orphan trades for this user
    const updatedTrades = allTrades.map(t => {
      if (!t.userId || t.userId.startsWith('user_')) {
        return { ...t, userId: user.id };
      }
      return t;
    });
    setToStorage(STORAGE_KEYS.TRADES, updatedTrades);
    return;
  }
  
  console.log('💾 [Storage] addDemoTrades: Adding demo trades for new user');
  
  const demoTrades: Omit<Trade, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] = [
    {
      symbol: 'RELIANCE',
      exchange: 'NSE',
      segment: 'equity',
      tradeType: 'long',
      quantity: 10,
      entryPrice: 2450,
      exitPrice: 2520,
      entryDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      exitDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'closed',
      charges: 50,
      strategy: 'Breakout',
    },
    {
      symbol: 'TCS',
      exchange: 'NSE',
      segment: 'equity',
      tradeType: 'long',
      quantity: 5,
      entryPrice: 3800,
      exitPrice: 3750,
      entryDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      exitDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'closed',
      charges: 45,
      strategy: 'Swing',
    },
    {
      symbol: 'NIFTY24DEC21000CE',
      exchange: 'NFO',
      segment: 'options',
      tradeType: 'long',
      quantity: 50,
      entryPrice: 150,
      exitPrice: 220,
      entryDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      exitDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'closed',
      charges: 100,
      strategy: 'Momentum',
    },
    {
      symbol: 'INFY',
      exchange: 'NSE',
      segment: 'equity',
      tradeType: 'short',
      quantity: 20,
      entryPrice: 1850,
      exitPrice: 1820,
      entryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      exitDate: new Date().toISOString(),
      status: 'closed',
      charges: 40,
      strategy: 'Reversal',
    },
    {
      symbol: 'HDFCBANK',
      exchange: 'NSE',
      segment: 'equity',
      tradeType: 'long',
      quantity: 15,
      entryPrice: 1680,
      entryDate: new Date().toISOString(),
      status: 'open',
      strategy: 'Trend Following',
    },
  ];
  
  demoTrades.forEach(trade => createTrade(trade));
}
