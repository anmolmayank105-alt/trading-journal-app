'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { getTrades } from '@/lib/api/trades';
import { ArrowLeft } from 'lucide-react';

interface StrategyData {
  strategy: string;
  totalTrades: number;
  totalPnL: number;
  totalProfit: number;
  totalLoss: number;
  avgPnL: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
}

export default function StrategiesPage() {
  const router = useRouter();
  const [strategyData, setStrategyData] = useState<StrategyData[]>([]);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'top' | 'worst'>('all');
  const [timePeriod, setTimePeriod] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'>('ALL');

  const loadStrategyData = useCallback(async () => {
    try {
      const trades = await getTrades();
      
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
      const filteredTrades = timePeriod === 'ALL' ? trades : trades.filter(trade => {
        const exitDate = trade.exitDate ? new Date(trade.exitDate) : null;
        return exitDate && exitDate >= getCutoffDate(timePeriod);
      });
      
      // Calculate strategy performance from trades
      const strategyMap = filteredTrades.reduce((acc: any, trade) => {
        const strategy = trade.strategy || 'No Strategy';
        if (!acc[strategy]) {
          acc[strategy] = {
            strategy,
            totalTrades: 0,
            totalPnL: 0,
            totalProfit: 0,
            totalLoss: 0,
            winningTrades: 0,
            losingTrades: 0,
          };
        }
        
        acc[strategy].totalTrades += 1;
        const pnl = trade.pnl || 0;
        acc[strategy].totalPnL += pnl;
        
        if (trade.status === 'closed') {
          if (pnl > 0) {
            acc[strategy].winningTrades += 1;
            acc[strategy].totalProfit += pnl;
          } else if (pnl < 0) {
            acc[strategy].losingTrades += 1;
            acc[strategy].totalLoss += pnl;
          }
        }
        
        return acc;
      }, {});
      
      const strategies = Object.values(strategyMap).map((s: any) => ({
        ...s,
        avgPnL: s.totalTrades > 0 ? s.totalPnL / s.totalTrades : 0,
        winRate: (s.winningTrades + s.losingTrades) > 0 
          ? (s.winningTrades / (s.winningTrades + s.losingTrades)) * 100 
          : 0,
      }));
      
      setStrategyData(strategies);
    } catch (error) {
      console.error('Failed to load strategy data:', error);
      setStrategyData([]);
    }
  }, [timePeriod]);

  useEffect(() => {
    setMounted(true);
    loadStrategyData();
  }, [loadStrategyData]);

  const topStrategies = strategyData.filter(s => s.totalPnL > 0).sort((a, b) => b.totalPnL - a.totalPnL);
  const worstStrategies = strategyData.filter(s => s.totalPnL < 0).sort((a, b) => a.totalPnL - b.totalPnL);
  const allStrategies = [...strategyData].sort((a, b) => b.totalPnL - a.totalPnL);

  const renderTable = (data: StrategyData[]) => {
    if (data.length === 0) {
      return (
        <div className="py-12 text-center text-slate-400">
          <p>No strategies found</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-slate-400 border-b border-white/5">
              <th className="px-4 py-3 font-medium">Strategy</th>
              <th className="px-4 py-3 font-medium text-right">Trades</th>
              <th className="px-4 py-3 font-medium text-right">Win Rate</th>
              <th className="px-4 py-3 font-medium text-right">Total P&L</th>
              <th className="px-4 py-3 font-medium text-right">Avg P&L</th>
              <th className="px-4 py-3 font-medium text-right">Profit</th>
              <th className="px-4 py-3 font-medium text-right">Loss</th>
            </tr>
          </thead>
          <tbody>
            {data.map((strategy, index) => (
              <tr key={strategy.strategy} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${
                      strategy.totalPnL > 0 
                        ? 'bg-gradient-to-br from-emerald-600 to-green-600' 
                        : 'bg-gradient-to-br from-red-600 to-rose-600'
                    } flex items-center justify-center text-sm font-bold`}>
                      {index + 1}
                    </div>
                    <span className="font-medium text-white">{strategy.strategy}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-300 text-right">{strategy.totalTrades}</td>
                <td className="px-4 py-3 text-right">
                  <span className={strategy.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}>
                    {strategy.winRate.toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {strategy.totalPnL >= 0 ? (
                      <span className="text-emerald-400">↗</span>
                    ) : (
                      <span className="text-red-400">↘</span>
                    )}
                    <span className={strategy.totalPnL >= 0 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                      ₹{Math.abs(strategy.totalPnL).toLocaleString()}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-300 text-right">₹{strategy.avgPnL.toLocaleString()}</td>
                <td className="px-4 py-3 text-emerald-400 text-right">₹{strategy.totalProfit.toLocaleString()}</td>
                <td className="px-4 py-3 text-red-400 text-right">₹{Math.abs(strategy.totalLoss).toLocaleString()}</td>
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
              <h1 className="text-xl font-bold text-white">Strategy Performance Analysis</h1>
              <p className="text-xs text-slate-400 mt-0.5">Complete breakdown of all trading strategies</p>
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
          <div className="flex gap-2 border-b border-white/5 mb-4">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'all'
                  ? 'text-purple-400 border-b-2 border-purple-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🌟 All Strategies ({allStrategies.length})
            </button>
            <button
              onClick={() => setActiveTab('top')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'top'
                  ? 'text-emerald-400 border-b-2 border-emerald-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🏆 Top Strategies ({topStrategies.length})
            </button>
            <button
              onClick={() => setActiveTab('worst')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'worst'
                  ? 'text-red-400 border-b-2 border-red-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📉 Worst Strategies ({worstStrategies.length})
            </button>
          </div>

          {/* Content */}
          {activeTab === 'all' && renderTable(allStrategies)}
          {activeTab === 'top' && renderTable(topStrategies)}
          {activeTab === 'worst' && renderTable(worstStrategies)}
        </div>
      </div>
    </AppLayout>
  );
}
