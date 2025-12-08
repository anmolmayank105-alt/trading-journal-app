'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { getTrades } from '@/lib/api/trades';
import { Trade } from '@/types';
import { ArrowLeft } from 'lucide-react';

export default function PerformancePage() {
  const router = useRouter();
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'symbols' | 'indices' | 'top-symbols' | 'top-indices' | 'worst-symbols' | 'worst-indices'>('all');
  const [timePeriod, setTimePeriod] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'>('ALL');

  const loadTrades = useCallback(async () => {
    try {
      const userTrades = await getTrades();
      setAllTrades(userTrades);
    } catch (error) {
      console.error('Failed to load trades:', error);
      setAllTrades([]);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadTrades();
  }, [loadTrades]);

  // Get cutoff date based on timeframe
  const getCutoffDate = (period: typeof timePeriod) => {
    const now = new Date();
    switch (period) {
      case '1D':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '1W':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '1M':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '3M':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '1Y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(0);
    }
  };

  // Filter trades by time period
  const filteredTrades = timePeriod === 'ALL' ? allTrades : allTrades.filter(trade => {
    const exitDate = trade.exitDate ? new Date(trade.exitDate) : null;
    return exitDate && exitDate >= getCutoffDate(timePeriod);
  });

  // Calculate symbol analysis
  const symbolAnalysis = filteredTrades.reduce((acc: any[], trade) => {
    const existing = acc.find(s => s.symbol === trade.symbol);
    const pnl = trade.pnl || 0;
    
    if (existing) {
      existing.trades += 1;
      existing.pnl += pnl;
      if (trade.status === 'closed') {
        existing.closedTrades += 1;
        if (pnl > 0) existing.winningTrades += 1;
      }
    } else {
      acc.push({
        symbol: trade.symbol,
        trades: 1,
        pnl: pnl,
        closedTrades: trade.status === 'closed' ? 1 : 0,
        winningTrades: (trade.status === 'closed' && pnl > 0) ? 1 : 0,
      });
    }
    return acc;
  }, []).map(s => ({
    ...s,
    winRate: s.closedTrades > 0 ? (s.winningTrades / s.closedTrades) * 100 : 0,
  })).sort((a, b) => b.pnl - a.pnl);

  const topSymbols = symbolAnalysis.filter(s => s.pnl > 0 && !['NIFTY', 'BANKNIFTY', 'SENSEX', 'FINNIFTY', 'MIDCPNIFTY'].some(idx => s.symbol.toUpperCase().includes(idx)));
  const topIndices = symbolAnalysis.filter(s => s.pnl > 0 && ['NIFTY', 'BANKNIFTY', 'SENSEX', 'FINNIFTY', 'MIDCPNIFTY'].some(idx => s.symbol.toUpperCase().includes(idx)));
  const worstSymbols = symbolAnalysis.filter(s => s.pnl < 0 && !['NIFTY', 'BANKNIFTY', 'SENSEX', 'FINNIFTY', 'MIDCPNIFTY'].some(idx => s.symbol.toUpperCase().includes(idx))).sort((a, b) => a.pnl - b.pnl);
  const worstIndices = symbolAnalysis.filter(s => s.pnl < 0 && ['NIFTY', 'BANKNIFTY', 'SENSEX', 'FINNIFTY', 'MIDCPNIFTY'].some(idx => s.symbol.toUpperCase().includes(idx))).sort((a, b) => a.pnl - b.pnl);
  const allSymbols = symbolAnalysis.filter(s => !['NIFTY', 'BANKNIFTY', 'SENSEX', 'FINNIFTY', 'MIDCPNIFTY'].some(idx => s.symbol.toUpperCase().includes(idx)));
  const allIndices = symbolAnalysis.filter(s => ['NIFTY', 'BANKNIFTY', 'SENSEX', 'FINNIFTY', 'MIDCPNIFTY'].some(idx => s.symbol.toUpperCase().includes(idx)));

  const renderTable = (data: any[], badgeColor: string) => {
    if (data.length === 0) {
      return (
        <div className="py-12 text-center text-slate-400">
          <p>No trades found</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-slate-400 border-b border-white/5">
              <th className="px-4 py-3 font-medium">Rank</th>
              <th className="px-4 py-3 font-medium">Symbol</th>
              <th className="px-4 py-3 font-medium">Trades</th>
              <th className="px-4 py-3 font-medium">Win Rate</th>
              <th className="px-4 py-3 font-medium">Total P&L</th>
            </tr>
          </thead>
          <tbody>
            {data.map((symbol, index) => (
              <tr 
                key={symbol.symbol}
                onClick={() => router.push(`/trades?symbol=${encodeURIComponent(symbol.symbol)}`)}
                className="table-row cursor-pointer hover:bg-white/5"
              >
                <td className="px-4 py-3">
                  <div className={`w-8 h-8 rounded-lg ${badgeColor} flex items-center justify-center text-sm font-bold`}>
                    {index + 1}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-white">{symbol.symbol}</span>
                </td>
                <td className="px-4 py-3 text-slate-300">{symbol.trades}</td>
                <td className="px-4 py-3">
                  <span className={symbol.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}>
                    {symbol.winRate.toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={symbol.pnl >= 0 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                    {symbol.pnl >= 0 ? '+' : ''}₹{symbol.pnl.toLocaleString()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (!mounted) return null;

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Performance Analysis</h1>
              <p className="text-xs text-slate-400 mt-0.5">Complete breakdown of all symbols and indices</p>
            </div>
          </div>
          
          {/* Time Period Selector */}
          <div className="flex gap-1">
            {(['1D', '1W', '1M', '3M', '1Y', 'ALL'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  timePeriod === period
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="card">
          <div className="flex gap-2 border-b border-white/5 mb-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'all'
                  ? 'text-purple-400 border-b-2 border-purple-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🌟 All Combined ({symbolAnalysis.length})
            </button>
            <button
              onClick={() => setActiveTab('symbols')}
              className={`px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'symbols'
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📊 All Symbols ({allSymbols.length})
            </button>
            <button
              onClick={() => setActiveTab('indices')}
              className={`px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'indices'
                  ? 'text-indigo-400 border-b-2 border-indigo-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📈 All Indices ({allIndices.length})
            </button>
            <button
              onClick={() => setActiveTab('top-symbols')}
              className={`px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'top-symbols'
                  ? 'text-emerald-400 border-b-2 border-emerald-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🏆 Top Symbols ({topSymbols.length})
            </button>
            <button
              onClick={() => setActiveTab('top-indices')}
              className={`px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'top-indices'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📈 Top Indices ({topIndices.length})
            </button>
            <button
              onClick={() => setActiveTab('worst-symbols')}
              className={`px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'worst-symbols'
                  ? 'text-red-400 border-b-2 border-red-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📉 Worst Symbols ({worstSymbols.length})
            </button>
            <button
              onClick={() => setActiveTab('worst-indices')}
              className={`px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'worst-indices'
                  ? 'text-orange-400 border-b-2 border-orange-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ⚠️ Worst Indices ({worstIndices.length})
            </button>
          </div>

          {/* Content */}
          {activeTab === 'all' && renderTable(symbolAnalysis, 'bg-gradient-to-br from-purple-600 to-indigo-600')}
          {activeTab === 'symbols' && renderTable(allSymbols, 'bg-gradient-to-br from-cyan-600 to-blue-600')}
          {activeTab === 'indices' && renderTable(allIndices, 'bg-gradient-to-br from-indigo-600 to-purple-600')}
          {activeTab === 'top-symbols' && renderTable(topSymbols, 'bg-gradient-to-br from-emerald-600 to-green-600')}
          {activeTab === 'top-indices' && renderTable(topIndices, 'bg-gradient-to-br from-blue-600 to-indigo-600')}
          {activeTab === 'worst-symbols' && renderTable(worstSymbols, 'bg-gradient-to-br from-red-600 to-rose-600')}
          {activeTab === 'worst-indices' && renderTable(worstIndices, 'bg-gradient-to-br from-orange-600 to-red-600')}
        </div>
      </div>
    </AppLayout>
  );
}
