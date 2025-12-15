'use client';

import React, { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  BarChart,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Activity, PieChart as PieChartIcon } from 'lucide-react';

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];

interface ChartData {
  date: string;
  pnl: number;
  cumulative: number;
}

interface WinLossData {
  name: string;
  value: number;
  color: string;
}

interface SegmentData {
  name: string;
  value: number;
  color: string;
}

interface MonthlyData {
  month: string;
  pnl: number;
}

interface WeeklyPnLData {
  day: string;
  pnl: number;
}

interface AnalyticsChartsProps {
  chartData: ChartData[];
  winLossData: WinLossData[];
  segmentData: SegmentData[];
  monthlyPnL: MonthlyData[];
  weeklyPnL: WeeklyPnLData[];
}

const tooltipStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  padding: '8px 12px',
};

// Memoized chart components
const CumulativePnLChart = React.memo(({ data }: { data: ChartData[] }) => {
  if (data.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-slate-400">
        <div className="text-center">
          <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No closed trades yet</p>
        </div>
      </div>
    );
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const pnl = payload.find((p: any) => p.dataKey === 'pnl')?.value || 0;
      const date = payload[0]?.payload?.date || '';
      return (
        <div style={tooltipStyle}>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>{date}</p>
          <p style={{ fontSize: '13px', color: pnl >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
            Trade: {pnl >= 0 ? '+' : ''}₹{pnl.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  // Calculate Y-axis domain with padding
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

  // Format Y-axis values nicely (no decimals)
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
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart 
          data={data} 
          barCategoryGap="15%" 
          margin={{ top: 20, right: 10, left: 0, bottom: 5 }}
        >
          <defs>
            <linearGradient id="greenBarAnalytics" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
              <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
            </linearGradient>
            <linearGradient id="redBarAnalytics" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
              <stop offset="100%" stopColor="#dc2626" stopOpacity={0.8} />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="date"
            stroke="#64748b" 
            fontSize={10} 
            tickLine={false}
            axisLine={{ stroke: '#334155' }}
            interval="preserveStartEnd"
          />
          <YAxis 
            domain={yAxisDomain}
            allowDataOverflow={false}
            stroke="#64748b" 
            fontSize={10} 
            tickLine={false}
            axisLine={{ stroke: '#334155' }}
            tickFormatter={formatYAxisTick}
            tickCount={5}
          />
          <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Bar 
            dataKey="pnl" 
            radius={[2, 2, 0, 0]}
            maxBarSize={35}
            isAnimationActive={false}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.pnl >= 0 ? 'url(#greenBarAnalytics)' : 'url(#redBarAnalytics)'}
              />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
});
CumulativePnLChart.displayName = 'CumulativePnLChart';

const WinLossChart = React.memo(({ data }: { data: WinLossData[] }) => {
  const tooltipStyle = {
    backgroundColor: '#1e293b',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    color: '#ffffff',
  };

  if (!data.some(d => d.value > 0)) {
    return (
      <div className="h-72 flex items-center justify-center text-slate-400">
        <div className="text-center">
          <PieChartIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-72">
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
            itemStyle={{ color: '#ffffff' }}
            labelStyle={{ color: '#ffffff' }}
            cursor={false}
          />
          <Legend 
            wrapperStyle={{ color: '#ffffff' }}
            iconType="circle"
            formatter={(value) => <span style={{ color: '#ffffff' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
});
WinLossChart.displayName = 'WinLossChart';

const WeeklyPnLChart = React.memo(({ data }: { data: WeeklyPnLData[] }) => {
  const tooltipStyle = {
    backgroundColor: '#1e293b',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    color: '#ffffff',
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis 
            dataKey="day" 
            stroke="#64748b" 
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#334155' }}
          />
          <YAxis 
            stroke="#64748b" 
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#334155' }}
            tickFormatter={(value) => `₹${value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}`}
          />
          <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
          <Tooltip 
            contentStyle={tooltipStyle}
            formatter={(value: number) => [`₹${value.toLocaleString()}`, 'P&L']}
            labelStyle={{ color: '#ffffff' }}
            itemStyle={{ color: '#ffffff' }}
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
WeeklyPnLChart.displayName = 'WeeklyPnLChart';

const MonthlyPnLChart = React.memo(({ data }: { data: MonthlyData[] }) => {
  const tooltipStyle = {
    backgroundColor: '#1e293b',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    color: '#ffffff',
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <XAxis 
          dataKey="month" 
          stroke="#64748b" 
          fontSize={11} 
          tickLine={false}
          axisLine={{ stroke: '#334155' }}
        />
        <YAxis 
          stroke="#64748b" 
          fontSize={11} 
          tickLine={false}
          axisLine={{ stroke: '#334155' }}
          tickFormatter={(v) => `₹${Math.abs(v) >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} 
        />
        <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number) => [`₹${value.toLocaleString()}`, 'P&L']}
          labelStyle={{ color: '#ffffff' }}
          itemStyle={{ color: '#ffffff' }}
          cursor={false}
        />
        <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
});
MonthlyPnLChart.displayName = 'MonthlyPnLChart';

const SegmentChart = React.memo(({ data }: { data: SegmentData[] }) => {
  const tooltipStyle = {
    backgroundColor: '#1e293b',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    color: '#ffffff',
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <p>No trades yet</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 10, right: 80, bottom: 10, left: 80 }}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
          labelLine={{ stroke: '#64748b' }}
          style={{ fontSize: '12px', fill: '#e2e8f0' }}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={tooltipStyle}
          itemStyle={{ color: '#ffffff' }}
          labelStyle={{ color: '#ffffff' }}
          cursor={false}
        />
        <Legend 
          verticalAlign="bottom"
          height={36}
          formatter={(value) => <span style={{ color: '#e2e8f0', fontSize: '12px' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
});
SegmentChart.displayName = 'SegmentChart';

export default function AnalyticsCharts({ 
  chartData, 
  winLossData, 
  segmentData, 
  monthlyPnL,
  weeklyPnL 
}: AnalyticsChartsProps) {
  return (
    <div className="space-y-6">
      {/* Top Row - Cumulative P&L and Segment Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 card">
          <h3 className="text-lg font-semibold text-white mb-4">Cumulative P&L</h3>
          <div className="h-72">
            <CumulativePnLChart data={chartData} />
          </div>
        </div>
        
        <div className="lg:col-span-2 card">
          <h3 className="text-lg font-semibold text-white mb-4">Segment Distribution</h3>
          <div className="h-72">
            <SegmentChart data={segmentData} />
          </div>
        </div>
      </div>

      {/* Bottom Row - Weekly and Monthly P&L */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">This Week</h3>
          <div className="h-64">
            <WeeklyPnLChart data={weeklyPnL} />
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Monthly P&L</h3>
          <div className="h-64">
            <MonthlyPnLChart data={monthlyPnL} />
          </div>
        </div>
      </div>
    </div>
  );
}
