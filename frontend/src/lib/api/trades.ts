// Trades API service - connects to backend trade-service (MongoDB only)
import axios from 'axios';
import { getAccessToken, parseApiError } from './client';
import { Trade, TradeFilter } from '@/types';

// Create separate axios instance for trade service
const TRADE_API_URL = process.env.NEXT_PUBLIC_TRADE_API_URL || 'http://localhost:3003/api/v1';

const tradeApiClient = axios.create({
  baseURL: TRADE_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
  withCredentials: true,
});

// Add auth token to requests
tradeApiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface TradeResult {
  success: boolean;
  trade?: Trade;
  trades?: Trade[];
  error?: string;
}

// Convert API trade to frontend trade format
function mapApiTrade(apiTrade: any): Trade {
  // Extract P&L safely - handle both object and number formats
  let pnl = 0;
  if (typeof apiTrade.pnl === 'number') {
    pnl = apiTrade.pnl;
  } else if (apiTrade.pnl && typeof apiTrade.pnl === 'object') {
    // Use gross for calculations (net includes charges which are tracked separately)
    pnl = apiTrade.pnl.gross || 0;
  }
  
  return {
    id: apiTrade._id || apiTrade.id,
    userId: apiTrade.userId,
    symbol: apiTrade.symbol,
    exchange: apiTrade.exchange,
    segment: apiTrade.segment || 'equity',
    tradeType: apiTrade.position || apiTrade.tradeType,
    quantity: apiTrade.entry?.quantity || apiTrade.quantity || 0,
    entryPrice: apiTrade.entry?.price || apiTrade.entryPrice || 0,
    exitPrice: apiTrade.exit?.price || apiTrade.exitPrice,
    entryDate: apiTrade.entry?.timestamp || apiTrade.entryDate,
    exitDate: apiTrade.exit?.timestamp || apiTrade.exitDate,
    entryTime: apiTrade.entryTime,
    exitTime: apiTrade.exitTime,
    timeFrame: apiTrade.timeFrame,
    status: apiTrade.status,
    pnl: pnl,
    pnlPercentage: apiTrade.pnl?.percentage || apiTrade.pnl?.percentageGain || apiTrade.pnlPercentage,
    charges: apiTrade.pnl?.charges || apiTrade.charges || 0,
    stopLoss: apiTrade.stopLoss,
    target: apiTrade.target,
    riskRewardRatio: apiTrade.riskRewardRatio,
    strategy: apiTrade.strategy,
    psychology: apiTrade.psychology,
    mistake: apiTrade.mistake,
    notes: apiTrade.notes,
    tags: apiTrade.tags || [],
    createdAt: apiTrade.createdAt,
    updatedAt: apiTrade.updatedAt,
  };
}

// Convert frontend trade to API format
function mapTradeToApi(trade: Partial<Trade>): any {
  const apiData: any = {
    symbol: trade.symbol,
    exchange: trade.exchange || 'NSE',
    segment: trade.segment || 'equity',
    tradeType: trade.tradeType === 'long' || trade.tradeType === 'short' ? 'intraday' : trade.tradeType,
    position: trade.tradeType === 'long' || trade.tradeType === 'short' ? trade.tradeType : 'long',
    quantity: trade.quantity,
    entryPrice: trade.entryPrice,
    entryTimestamp: trade.entryDate || new Date().toISOString(),
    stopLoss: trade.stopLoss,
    target: trade.target,
    strategy: trade.strategy,
    notes: trade.notes,
    tags: trade.tags || [],
    brokerage: 0,
  };

  // Include optional fields if they exist
  if (trade.exitPrice !== undefined) apiData.exitPrice = trade.exitPrice;
  if (trade.exitTime !== undefined) apiData.exitTimestamp = trade.exitTime;
  if (trade.status !== undefined) apiData.status = trade.status;
  if (trade.psychology !== undefined) apiData.psychology = trade.psychology;
  if (trade.mistake !== undefined) apiData.mistake = trade.mistake;
  if (trade.riskRewardRatio !== undefined) apiData.riskRewardRatio = trade.riskRewardRatio;
  if (trade.timeFrame !== undefined) apiData.timeFrame = trade.timeFrame;

  return apiData;
}

