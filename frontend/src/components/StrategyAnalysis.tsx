'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';

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

interface StrategyAnalysisProps {
  data: StrategyData[];
  period: string;
}

export default function StrategyAnalysis({ data, period }: StrategyAnalysisProps) {
  const router = useRouter();
  
  if (!data || data.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Strategy Performance - {period}</h3>
        </div>
        <p className="text-slate-400 text-center py-8">No strategy data available for this period</p>
      </div>
    );
  }

  const topStrategies = data.filter(s => s.totalPnL > 0).sort((a, b) => b.totalPnL - a.totalPnL).slice(0, 5);
  const worstStrategies = data.filter(s => s.totalPnL < 0).sort((a, b) => a.totalPnL - b.totalPnL).slice(0, 5);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">📊 Strategy Performance - {period}</h2>
        <button
          onClick={() => router.push('/analytics/strategies')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white"
        >
          <span className="text-sm font-medium">View All</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Strategies */}
        <div className="bg-white/5 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">🏆 Top 5 Strategies</h3>
          {topStrategies.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-slate-400 border-b border-white/5">
                    <th className="px-4 py-3 font-medium">Strategy</th>
                    <th className="px-4 py-3 font-medium text-right">Trades</th>
                    <th className="px-4 py-3 font-medium text-right">Win Rate</th>
                    <th className="px-4 py-3 font-medium text-right">Total P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {topStrategies.map((strategy, index) => (
                    <tr key={strategy.strategy} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-green-600 flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <span className="font-medium text-white text-sm">{strategy.strategy}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-right text-sm">{strategy.totalTrades}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm ${strategy.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {strategy.winRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-emerald-400 font-semibold text-sm">
                          +₹{strategy.totalPnL.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-sm">
              <p>No profitable strategies</p>
            </div>
          )}
        </div>

        {/* Worst Strategies */}
        <div className="bg-white/5 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">📉 Worst 5 Strategies</h3>
          {worstStrategies.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-slate-400 border-b border-white/5">
                    <th className="px-4 py-3 font-medium">Strategy</th>
                    <th className="px-4 py-3 font-medium text-right">Trades</th>
                    <th className="px-4 py-3 font-medium text-right">Win Rate</th>
                    <th className="px-4 py-3 font-medium text-right">Total P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {worstStrategies.map((strategy, index) => (
                    <tr key={strategy.strategy} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-rose-600 flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <span className="font-medium text-white text-sm">{strategy.strategy}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-right text-sm">{strategy.totalTrades}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm ${strategy.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {strategy.winRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-red-400 font-semibold text-sm">
                          ₹{strategy.totalPnL.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-sm">
              <p>No losing strategies</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
