'use client';

import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  BarChart,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  Legend,
} from 'recharts';
import { useTheme } from '@/contexts/ThemeContext';
import { PieChart as PieChartIcon } from 'lucide-react';

interface PnLData {
  date: string;
  pnl: number;
  cumulative: number;
}

interface WeeklyData {
  day: string;
  pnl: number;
}

interface WinLossData {
  name: string;
  value: number;
  color: string;
}

interface DashboardChartsProps {
  pnlData: PnLData[];
  weeklyPnL: WeeklyData[];
  winLossData: WinLossData[];
}

export const PnLChart = React.memo(({ data, isDark }: { data: PnLData[]; isDark: boolean }) => {
  const tooltipStyle = {
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
    borderRadius: '8px',
    color: isDark ? '#ffffff' : '#1e293b',
    padding: '8px 12px',
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const pnl = payload.find((p: any) => p.dataKey === 'pnl')?.value || 0;
      const date = payload[0]?.payload?.date || '';
      return (
        <div style={tooltipStyle}>
          <p style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b', marginBottom: '4px' }}>{date}</p>
          <p style={{ fontSize: '13px', color: pnl >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
            Trade: {pnl >= 0 ? '+' : ''}₹{pnl.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  // Calculate Y-axis domain with padding to prevent bars going out of bounds
  const allPnlValues = data.map(d => d.pnl);
  const maxPnl = Math.max(...allPnlValues, 0);
  const minPnl = Math.min(...allPnlValues, 0);
  const range = Math.max(Math.abs(maxPnl), Math.abs(minPnl));
  const padding = range * 0.3; // 30% padding for better visual spacing
  
  // Round domain to nice numbers to avoid decimal ticks
  const roundToNice = (value: number, up: boolean) => {
    if (value === 0) return 0;
    const absVal = Math.abs(value);
    const sign = value < 0 ? -1 : 1;
    
    // Determine magnitude and round to nice number
    const magnitude = Math.pow(10, Math.floor(Math.log10(absVal)));
    const normalized = absVal / magnitude;
    
    let niceValue: number;
    if (up) {
      if (normalized <= 1) niceValue = 1;
      else if (normalized <= 2) niceValue = 2;
      else if (normalized <= 5) niceValue = 5;
      else niceValue = 10;
    } else {
      if (normalized < 1) niceValue = 1;
      else if (normalized < 2) niceValue = 1;
      else if (normalized < 5) niceValue = 2;
      else niceValue = 5;
    }
    
    return sign * niceValue * magnitude;
  };
  
  const yAxisDomain = [
    minPnl < 0 ? roundToNice(minPnl - padding, false) : roundToNice(-padding * 0.1, false),
    maxPnl > 0 ? roundToNice(maxPnl + padding, true) : roundToNice(padding * 0.1, true)
  ];

  // Format Y-axis values nicely (no decimals for small values)
  const formatYAxisTick = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`;
    } else if (absValue >= 1000) {
      return `₹${(value / 1000).toFixed(0)}k`;
    } else {
      return `₹${Math.round(value)}`;
    }
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart 
        data={data} 
        barCategoryGap="20%" 
        margin={{ top: 20, right: 10, left: 0, bottom: 5 }}
      >
        <defs>
          <linearGradient id="greenBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
            <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
          </linearGradient>
          <linearGradient id="redBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
            <stop offset="100%" stopColor="#dc2626" stopOpacity={0.8} />
          </linearGradient>
        </defs>
        <XAxis 
          dataKey="date"
          stroke={isDark ? '#64748b' : '#94a3b8'} 
          fontSize={10}
          tickLine={false}
          axisLine={{ stroke: isDark ? '#334155' : '#e2e8f0' }}
          interval="preserveStartEnd"
        />
        <YAxis 
          domain={yAxisDomain}
          allowDataOverflow={false}
          stroke={isDark ? '#64748b' : '#94a3b8'} 
          fontSize={10}
          tickLine={false}
          axisLine={{ stroke: isDark ? '#334155' : '#e2e8f0' }}
          tickFormatter={formatYAxisTick}
          tickCount={5}
        />
        <ReferenceLine y={0} stroke={isDark ? '#475569' : '#cbd5e1'} strokeWidth={1} />
        <Tooltip content={<CustomTooltip />} cursor={false} />
        <Bar 
          dataKey="pnl" 
          radius={[2, 2, 0, 0]}
          maxBarSize={40}
          isAnimationActive={false}
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.pnl >= 0 ? 'url(#greenBar)' : 'url(#redBar)'}
            />
          ))}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
});
PnLChart.displayName = 'PnLChart';

export const WeeklyChart = React.memo(({ data, isDark }: { data: WeeklyData[]; isDark: boolean }) => {
  const tooltipStyle = {
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
    borderRadius: '12px',
    color: isDark ? '#ffffff' : '#1e293b',
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <XAxis 
          dataKey="day" 
          stroke={isDark ? '#64748b' : '#94a3b8'} 
          fontSize={11}
          tickLine={false}
          axisLine={{ stroke: isDark ? '#334155' : '#e2e8f0' }}
        />
        <YAxis 
          stroke={isDark ? '#64748b' : '#94a3b8'} 
          fontSize={11}
          tickLine={false}
          axisLine={{ stroke: isDark ? '#334155' : '#e2e8f0' }}
          tickFormatter={(value) => `₹${value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}`}
        />
        <ReferenceLine y={0} stroke={isDark ? '#475569' : '#cbd5e1'} strokeDasharray="3 3" />
        <Tooltip 
          contentStyle={tooltipStyle}
          formatter={(value: number) => [`₹${value.toLocaleString()}`, 'P&L']}
          labelStyle={{ color: isDark ? '#94a3b8' : '#64748b' }}
          cursor={false}
        />
        <Bar 
          dataKey="pnl" 
          radius={[4, 4, 0, 0]}
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} 
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
});
WeeklyChart.displayName = 'WeeklyChart';

// Alias for compatibility
const WeeklyPnLChart = WeeklyChart;

const WinLossChart = React.memo(({ data, isDark }: { data: WinLossData[]; isDark: boolean }) => {
  const tooltipStyle = {
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
    borderRadius: '12px',
    color: isDark ? '#ffffff' : '#1e293b',
    padding: '8px 12px',
  };

  if (!data.some(d => d.value > 0)) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400">
        <div className="text-center">
          <PieChartIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No data available</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={tooltipStyle}
          itemStyle={{ color: isDark ? '#ffffff' : '#1e293b' }}
          labelStyle={{ color: isDark ? '#ffffff' : '#1e293b' }}
          cursor={false}
        />
        <Legend 
          wrapperStyle={{ color: isDark ? '#ffffff' : '#1e293b' }}
          iconType="circle"
          formatter={(value) => <span style={{ color: isDark ? '#ffffff' : '#1e293b' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
});
WinLossChart.displayName = 'WinLossChart';

export default function DashboardCharts({ pnlData, weeklyPnL, winLossData }: DashboardChartsProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* P&L Curve */}
      <div className="card">
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Cumulative P&L</h3>
        <div className="h-64">
          <PnLChart data={pnlData} isDark={isDark} />
        </div>
      </div>

      {/* Win/Loss Ratio */}
      <div className="card">
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Win/Loss Ratio</h3>
        <div className="h-64">
          <WinLossChart data={winLossData} isDark={isDark} />
        </div>
      </div>
    </div>
  );
}