// Get user's trades
export async function getTrades(filters?: TradeFilter): Promise<Trade[]> {
  try {
    const params: Record<string, string> = {};
    if (filters?.symbol) params.symbol = filters.symbol;
    if (filters?.status) params.status = filters.status;
    if (filters?.startDate) params.from = filters.startDate;
    if (filters?.endDate) params.to = filters.endDate;
    if (filters?.exitDate) params.exitDate = filters.exitDate;
    if (filters?.tradeType) params.position = filters.tradeType;
    if (filters?.segment) params.segment = filters.segment;
    
    const response = await tradeApiClient.get<{ success: boolean; data: any[] }>('/trades', { params });
    return response.data.data.map(mapApiTrade);
  } catch (error) {
    console.error('Failed to fetch trades:', parseApiError(error).message);
    throw new Error('Backend is not available. Please start the trade service.');
  }
}

// Get single trade
export async function getTradeById(id: string): Promise<Trade | null> {
  try {
    const response = await tradeApiClient.get<{ success: boolean; data: any }>(`/trades/${id}`);
    return mapApiTrade(response.data.data);
  } catch (error) {
    console.error('Failed to fetch trade:', parseApiError(error).message);
    return null;
  }
}

// Create new trade
export async function createTrade(
  tradeData: Omit<Trade, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<TradeResult> {
  try {
    const apiData = mapTradeToApi(tradeData);
    console.log('🚀 Creating trade with data:', apiData);
    const response = await tradeApiClient.post<{ success: boolean; data: any }>('/trades', apiData);
    console.log('✅ Trade created successfully:', response.data);
    return { success: true, trade: mapApiTrade(response.data.data) };
  } catch (error: any) {
    console.error('❌ Failed to create trade:', error);
    console.error('❌ Error response:', error.response?.data);
    const errMsg = parseApiError(error).message;
    console.error('Failed to create trade:', errMsg);
    return { success: false, error: errMsg };
  }
}

// Update trade
export async function updateTrade(id: string, updates: Partial<Trade>): Promise<TradeResult> {
  try {
    const response = await tradeApiClient.put<{ success: boolean; data: any }>(`/trades/${id}`, mapTradeToApi(updates));
    return { success: true, trade: mapApiTrade(response.data.data) };
  } catch (error) {
    const errMsg = parseApiError(error).message;
    console.error('Failed to update trade:', errMsg);
    return { success: false, error: errMsg };
  }
}

// Delete trade
export async function deleteTrade(id: string): Promise<TradeResult> {
  try {
    await tradeApiClient.delete(`/trades/${id}`);
    return { success: true };
  } catch (error) {
    const errMsg = parseApiError(error).message;
    console.error('Failed to delete trade:', errMsg);
    return { success: false, error: errMsg };
  }
}

// Bulk delete trades
export async function bulkDeleteTrades(ids: string[]): Promise<TradeResult> {
  try {
    await Promise.all(ids.map(id => tradeApiClient.delete(`/trades/${id}`)));
    return { success: true };
  } catch (error) {
    const errMsg = parseApiError(error).message;
    console.error('Failed to bulk delete trades:', errMsg);
    return { success: false, error: errMsg };
  }
}

// Get trade statistics
export async function getTradeStats() {
  try {
    const response = await tradeApiClient.get<{ success: boolean; data: any }>('/trades/summary');
    return response.data.data || {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalPnl: 0,
      avgPnl: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
    };
  } catch (error) {
    console.error('Failed to fetch trade stats:', parseApiError(error).message);
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalPnl: 0,
      avgPnl: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
    };
  }
}

