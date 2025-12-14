'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { getDailyPnL, getTrades } from '@/lib/api/trades';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Calculator, X } from 'lucide-react';
import type { Trade } from '@/types';

interface DayData {
  date: string;
  pnl: number;
  tradeCount: number;
}

// Day of week labels - moved outside component
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

// Color helper functions - moved outside component
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

export default function CalendarPage() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dailyPnL, setDailyPnL] = useState<DayData[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Multi-day selection for sum calculation
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

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

  // Get month details
  const monthName = currentDate.toLocaleString('en-US', { month: 'long' });
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday

  // Calculate monthly summary
  const monthlySummary = useMemo(() => {
    const totalPnL = dailyPnL.reduce((sum, d) => sum + d.pnl, 0);
    const totalTrades = dailyPnL.reduce((sum, d) => sum + d.tradeCount, 0);
    const profitDays = dailyPnL.filter(d => d.pnl > 0).length;
    const lossDays = dailyPnL.filter(d => d.pnl < 0).length;
    return { totalPnL, totalTrades, profitDays, lossDays };
  }, [dailyPnL]);

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

  const goToPreviousMonth = useCallback(() => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  }, [currentYear, currentMonth]);

  const goToNextMonth = useCallback(() => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  }, [currentYear, currentMonth]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleDayClick = useCallback((dateStr: string) => {
    router.push(`/trades?date=${dateStr}`);
  }, [router]);

  const handleJumpTo = useCallback(() => {
    setCurrentDate(new Date(selectedYear, selectedMonth, 1));
  }, [selectedYear, selectedMonth]);

  // Toggle selection mode
  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => !prev);
    setSelectedDays([]);
  }, []);

  // Handle day click based on mode
  const handleDayClickWithMode = useCallback((dateStr: string, hasData: boolean) => {
    if (selectionMode && hasData) {
      setSelectedDays(prev => {
        if (prev.includes(dateStr)) {
          return prev.filter(d => d !== dateStr);
        }
        return [...prev, dateStr];
      });
    } else if (hasData) {
      router.push(`/trades?date=${dateStr}`);
    }
  }, [selectionMode, router]);

  // Calculate sum of selected days
  const selectedDaysSum = useMemo(() => {
    if (selectedDays.length === 0) return { pnl: 0, trades: 0, days: 0 };
    
    let totalPnL = 0;
    let totalTrades = 0;
    
    selectedDays.forEach(date => {
      const dayData = dailyPnL.find(d => d.date === date);
      if (dayData) {
        totalPnL += dayData.pnl;
        totalTrades += dayData.tradeCount;
      }
    });
    
    return { pnl: totalPnL, trades: totalTrades, days: selectedDays.length };
  }, [selectedDays, dailyPnL]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedDays([]);
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Trading Calendar</h1>
            <p className={`mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>View your daily P&L performance</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Jump To Selector */}
            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className={`px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark 
                    ? 'bg-slate-800 border-slate-700 text-white' 
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, idx) => (
                  <option key={month} value={idx}>{month}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className={`px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark 
                    ? 'bg-slate-800 border-slate-700 text-white' 
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <button
                onClick={handleJumpTo}
                className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                  isDark 
                    ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
                }`}
              >
                Go
              </button>
            </div>
            <button
              onClick={goToToday}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition-colors text-white font-medium"
            >
              <CalendarIcon className="w-4 h-4" />
              Today
            </button>
            <button
              onClick={toggleSelectionMode}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                selectionMode 
                  ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                  : isDark 
                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
              }`}
            >
              <Calculator className="w-4 h-4" />
              {selectionMode ? 'Exit Sum Mode' : 'Sum Days'}
            </button>
          </div>
        </div>

        {/* Selection Mode Banner */}
        {selectionMode && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calculator className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="text-amber-400 font-medium">Day Sum Mode Active</p>
                  <p className="text-amber-400/70 text-sm">Click on days to select/deselect them for sum calculation</p>
                </div>
              </div>
              {selectedDays.length > 0 && (
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-slate-400">{selectedDaysSum.days} days selected • {selectedDaysSum.trades} trades</p>
                    <p className={`text-xl font-bold ${selectedDaysSum.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {selectedDaysSum.pnl >= 0 ? '+' : ''}₹{selectedDaysSum.pnl.toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={clearSelection}
                    className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-slate-300"
                    title="Clear selection"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Calendar Card */}
        <div className="card">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700">
            <button
              onClick={goToPreviousMonth}
              className="p-2 rounded-lg hover:bg-slate-700 transition-colors text-slate-300 hover:text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-white">
              {monthName} {currentYear}
            </h2>
            <button
              onClick={goToNextMonth}
              className="p-2 rounded-lg hover:bg-slate-700 transition-colors text-slate-300 hover:text-white"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day Labels */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-slate-400 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          {loading ? (
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-[70px] rounded-lg bg-slate-800/50 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((dayInfo, index) => {
                if (dayInfo.day === null) {
                  return <div key={`empty-${index}`} className="h-[70px]" />;
                }

                const isToday = dayInfo.date === new Date().toISOString().split('T')[0];
                const isSelected = selectionMode && selectedDays.includes(dayInfo.date!);
                
                return (
                  <div
                    key={dayInfo.date}
                    onClick={() => handleDayClickWithMode(dayInfo.date!, !!dayInfo.data)}
                    className={`
                      h-[70px] rounded-lg border transition-all
                      ${getDayColor(dayInfo.data)}
                      ${dayInfo.data ? 'cursor-pointer border' : 'border-transparent'}
                      ${isToday ? 'ring-2 ring-indigo-500' : ''}
                      ${isSelected ? 'ring-2 ring-amber-400 bg-amber-500/20 border-amber-500/40' : ''}
                      ${selectionMode && dayInfo.data ? 'hover:ring-2 hover:ring-amber-400/50' : ''}
                      flex flex-col items-center justify-center p-1
                    `}
                  >
                    <span className={`text-sm font-semibold ${getDayTextColor(dayInfo.data)}`}>
                      {dayInfo.day}
                    </span>
                    {dayInfo.data && (
                      <>
                        <span className={`text-[10px] mt-0.5 font-medium ${getDayTextColor(dayInfo.data)}`}>
                          {dayInfo.data.pnl >= 0 ? '+' : ''}₹{Math.abs(dayInfo.data.pnl).toLocaleString()}
                        </span>
                        <span className="text-[9px] text-slate-500 mt-0.5">
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

        {/* Legend - Inline */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span className="font-medium text-slate-300">Legend:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40" />
              <span>Profit</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/40" />
              <span>Loss</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded ring-2 ring-indigo-500" />
              <span>Today</span>
            </div>
            {selectionMode && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded ring-2 ring-amber-400 bg-amber-500/20" />
                <span className="text-amber-400">Selected</span>
              </div>
            )}
          </div>
          
          {/* Monthly Summary */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Monthly P&L:</span>
              <span className={`font-bold text-lg ${monthlySummary.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {monthlySummary.totalPnL >= 0 ? '+' : ''}₹{monthlySummary.totalPnL.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-emerald-400 font-medium">{monthlySummary.profitDays}W</span>
              <span>/</span>
              <span className="text-red-400 font-medium">{monthlySummary.lossDays}L</span>
            </div>
            <div className="text-slate-400">
              {monthlySummary.totalTrades} trades
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
