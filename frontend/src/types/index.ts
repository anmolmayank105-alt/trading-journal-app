// User interface
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  currency: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    tradeAlerts: boolean;
    dailyReport: boolean;
  };
}

// Trade interfaces
export interface Trade {
  id: string;
  userId: string;
  symbol: string;
  exchange: string;
  segment: 'equity' | 'futures' | 'options';
  tradeType: 'long' | 'short';
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  stopLoss?: number;
  target?: number;
  entryDate: string;
  exitDate?: string;
  entryTime?: string;  // Optional entry time (HH:mm format)
  exitTime?: string;   // Optional exit time (HH:mm format)
  timeFrame?: string;
  status: 'open' | 'closed';
  pnl?: number;
  pnlPercentage?: number;
  riskRewardRatio?: number;
  charges?: number;
  entryBrokerage?: number;
  exitBrokerage?: number;
  strategy?: string;
  psychology?: string;
  mistake?: string;
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TradeFilter {
  symbol?: string;
  tradeType?: 'long' | 'short';
  segment?: 'equity' | 'futures' | 'options';
  status?: 'open' | 'closed';
  startDate?: string;
  endDate?: string;
  exitDate?: string;
  minPnl?: number;
  maxPnl?: number;
}

// Market interfaces
export interface StockQuote {
  symbol: string;
  exchange: string;
  ltp: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: string;
}

export interface MarketIndex {
  symbol: string;
  value: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
}

export interface Watchlist {
  id: string;
  userId: string;
  name: string;
  symbols: string[];
  createdAt: string;
}

// Broker interfaces
export interface BrokerConnection {
  id: string;
  userId: string;
  brokerId: string;
  brokerName: string;
  status: 'active' | 'inactive' | 'error';
  lastSync?: string;
  connectedAt: string;
  tradesImported: number;
}

// Analytics interfaces
export interface DashboardStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnl: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  openPositions: number;
  openPnl: number;
}

export interface PnLData {
  date: string;
  pnl: number;
  cumulative: number;
  symbol: string;
}

export interface SymbolAnalysis {
  symbol: string;
  totalTrades: number;
  winningTrades: number;
  totalPnl: number;
  winRate: number;
  avgPnl: number;
}
