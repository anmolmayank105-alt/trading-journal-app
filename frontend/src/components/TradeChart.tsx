'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const tooltipStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
};

interface ChartData {
  time: string;
  price: number;
}

interface TradeChartProps {
  data: ChartData[];
  isProfit?: boolean;
}

export default function TradeChart({ data, isProfit = true }: TradeChartProps) {
  const color = isProfit ? '#10b981' : '#ef4444';
  const gradientId = isProfit ? 'profitGradient' : 'lossGradient';

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
        <YAxis 
          stroke="#64748b" 
          fontSize={12} 
          domain={['dataMin - 10', 'dataMax + 10']}
          tickFormatter={(v) => `₹${v.toLocaleString()}`}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: '#94a3b8' }}
          formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Price']}
          cursor={false}
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
