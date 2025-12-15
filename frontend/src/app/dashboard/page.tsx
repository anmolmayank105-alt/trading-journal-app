'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getTrades, getTradeStats, getPnLCurve } from '@/lib/api/trades';
import { Trade } from '@/types';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
} from 'lucide-react';

// Dynamic import for charts component
const DashboardCharts = dynamic(
  () => import('../../components/DashboardCharts'),
  { 
    ssr: false, 
    loading: () => (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card"><div className="h-64 bg-slate-800/50 rounded-xl animate-pulse" /></div>
        <div className="card"><div className="h-64 bg-slate-800/50 rounded-xl animate-pulse" /></div>
      </div>
    )
  }
);

// Helper function to calculate P&L for a trade (in case pnl field is missing)
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

// Helper function to parse date string and return local date (handling timezone issues)
function parseTradeDate(dateStr: string): Date {
  if (dateStr.includes('T')) {
    // ISO format: 2025-12-04T00:00:00.000Z - parse and use local date parts
    const [datePart] = dateStr.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(year, month - 1, day);
  } else {
    // Simple date format: 2025-12-04
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
}

// Helper function to calculate weekly P&L from trades
function calculateWeeklyPnL(trades: Trade[]): { day: string; pnl: number }[] {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  
  // Get start of current week (Monday for trading week)
  const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const startOfWeek = new Date(today);
  // If today is Sunday, go back 6 days to last Monday
  // Otherwise, go back to this week's Monday
  const daysToSubtract = currentDay === 0 ? 6 : currentDay - 1;
  startOfWeek.setDate(today.getDate() - daysToSubtract);
  startOfWeek.setHours(0, 0, 0, 0);
  
  // End of week is today
  const endOfWeek = new Date(today);
  endOfWeek.setHours(23, 59, 59, 999);
  
  // Initialize weekly data with 0 for each day including weekend
  const weeklyData: { [key: string]: number } = {
    'Mon': 0,
    'Tue': 0,
    'Wed': 0,
    'Thu': 0,
    'Fri': 0,
    'Sat': 0,
    'Sun': 0,
  };
  
  // Get only closed trades with exit date (calculate P&L if not stored)
  const closedTrades = trades.filter(t => t.status === 'closed' && t.exitDate && t.exitPrice);
  
  // Calculate P&L for each day from closed trades this week
  closedTrades.forEach(trade => {
    const exitDate = parseTradeDate(trade.exitDate!.toString());
    
    // Compare dates (date only, no time)
    const exitTime = exitDate.getTime();
    const startTime = startOfWeek.getTime();
    const endTime = endOfWeek.getTime();
    
    // Check if exit date is within this week
    if (exitTime >= startTime && exitTime <= endTime) {
      const dayOfWeek = exitDate.getDay();
      const dayName = days[dayOfWeek];
      if (weeklyData.hasOwnProperty(dayName)) {
        const pnl = calculateTradePnL(trade);
        weeklyData[dayName] += pnl;
      }
    }
  });
  
  // Convert to array format for chart (all 7 days)
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
    day,
    pnl: Math.round(weeklyData[day] * 100) / 100,
  }));
}

// Helper function to calculate day-wise win rate
function calculateDayWiseWinRate(trades: Trade[]): { day: string; winRate: number; wins: number; losses: number; total: number }[] {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  // Initialize data for each day
  const dayStats: { [key: string]: { wins: number; losses: number; total: number } } = {
    'Mon': { wins: 0, losses: 0, total: 0 },
    'Tue': { wins: 0, losses: 0, total: 0 },
    'Wed': { wins: 0, losses: 0, total: 0 },
    'Thu': { wins: 0, losses: 0, total: 0 },
    'Fri': { wins: 0, losses: 0, total: 0 },
    'Sat': { wins: 0, losses: 0, total: 0 },
    'Sun': { wins: 0, losses: 0, total: 0 },
  };
  
  // Get only closed trades with exit date
  const closedTrades = trades.filter(t => t.status === 'closed' && t.exitDate && t.pnl !== undefined);
  
  // Calculate wins/losses for each day
  closedTrades.forEach(trade => {
    const exitDate = parseTradeDate(trade.exitDate!.toString());
    const dayOfWeek = exitDate.getDay();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = dayNames[dayOfWeek];
    
    if (dayStats.hasOwnProperty(dayName)) {
      dayStats[dayName].total++;
      if (trade.pnl && trade.pnl > 0) {
        dayStats[dayName].wins++;
      } else {
        dayStats[dayName].losses++;
      }
    }
  });
  
  // Convert to array format with win rate
  return days.map(day => ({
    day,
    winRate: dayStats[day].total > 0 ? (dayStats[day].wins / dayStats[day].total) * 100 : 0,
    wins: dayStats[day].wins,
    losses: dayStats[day].losses,
    total: dayStats[day].total,
  }));
}

