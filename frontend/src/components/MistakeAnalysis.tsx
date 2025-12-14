'use client';

import React, { memo, useMemo } from 'react';
import { AlertCircle, TrendingDown } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface MistakeData {
  mistake: string;
  count: number;
  totalImpact: number;
  avgImpact: number;
}

interface MistakeAnalysisProps {
  data: MistakeData[];
  period: string;
}

const MistakeAnalysis = memo(function MistakeAnalysis({ data, period }: MistakeAnalysisProps) {
  // Memoize calculations
  const { chartData, summary } = useMemo(() => {
    if (!data || data.length === 0) {
      return { chartData: [], summary: { totalMistakes: 0, mostCommon: '', totalImpact: 0 } };
    }
    
    const totalCount = data.reduce((sum, m) => sum + m.count, 0);
    const chartData = data.map(item => ({
      name: item.mistake.length > 30 ? item.mistake.substring(0, 30) + '...' : item.mistake,
      count: item.count,
      fullName: item.mistake,
      percentage: (item.count / totalCount) * 100,
    }));
    
    const summary = {
      totalMistakes: data.length,
      mostCommon: data[0]?.mistake || '',
      totalImpact: Math.abs(data.reduce((sum, m) => sum + m.totalImpact, 0)),
    };
    
    return { chartData, summary };
  }, [data]);
  
  if (!data || data.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 text-white">Common Mistakes - {period}</h3>
        <p className="text-slate-400 text-center py-8">No mistake data available for this period</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
          <p className="text-sm text-white font-medium mb-1">{payload[0].payload.fullName}</p>
          <p className="text-xs text-slate-400">Occurrences: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-6 text-white">Common Mistakes - {period}</h3>
      
      {/* Horizontal Bar Chart */}
      <div className="space-y-3">
        {chartData.map((item, index) => {
          const mistakeData = data[index];
          return (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300 truncate max-w-[60%]">{item.name}</span>
                <span className="text-slate-400 text-xs">
                  {Math.round(item.percentage)}%
                </span>
              </div>
              <div className="relative h-8 bg-slate-800 rounded-lg overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-between px-3 transition-all duration-500"
                  style={{ width: `${item.percentage}%` }}
                >
                  <span className="text-slate-900 text-xs font-medium">
                    -₹{Math.abs(mistakeData.totalImpact).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-white text-xs font-medium">
                    {item.count}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-slate-700 grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-slate-400 mb-1">Total Mistakes</p>
          <p className="text-lg font-semibold text-white">{summary.totalMistakes}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1">Most Common</p>
          <p className="text-sm font-semibold text-red-400">
            {summary.mostCommon.substring(0, 15)}{summary.mostCommon.length > 15 ? '...' : ''}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1">Total Impact</p>
          <p className="text-lg font-semibold text-red-400">
            ₹{summary.totalImpact.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>
    </div>
  );
});

MistakeAnalysis.displayName = 'MistakeAnalysis';

export default MistakeAnalysis;