// Get P&L curve data
export async function getPnLCurve() {
  try {
    const trades = await getTrades();
    const closedTrades = trades
      .filter(t => t.status === 'closed' && t.exitDate)
      .map(t => ({
        ...t,
        exitDate: new Date(t.exitDate!).toISOString().split('T')[0] // Normalize to YYYY-MM-DD
      }))
      .sort((a, b) => new Date(a.exitDate!).getTime() - new Date(b.exitDate!).getTime());
    
    // Group trades by date and sum P&L for each day
    const dailyPnL = new Map<string, number>();
    
    closedTrades.forEach(trade => {
      const date = trade.exitDate!; // Already normalized to YYYY-MM-DD
      const pnl = trade.pnl || 0;
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
  } catch {
    return [];
  }
}

// Get symbol analysis
export async function getSymbolAnalysis() {
  try {
    const trades = await getTrades();
    const symbolMap = new Map<string, { trades: number; pnl: number; wins: number }>();
    
    trades.filter(t => t.status === 'closed').forEach(trade => {
      const existing = symbolMap.get(trade.symbol) || { trades: 0, pnl: 0, wins: 0 };
      existing.trades++;
      existing.pnl += trade.pnl || 0;
      if ((trade.pnl || 0) > 0) existing.wins++;
      symbolMap.set(trade.symbol, existing);
    });
    
    return Array.from(symbolMap.entries())
      .map(([symbol, data]) => ({
        symbol,
        trades: data.trades,
        pnl: data.pnl,
        winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
      }))
      .sort((a, b) => b.pnl - a.pnl);
  } catch {
    return [];
  }
}

// Get open trades
export async function getOpenTrades(): Promise<Trade[]> {
  try {
    const response = await tradeApiClient.get<{ success: boolean; data: any[] }>('/trades/open');
    return response.data.data.map(mapApiTrade);
  } catch (error) {
    console.error('Failed to fetch open trades:', parseApiError(error).message);
    return [];
  }
}

// Exit trade
export async function exitTrade(
  id: string, 
  exitPrice: number, 
  exitDate?: string
): Promise<TradeResult> {
  try {
    const response = await tradeApiClient.post<{ success: boolean; data: any }>(`/trades/${id}/exit`, {
      exitPrice,
      exitTimestamp: exitDate || new Date().toISOString(),
    });
    return { success: true, trade: mapApiTrade(response.data.data) };
  } catch (error) {
    const errMsg = parseApiError(error).message;
    console.error('Failed to exit trade:', errMsg);
    return { success: false, error: errMsg };
  }
}

// Get monthly P&L data
export async function getMonthlyPnL(): Promise<{ month: string; pnl: number }[]> {
  try {
    const trades = await getTrades();
    const monthlyMap = new Map<string, number>();
    
    trades.filter(t => t.status === 'closed' && t.exitDate).forEach(trade => {
      const date = new Date(trade.exitDate!);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const current = monthlyMap.get(monthKey) || 0;
      monthlyMap.set(monthKey, current + (trade.pnl || 0));
    });
    
    return Array.from(monthlyMap.entries())
      .map(([month, pnl]) => ({ month, pnl }))
      .sort((a, b) => a.month.localeCompare(b.month));
  } catch {
    return [];
  }
}

// Get strategy analytics
export async function getStrategyAnalytics(period: string = 'ALL'): Promise<any[]> {
  try {
    console.log('📊 Fetching strategy analytics for period:', period);
    const response = await tradeApiClient.get<{ success: boolean; data: any[] }>(
      `/trades/analytics/strategy?period=${period}`
    );
    console.log('✅ Strategy analytics received:', response.data.data?.length || 0, 'strategies');
    return response.data.data || [];
  } catch (error) {
    console.error('❌ Failed to fetch strategy analytics:', parseApiError(error).message);
    return [];
  }
}

// Get mistake analytics
export async function getMistakeAnalytics(period: string = 'ALL'): Promise<any[]> {
  try {
    console.log('📊 Fetching mistake analytics for period:', period);
    const response = await tradeApiClient.get<{ success: boolean; data: any[] }>(
      `/trades/analytics/mistakes?period=${period}`
    );
    console.log('✅ Mistake analytics received:', response.data.data?.length || 0, 'mistakes');
    return response.data.data || [];
  } catch (error) {
    console.error('❌ Failed to fetch mistake analytics:', parseApiError(error).message);
    return [];
  }
}

// Get daily P&L data for calendar view
export async function getDailyPnL(year?: number, month?: number) {
  try {
    const trades = await getTrades();
    const closedTrades = trades.filter(t => t.status === 'closed' && t.exitDate && t.pnl !== undefined);
    
    // Group trades by date and sum P&L
    const dailyPnLMap = new Map<string, { pnl: number; tradeCount: number }>();
    
    closedTrades.forEach(trade => {
      const date = new Date(trade.exitDate!);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Filter by year and month if provided
      if (year !== undefined && date.getFullYear() !== year) return;
      if (month !== undefined && date.getMonth() !== month) return;
      
      const existing = dailyPnLMap.get(dateStr) || { pnl: 0, tradeCount: 0 };
      dailyPnLMap.set(dateStr, {
        pnl: existing.pnl + (trade.pnl || 0),
        tradeCount: existing.tradeCount + 1,
      });
    });
    
    // Convert to array
    return Array.from(dailyPnLMap.entries()).map(([date, data]) => ({
      date,
      pnl: data.pnl,
      tradeCount: data.tradeCount,
    }));
  } catch {
    return [];
  }
}