// Stat Card Component
const StatCard = React.memo(({ 
  icon: Icon, 
  label, 
  value, 
  change, 
  positive,
  gradient,
  isDark
}: { 
  icon: React.ElementType;
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
  gradient: string;
  isDark: boolean;
}) => (
  <div className="stat-card min-w-[140px] sm:min-w-0">
    <div className="flex items-start justify-between">
      <div className={`p-2 sm:p-3 rounded-xl ${gradient}`}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
      </div>
      {change && (
        <div className={`flex items-center gap-1 text-xs sm:text-sm ${positive ? 'text-emerald-500' : 'text-red-500'}`}>
          {positive ? <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" /> : <ArrowDownRight className="w-3 h-3 sm:w-4 sm:h-4" />}
          {change}
        </div>
      )}
    </div>
    <div className="mt-3 sm:mt-4">
      <p className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
      <p className={`text-lg sm:text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
    </div>
  </div>
));
StatCard.displayName = 'StatCard';

// Trade Row Component
const TradeRow = React.memo(({ trade, isDark }: { trade: Trade; isDark: boolean }) => (
  <tr className="table-row">
    <td className="px-4 py-3">
      <div className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{trade.symbol}</div>
      <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{trade.exchange}</div>
    </td>
    <td className="px-4 py-3">
      <span className={`badge ${trade.tradeType === 'long' ? 'badge-success' : 'badge-danger'}`}>
        {trade.tradeType.toUpperCase()}
      </span>
    </td>
    <td className={`px-4 py-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{trade.quantity}</td>
    <td className={`px-4 py-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>₹{trade.entryPrice.toLocaleString()}</td>
    <td className="px-4 py-3">
      {trade.status === 'closed' && trade.pnl !== undefined ? (
        <span className={trade.pnl >= 0 ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : (isDark ? 'text-red-400' : 'text-red-600')}>
          {trade.pnl >= 0 ? '+' : ''}₹{trade.pnl.toLocaleString()}
        </span>
      ) : (
        <span className="badge badge-warning">OPEN</span>
      )}
    </td>
  </tr>
));
TradeRow.displayName = 'TradeRow';

export default function DashboardPage() {
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getTradeStats>> | null>(null);
  const [pnlCurve, setPnlCurve] = useState<Awaited<ReturnType<typeof getPnLCurve>>>([]);
  const [weeklyPnL, setWeeklyPnL] = useState<{ day: string; pnl: number }[]>([]);
  const [dayWiseWinRate, setDayWiseWinRate] = useState<{ day: string; winRate: number; wins: number; losses: number; total: number }[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load data
    const loadData = async () => {
      try {
        // ⚡ OPTIMIZATION: Parallel data loading for faster dashboard
        const [userTrades, pnlData] = await Promise.all([
          getTrades(),
          getPnLCurve()
        ]);
        
        setTrades(userTrades);
        console.log('📉 DASHBOARD P&L CURVE DATA:', pnlData.map(d => d.date).join(' | '));
        setPnlCurve(pnlData);
        
        // Calculate stats from trades directly (same as analytics)
        const closedTrades = userTrades.filter(t => t.status === 'closed' && t.pnl !== undefined);
        const winningTrades = closedTrades.filter(t => t.pnl && t.pnl > 0);
        const losingTrades = closedTrades.filter(t => t.pnl && t.pnl < 0);
        
        const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const totalWins = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));
        
        const calculatedStats = {
          totalTrades: userTrades.length,
          winningTrades: winningTrades.length,
          losingTrades: losingTrades.length,
          winRate: closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0,
          totalPnl: totalPnl,
          avgPnl: closedTrades.length > 0 ? totalPnl / closedTrades.length : 0,
          avgWin: winningTrades.length > 0 ? totalWins / winningTrades.length : 0,
          avgLoss: losingTrades.length > 0 ? totalLosses / losingTrades.length : 0,
          profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0,
          avgRiskReward: (() => {
            // Only include trades with valid R:R between 0 and 20 (filter out outliers)
            const tradesWithRR = closedTrades.filter(t => 
              t.riskRewardRatio !== undefined && 
              t.riskRewardRatio !== null && 
              t.riskRewardRatio > 0 &&
              t.riskRewardRatio <= 20  // Cap at 20 to filter out data entry errors
            );
            if (tradesWithRR.length === 0) return 0;
            return tradesWithRR.reduce((sum, t) => sum + (t.riskRewardRatio || 0), 0) / tradesWithRR.length;
          })(),
        };
        setStats(calculatedStats);
        
        const weekly = calculateWeeklyPnL(userTrades);
        setWeeklyPnL(weekly);
        
        const dayWise = calculateDayWiseWinRate(userTrades);
        setDayWiseWinRate(dayWise);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      }
    };
    loadData();
  }, []);

  // Format P&L curve data for chart
  const chartData = useMemo(() => {
    // Filter to last 3 months
    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    let filtered = pnlCurve.filter(item => new Date(item.date) >= threeMonthsAgo);
    
    // Sort by date to ensure chronological order
    const sortedData = [...filtered].sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    
    // ⚡ OPTIMIZATION: Sample data if too many points (>100) for better chart performance
    let sampledData = sortedData;
    if (sortedData.length > 100) {
      const step = Math.ceil(sortedData.length / 100);
      sampledData = sortedData.filter((_, i) => i % step === 0 || i === sortedData.length - 1);
    }
    
    // Format date for display: "3 Dec", "7 Nov", etc.
    const formatted = sampledData.map(item => {
      const date = new Date(item.date);
      return {
        ...item,
        date: `${date.getDate()} ${date.toLocaleString('en-US', { month: 'short' })}`,
      };
    });
    
    return formatted;
  }, [pnlCurve]);

  // Recent trades
  const recentTrades = useMemo(() => trades.slice(0, 5), [trades]);

  // Win/Loss data for pie chart
  const winLossData = useMemo(() => {
    const closedTrades = trades.filter(t => t.status === 'closed' && t.pnl !== undefined);
    const winning = closedTrades.filter(t => t.pnl && t.pnl > 0).length;
    const losing = closedTrades.filter(t => t.pnl && t.pnl <= 0).length;
    
    return [
      { name: 'Winning', value: winning, color: '#10b981' },
      { name: 'Losing', value: losing, color: '#ef4444' },
    ];
  }, [trades]);

  if (!mounted) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-800 rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-slate-800 rounded-2xl" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:gap-4">
          <div>
            <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Welcome back, {user?.name?.split(' ')[0]}! 👋
            </h1>
            <p className={`mt-1 text-sm sm:text-base ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Here&apos;s your trading performance overview</p>
          </div>
          <div className={`flex items-center gap-2 text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <Calendar className="w-4 h-4" />
            {new Date().toLocaleDateString('en-IN', { 
              weekday: 'short', 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })}
          </div>
        </div>

        {/* Stats Grid - Horizontal scroll on mobile */}
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 sm:overflow-visible">
          <div className="flex gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-5 sm:gap-4 min-w-max sm:min-w-0">
          <StatCard
            icon={DollarSign}
            label="Total P&L"
            value={stats ? `₹${stats.totalPnl?.toLocaleString() || '0'}` : '₹0'}
            change={stats?.totalPnl ? `${((stats.totalPnl / 100000) * 100).toFixed(1)}%` : undefined}
            positive={stats ? stats.totalPnl >= 0 : true}
            gradient="bg-gradient-to-br from-indigo-600 to-purple-600"
            isDark={isDark}
          />
          <StatCard
            icon={Target}
            label="Win Rate"
            value={stats ? `${(stats.winRate || 0).toFixed(1)}%` : '0%'}
            positive={(stats?.winRate || 0) >= 50}
            gradient="bg-gradient-to-br from-emerald-600 to-teal-600"
            isDark={isDark}
          />
          <StatCard
            icon={Activity}
            label="Total Trades"
            value={(stats?.totalTrades || 0).toString()}
            gradient="bg-gradient-to-br from-amber-600 to-orange-600"
            isDark={isDark}
          />
          <StatCard
            icon={stats?.totalPnl && stats.totalPnl >= 0 ? TrendingUp : TrendingDown}
            label="Profit Factor"
            value={stats?.profitFactor === Infinity ? '∞' : (stats?.profitFactor || 0).toFixed(2)}
            positive={(stats?.profitFactor || 0) >= 1}
            gradient="bg-gradient-to-br from-pink-600 to-rose-600"
            isDark={isDark}
          />
          <StatCard
            icon={Target}
            label="Avg R:R"
            value={stats?.avgRiskReward ? `1:${stats.avgRiskReward.toFixed(1)}` : '-'}
            positive={(stats?.avgRiskReward || 0) >= 1}
            gradient="bg-gradient-to-br from-cyan-600 to-blue-600"
            isDark={isDark}
          />
        </div>
        </div>

        {/* Charts Row */}
        <DashboardCharts pnlData={chartData} weeklyPnL={weeklyPnL} winLossData={winLossData} />

        {/* Day-wise Win Rate Analysis */}
        <div className="card">
          <h3 className={`text-base sm:text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Performance by Day of Week</h3>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-2 sm:grid sm:grid-cols-4 lg:grid-cols-7 sm:gap-4 min-w-max sm:min-w-0">
            {dayWiseWinRate.map(({ day, winRate, wins, losses, total }) => {
              const isPositive = winRate >= 50;
              return (
                <div key={day} className={`card min-w-[80px] sm:min-w-0 p-3 sm:p-4 ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
                  <div className="text-center">
                    <div className={`text-xs sm:text-sm font-medium mb-1 sm:mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{day}</div>
                    <div className={`text-lg sm:text-2xl font-bold mb-1 sm:mb-2 ${
                      total === 0 ? (isDark ? 'text-slate-500' : 'text-slate-400') :
                      isPositive ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {total === 0 ? '-' : `${winRate.toFixed(0)}%`}
                    </div>
                    {total > 0 && (
                      <>
                        <div className={`w-full rounded-full h-1.5 sm:h-2 mb-1 sm:mb-2 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`}>
                          <div
                            className={`h-1.5 sm:h-2 rounded-full ${
                              isPositive ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${winRate}%` }}
                          />
                        </div>
                        <div className={`text-[10px] sm:text-xs ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                          {wins}W / {losses}L
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        </div>

        {/* Recent Trades */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-base sm:text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Recent Trades</h3>
            <a href="/trades" className={`text-xs sm:text-sm transition-colors ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-500'}`}>
              View all →
            </a>
          </div>
          
          {recentTrades.length > 0 ? (
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className={`text-left text-sm border-b ${isDark ? 'text-slate-400 border-white/5' : 'text-slate-500 border-slate-200'}`}>
                    <th className="px-4 py-3 font-medium">Symbol</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Qty</th>
                    <th className="px-4 py-3 font-medium">Entry</th>
                    <th className="px-4 py-3 font-medium">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.map(trade => (
                    <TradeRow key={trade.id} trade={trade} isDark={isDark} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={`py-12 text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No trades yet</p>
              <a href="/trades" className="btn-primary inline-flex items-center gap-2 mt-4">
                Add Your First Trade
              </a>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
