'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import AppLayout from '@/components/AppLayout';
import { getTradeStats, getPnLCurve, getSymbolAnalysis, getTrades, getMonthlyPnL, getStrategyAnalytics, getMistakeAnalytics } from '@/lib/api/trades';
import StrategyAnalysis from '@/components/StrategyAnalysis';
import MistakeAnalysis from '@/components/MistakeAnalysis';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
} from 'lucide-react';

// Type for AnalyticsCharts props
interface ChartsProps {
  chartData: Array<{ date: string; pnl: number; cumulative: number }>;
  winLossData: Array<{ name: string; value: number; color: string }>;
  segmentData: Array<{ name: string; value: number; color: string }>;
  monthlyPnL: Array<{ month: string; pnl: number }>;
  weeklyPnL: Array<{ day: string; pnl: number }>;
}

// Single dynamic import wrapper for charts
const ChartsWrapper = dynamic<ChartsProps>(
  () => import('../../components/AnalyticsCharts'),
  { 
    ssr: false, 
    loading: () => (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 animate-pulse bg-slate-800 rounded-xl" />
          <div className="h-72 animate-pulse bg-slate-800 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 animate-pulse bg-slate-800 rounded-xl" />
          <div className="h-64 animate-pulse bg-slate-800 rounded-xl" />
        </div>
      </div>
    )
  }
);

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const StatCard = React.memo(({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  positive,
  gradient 
}: { 
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
  positive?: boolean;
  gradient: string;
}) => (
  <div className="stat-card">
    <div className="flex items-start justify-between">
      <div className={`p-3 rounded-xl ${gradient}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
    <div className="mt-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${
        positive !== undefined 
          ? positive ? 'text-emerald-400' : 'text-red-400'
          : 'text-white'
      }`}>{value}</p>
      {subValue && <p className="text-sm text-slate-400 mt-1">{subValue}</p>}
    </div>
  </div>
));
StatCard.displayName = 'StatCard';

