'use client';

import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { getDailyPnL, getTrades } from '@/lib/api/trades';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import type { Trade } from '@/types';

interface DayData {
  date: string;
  pnl: number;
  tradeCount: number;
}

export default function CalendarPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dailyPnL, setDailyPnL] = useState<DayData[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  useEffect(() => {
    loadCalendarData();
  }, [currentYear, currentMonth]);

  const loadCalendarData = async () => {
    setLoading(true);
    const [pnlData, tradesData] = await Promise.all([
      getDailyPnL(currentYear, currentMonth),
      getTrades()
    ]);
    setDailyPnL(pnlData);
    setTrades(tradesData);
    setLoading(false);
  };

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

  // Get month details
  const monthName = currentDate.toLocaleString('en-US', { month: 'long' });
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday

  // Create calendar grid
  const calendarDays = useMemo(() => {
    const days: Array<{ day: number | null; date: string | null; data: DayData | null }> = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ day: null, date: null, data: null });
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = dailyPnL.find(d => d.date === dateStr);
      days.push({ day, date: dateStr, data: dayData || null });
    }
    
    return days;
  }, [currentYear, currentMonth, daysInMonth, startingDayOfWeek, dailyPnL]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayClick = (dateStr: string) => {
    router.push(`/trades?date=${dateStr}`);
  };

  const getDayColor = (data: DayData | null) => {
    if (!data) return 'bg-slate-800/30';
    if (data.pnl > 0) return 'bg-emerald-500/20 border-emerald-500/40 hover:bg-emerald-500/30';
    if (data.pnl < 0) return 'bg-red-500/20 border-red-500/40 hover:bg-red-500/30';
    return 'bg-slate-800/30';
  };

  const getDayTextColor = (data: DayData | null) => {
    if (!data) return 'text-slate-500';
    if (data.pnl > 0) return 'text-emerald-400';
    if (data.pnl < 0) return 'text-red-400';
    return 'text-slate-400';
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Trading Calendar</h1>
            <p className="text-slate-400 mt-1">View your daily P&L performance</p>
          </div>
          <button
            onClick={goToToday}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition-colors text-white font-medium"
          >
            <CalendarIcon className="w-4 h-4" />
            Today
          </button>
        </div>

        {/* Calendar Card */}
        <div className="card">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
            <button
              onClick={goToPreviousMonth}
              className="p-2 rounded-lg hover:bg-slate-700 transition-colors text-slate-300 hover:text-white"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold text-white">
              {monthName} {currentYear}
            </h2>
            <button
              onClick={goToNextMonth}
              className="p-2 rounded-lg hover:bg-slate-700 transition-colors text-slate-300 hover:text-white"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Day Labels */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-semibold text-slate-400 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          {loading ? (
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-lg bg-slate-800/50 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((dayInfo, index) => {
                if (dayInfo.day === null) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }

                const isToday = dayInfo.date === new Date().toISOString().split('T')[0];
                
                return (
                  <div
                    key={dayInfo.date}
                    onClick={() => dayInfo.data && handleDayClick(dayInfo.date!)}
                    className={`
                      aspect-square rounded-lg border transition-all
                      ${getDayColor(dayInfo.data)}
                      ${dayInfo.data ? 'cursor-pointer border' : 'border-transparent'}
                      ${isToday ? 'ring-2 ring-indigo-500' : ''}
                      flex flex-col items-center justify-center p-2
                    `}
                  >
                    <span className={`text-lg font-semibold ${getDayTextColor(dayInfo.data)}`}>
                      {dayInfo.day}
                    </span>
                    {dayInfo.data && (
                      <>
                        <span className={`text-xs mt-1 font-medium ${getDayTextColor(dayInfo.data)}`}>
                          {dayInfo.data.pnl >= 0 ? '+' : ''}₹{Math.abs(dayInfo.data.pnl).toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-500 mt-0.5">
                          {dayInfo.data.tradeCount} {dayInfo.data.tradeCount === 1 ? 'trade' : 'trades'}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Legend</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-emerald-500/20 border border-emerald-500/40" />
              <span className="text-sm text-slate-400">Profit Day</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500/40" />
              <span className="text-sm text-slate-400">Loss Day</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-slate-800/30" />
              <span className="text-sm text-slate-400">No Trades</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded ring-2 ring-indigo-500 bg-slate-800/30" />
              <span className="text-sm text-slate-400">Today</span>
            </div>
          </div>
        </div>

        {/* Day-wise Win Rate Analysis */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 text-white">Day-wise Win Rate</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {dayWiseWinRate.map(({ day, winRate, wins, losses, total }) => {
              const isPositive = winRate >= 50;
              return (
                <div key={day} className="card bg-slate-800/50">
                  <div className="text-center">
                    <div className="text-sm font-medium text-slate-400 mb-2">{day}</div>
                    <div className={`text-2xl font-bold mb-2 ${
                      total === 0 ? 'text-slate-500' :
                      isPositive ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {total === 0 ? '-' : `${winRate.toFixed(0)}%`}
                    </div>
                    {total > 0 && (
                      <>
                        <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                          <div
                            className={`h-2 rounded-full ${
                              isPositive ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${winRate}%` }}
                          />
                        </div>
                        <div className="text-xs text-slate-500">
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
    </AppLayout>
  );
}