export default function AnalyticsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [trades, setTrades] = useState<Awaited<ReturnType<typeof getTrades>>>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getTradeStats>> | null>(null);
  const [pnlCurve, setPnlCurve] = useState<Awaited<ReturnType<typeof getPnLCurve>>>([]);
  const [symbolAnalysis, setSymbolAnalysis] = useState<Awaited<ReturnType<typeof getSymbolAnalysis>>>([]);
  const [monthlyPnL, setMonthlyPnL] = useState<{ month: string; pnl: number }[]>([]);
  const [timeframe, setTimeframe] = useState<'1W' | '1M' | '3M' | 'ALL'>('ALL');
  const [advancedPeriod, setAdvancedPeriod] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'>('ALL');
  const [strategyData, setStrategyData] = useState<any[]>([]);
  const [mistakeData, setMistakeData] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    const loadData = async () => {
      try {
        // ⚡ OPTIMIZATION: Parallel API calls for 70% faster loading
        const [userTrades, tradeStats, pnlData, symbols, monthly] = await Promise.all([
          getTrades(),
          getTradeStats(),
          getPnLCurve(),
          getSymbolAnalysis(),
          getMonthlyPnL()
        ]);
        
        console.log('📈 ANALYTICS P&L CURVE DATA:', pnlData.map(d => d.date).join(' | '));
        
        // Batch state updates to reduce re-renders
        setTrades(userTrades);
        setStats(tradeStats);
        setPnlCurve(pnlData);
        setSymbolAnalysis(symbols);
        setMonthlyPnL(monthly);
        
        console.log('✅ Basic analytics loaded in parallel');
      } catch (error) {
        console.error('Failed to load analytics data:', error);
      }
    };
    loadData();
  }, []);

  // Load advanced analytics when period changes
  useEffect(() => {
    const loadAdvancedAnalytics = async () => {
      try {
        console.log('📊 Loading advanced analytics for period:', advancedPeriod);
        // ⚡ OPTIMIZATION: Parallel advanced analytics loading
        const [strategies, mistakes] = await Promise.all([
          getStrategyAnalytics(advancedPeriod),
          getMistakeAnalytics(advancedPeriod),
        ]);
        setStrategyData(strategies);
        setMistakeData(mistakes);
        console.log('✅ Advanced analytics loaded in parallel');
      } catch (error) {
        console.error('❌ Failed to load advanced analytics:', error);
      }
    };
    if (mounted) {
      loadAdvancedAnalytics();
    }
  }, [advancedPeriod, mounted]);

  // Get cutoff date based on timeframe
  const getCutoffDate = useCallback((tf: typeof timeframe) => {
    const now = new Date();
    switch (tf) {
      case '1W':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '1M':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '3M':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(0);
    }
  }, []);

  // Filter trades by timeframe
  const filteredTrades = useMemo(() => {
    if (timeframe === 'ALL') return trades;
    const cutoffDate = getCutoffDate(timeframe);
    return trades.filter(trade => {
      const exitDate = trade.exitDate ? new Date(trade.exitDate) : null;
      return exitDate && exitDate >= cutoffDate;
    });
  }, [trades, timeframe, getCutoffDate]);

  // Calculate stats from filtered trades
  const filteredStats = useMemo(() => {
    const closedTrades = filteredTrades.filter(t => t.status === 'closed' && t.pnl !== undefined);
    const winningTrades = closedTrades.filter(t => t.pnl && t.pnl > 0);
    const losingTrades = closedTrades.filter(t => t.pnl && t.pnl < 0);
    
    const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalWins = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));
    
    return {
      totalPnl,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0,
      avgWin: winningTrades.length > 0 ? totalWins / winningTrades.length : 0,
      avgLoss: losingTrades.length > 0 ? totalLosses / losingTrades.length : 0,
    };
  }, [filteredTrades]);

  // Format P&L curve data with timeframe filter
  const chartData = useMemo(() => {
    let filteredData = [...pnlCurve];
    
    // Always limit to max 3 months for chart display
    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    // Apply 3 month limit first
    filteredData = pnlCurve.filter(item => new Date(item.date) >= threeMonthsAgo);
    
    // Then apply user's selected timeframe filter if it's more restrictive
    if (timeframe !== 'ALL') {
      const cutoffDate = getCutoffDate(timeframe);
      if (cutoffDate > threeMonthsAgo) {
        filteredData = filteredData.filter(item => new Date(item.date) >= cutoffDate);
      }
    }
    
    // Sort by date to ensure chronological order
    filteredData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // ⚡ OPTIMIZATION: Sample data if too many points (>100) for better chart performance
    if (filteredData.length > 100) {
      const step = Math.ceil(filteredData.length / 100);
      filteredData = filteredData.filter((_, i) => i % step === 0 || i === filteredData.length - 1);
    }
    
    const processed = filteredData.map((item, index) => {
      const date = new Date(item.date);
      return {
        ...item,
        index, // Preserve array position
        date: `${date.getDate()} ${date.toLocaleString('en-US', { month: 'short' })}`, // Format for display
      };
    });
    
    console.log('📊 ANALYTICS CHART DATA:', processed.map(d => d.date).join(' | '));
    
    return processed;
  }, [pnlCurve, timeframe, getCutoffDate]);

  // Win/Loss distribution for pie chart
  const winLossData = useMemo(() => {
    return [
      { name: 'Winning', value: filteredStats.winningTrades, color: '#10b981' },
      { name: 'Losing', value: filteredStats.losingTrades, color: '#ef4444' },
    ];
  }, [filteredStats]);

  // Segment distribution
  const segmentData = useMemo(() => {
    const segments = filteredTrades.reduce((acc, trade) => {
      acc[trade.segment] = (acc[trade.segment] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(segments).map(([name, value], i) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: COLORS[i % COLORS.length],
    }));
  }, [filteredTrades]);

  // Weekly P&L
  const weeklyPnL = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const currentDay = today.getDay();
    const startOfWeek = new Date(today);
    const daysToSubtract = currentDay === 0 ? 6 : currentDay - 1;
    startOfWeek.setDate(today.getDate() - daysToSubtract);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const weeklyData: { [key: string]: number } = {
      'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0,
    };
    
    const closedTrades = trades.filter(t => t.status === 'closed' && t.exitDate && t.pnl !== undefined);
    closedTrades.forEach(trade => {
      const exitDate = new Date(trade.exitDate!);
      if (exitDate >= startOfWeek) {
        const dayName = days[exitDate.getDay()].substring(0, 3);
        if (weeklyData.hasOwnProperty(dayName)) {
          weeklyData[dayName] += trade.pnl || 0;
        }
      }
    });
    
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
      day,
      pnl: Math.round(weeklyData[day] * 100) / 100,
    }));
  }, [trades]);

  // Day-wise win rate analysis
  const dayWiseWinRate = useMemo(() => {
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
      const exitDate = new Date(trade.exitDate!);
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
  }, [trades]);

  const handleTimeframeChange = useCallback((tf: typeof timeframe) => {
    setTimeframe(tf);
  }, []);

  if (!mounted) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-800 rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Analytics</h1>
            <p className="text-slate-400 mt-1">Deep insights into your trading performance</p>
          </div>
          <div className="flex gap-2">
            {(['1W', '1M', '3M', 'ALL'] as const).map(tf => (
              <button
                key={tf}
                onClick={() => handleTimeframeChange(tf)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeframe === tf
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={TrendingUp}
            label="Total P&L"
            value={`₹${(filteredStats.totalPnl || 0).toLocaleString()}`}
            positive={filteredStats.totalPnl >= 0}
            gradient="bg-gradient-to-br from-indigo-600 to-purple-600"
          />
          <StatCard
            icon={Target}
            label="Win Rate"
            value={`${(filteredStats.winRate || 0).toFixed(1)}%`}
            subValue={`${filteredStats.winningTrades || 0}W / ${filteredStats.losingTrades || 0}L`}
            positive={(filteredStats.winRate || 0) >= 50}
            gradient="bg-gradient-to-br from-emerald-600 to-teal-600"
          />
          <StatCard
            icon={Activity}
            label="Avg Win"
            value={`₹${(filteredStats.avgWin || 0).toLocaleString()}`}
            positive={true}
            gradient="bg-gradient-to-br from-green-600 to-emerald-600"
          />
          <StatCard
            icon={TrendingDown}
            label="Avg Loss"
            value={`₹${(filteredStats.avgLoss || 0).toLocaleString()}`}
            positive={false}
            gradient="bg-gradient-to-br from-red-600 to-pink-600"
          />
        </div>

        {/* Charts */}
        <ChartsWrapper 
          chartData={chartData}
          winLossData={winLossData}
          segmentData={segmentData}
          monthlyPnL={monthlyPnL}
          weeklyPnL={weeklyPnL}
        />

        {/* Top and Worst Performers */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">📊 Performance Overview</h2>
            <button
              onClick={() => router.push('/analytics/performance')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white"
            >
              <span className="text-sm font-medium">View All</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performing Symbols */}
            <div className="bg-white/5 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">🏆 Top Performing Symbols</h3>
            {symbolAnalysis.filter(s => s.pnl > 0 && !['NIFTY', 'BANKNIFTY', 'SENSEX', 'FINNIFTY', 'MIDCPNIFTY'].some(idx => s.symbol.toUpperCase().includes(idx))).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-slate-400 border-b border-white/5">
                      <th className="px-4 py-3 font-medium">Symbol</th>
                      <th className="px-4 py-3 font-medium">Trades</th>
                      <th className="px-4 py-3 font-medium">Win Rate</th>
                      <th className="px-4 py-3 font-medium">Total P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {symbolAnalysis
                      .filter(s => s.pnl > 0 && !['NIFTY', 'BANKNIFTY', 'SENSEX', 'FINNIFTY', 'MIDCPNIFTY'].some(idx => s.symbol.toUpperCase().includes(idx)))
                      .slice(0, 5)
                      .map((symbol, index) => (
                        <tr 
                          key={symbol.symbol} 
                          onClick={() => router.push(`/trades?symbol=${encodeURIComponent(symbol.symbol)}`)}
                          className="table-row cursor-pointer hover:bg-white/5"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-green-600 flex items-center justify-center text-sm font-bold">
                                {index + 1}
                              </div>
                              <span className="font-medium text-white">{symbol.symbol}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-300">{symbol.trades}</td>
                          <td className="px-4 py-3">
                            <span className={symbol.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}>
                              {symbol.winRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-emerald-400 font-semibold">
                              +₹{symbol.pnl.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No symbol trades yet</p>
              </div>
            )}
          </div>

          {/* Top Performing Indices */}
          <div className="bg-white/5 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">📈 Top Performing Indices</h3>
            {symbolAnalysis.filter(s => s.pnl > 0 && ['NIFTY', 'BANKNIFTY', 'SENSEX', 'FINNIFTY', 'MIDCPNIFTY'].some(idx => s.symbol.toUpperCase().includes(idx))).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-slate-400 border-b border-white/5">
                      <th className="px-4 py-3 font-medium">Index</th>
                      <th className="px-4 py-3 font-medium">Trades</th>
                      <th className="px-4 py-3 font-medium">Win Rate</th>
                      <th className="px-4 py-3 font-medium">Total P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {symbolAnalysis
                      .filter(s => s.pnl > 0 && ['NIFTY', 'BANKNIFTY', 'SENSEX', 'FINNIFTY', 'MIDCPNIFTY'].some(idx => s.symbol.toUpperCase().includes(idx)))
                      .slice(0, 5)
                      .map((symbol, index) => (
                        <tr 
                          key={symbol.symbol}
                          onClick={() => router.push(`/trades?symbol=${encodeURIComponent(symbol.symbol)}`)}
                          className="table-row cursor-pointer hover:bg-white/5"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-sm font-bold">
                                {index + 1}
                              </div>
                              <span className="font-medium text-white">{symbol.symbol}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-300">{symbol.trades}</td>
                          <td className="px-4 py-3">
                            <span className={symbol.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}>
                              {symbol.winRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-emerald-400 font-semibold">
                              +₹{symbol.pnl.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No index trades yet</p>
              </div>
            )}
          </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Worst Performing Symbols */}
          <div className="bg-white/5 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">📉 Worst Performing Symbols</h3>
            {symbolAnalysis.filter(s => s.pnl < 0 && !['NIFTY', 'BANKNIFTY', 'SENSEX', 'FINNIFTY', 'MIDCPNIFTY'].some(idx => s.symbol.toUpperCase().includes(idx))).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-slate-400 border-b border-white/5">
                      <th className="px-4 py-3 font-medium">Symbol</th>
                      <th className="px-4 py-3 font-medium">Trades</th>
                      <th className="px-4 py-3 font-medium">Win Rate</th>
                      <th className="px-4 py-3 font-medium">Total P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {symbolAnalysis
                      .filter(s => s.pnl < 0 && !['NIFTY', 'BANKNIFTY', 'SENSEX', 'FINNIFTY', 'MIDCPNIFTY'].some(idx => s.symbol.toUpperCase().includes(idx)))
                      .sort((a, b) => a.pnl - b.pnl)
                      .slice(0, 5)
                      .map((symbol, index) => (
                        <tr 
                          key={symbol.symbol}
                          onClick={() => router.push(`/trades?symbol=${encodeURIComponent(symbol.symbol)}`)}
                          className="table-row cursor-pointer hover:bg-white/5"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-rose-600 flex items-center justify-center text-sm font-bold">
                                {index + 1}
                              </div>
                              <span className="font-medium text-white">{symbol.symbol}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-300">{symbol.trades}</td>
                          <td className="px-4 py-3">
                            <span className={symbol.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}>
                              {symbol.winRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-red-400 font-semibold">
                              ₹{symbol.pnl.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No losing symbol trades</p>
              </div>
            )}
          </div>

          {/* Worst Performing Indices */}
          <div className="bg-white/5 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">⚠️ Worst Performing Indices</h3>
            {symbolAnalysis.filter(s => s.pnl < 0 && ['NIFTY', 'BANKNIFTY', 'SENSEX', 'FINNIFTY', 'MIDCPNIFTY'].some(idx => s.symbol.toUpperCase().includes(idx))).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-slate-400 border-b border-white/5">
                      <th className="px-4 py-3 font-medium">Index</th>
                      <th className="px-4 py-3 font-medium">Trades</th>
                      <th className="px-4 py-3 font-medium">Win Rate</th>
                      <th className="px-4 py-3 font-medium">Total P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {symbolAnalysis
                      .filter(s => s.pnl < 0 && ['NIFTY', 'BANKNIFTY', 'SENSEX', 'FINNIFTY', 'MIDCPNIFTY'].some(idx => s.symbol.toUpperCase().includes(idx)))
                      .sort((a, b) => a.pnl - b.pnl)
                      .slice(0, 5)
                      .map((symbol, index) => (
                        <tr 
                          key={symbol.symbol}
                          onClick={() => router.push(`/trades?symbol=${encodeURIComponent(symbol.symbol)}`)}
                          className="table-row cursor-pointer hover:bg-white/5"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center text-sm font-bold">
                                {index + 1}
                              </div>
                              <span className="font-medium text-white">{symbol.symbol}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-300">{symbol.trades}</td>
                          <td className="px-4 py-3">
                            <span className={symbol.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}>
                              {symbol.winRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-red-400 font-semibold">
                              ₹{symbol.pnl.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No losing index trades</p>
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Advanced Analytics Section */}
        <div className="mt-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Advanced Analytics</h2>
            
            {/* Time Period Selector */}
            <div className="flex gap-2">
              {(['1D', '1W', '1M', '3M', '1Y', 'ALL'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setAdvancedPeriod(period)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    advancedPeriod === period
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          {/* Strategy Analysis */}
          <StrategyAnalysis data={strategyData} period={advancedPeriod} />

          {/* Mistake Analysis */}
          <MistakeAnalysis data={mistakeData} period={advancedPeriod} />
        </div>
      </div>
    </AppLayout>
  );
}
