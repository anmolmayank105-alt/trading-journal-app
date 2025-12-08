'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import AppLayout from '@/components/AppLayout';
import StrategyInput from '@/components/StrategyInput';
import PsychologyInput from '@/components/PsychologyInput';
import IndexInput from '@/components/IndexInput';
import TimeFrameInput from '@/components/TimeFrameInput';
import MistakeInput from '@/components/MistakeInput';
import { getTradeById, updateTrade, deleteTrade } from '@/lib/api/trades';
import { Trade } from '@/types';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Target,
  Edit,
  Trash2,
  X,
  Loader2,
  Clock,
  Tag,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

// Single dynamic import for chart
const TradeChart = dynamic(() => import('../../../components/TradeChart'), { 
  ssr: false,
  loading: () => <div className="h-64 bg-slate-800/50 rounded-xl animate-pulse" />
});

// Edit Trade Modal Component
const EditTradeModal = ({ 
  isOpen, 
  onClose, 
  trade,
  onSave 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  trade: Trade;
  onSave: (updatedTrade: Trade) => void;
}) => {
  // Check if it's an index based on common index symbols
  const indexSymbols = ['NIFTY', 'SENSEX', 'BANKNIFTY', 'SPX', 'DJI', 'IXIC', 'FTSE', 'DAX', 'N225', 'HSI'];
  const isIndex = indexSymbols.some(idx => trade.symbol.toUpperCase().includes(idx));
  
  const [instrumentType, setInstrumentType] = useState<'symbol' | 'index'>(isIndex ? 'index' : 'symbol');
  const [formData, setFormData] = useState({
    symbol: trade.symbol,
    exchange: trade.exchange,
    segment: trade.segment,
    tradeType: trade.tradeType,
    quantity: trade.quantity.toString(),
    entryPrice: trade.entryPrice.toString(),
    exitPrice: trade.exitPrice?.toString() || '',
    stopLoss: trade.stopLoss?.toString() || '',
    target: trade.target?.toString() || '',
    entryDate: trade.entryDate.split('T')[0],
    exitDate: trade.exitDate?.split('T')[0] || '',
    entryTime: trade.entryTime || '',
    exitTime: trade.exitTime || '',
    timeFrame: trade.timeFrame || '',
    strategy: trade.strategy || '',
    psychology: trade.psychology || '',
    mistake: trade.mistake || '',
    notes: trade.notes || '',
  });
  const [timeFrameManuallySet, setTimeFrameManuallySet] = useState(!!trade.timeFrame);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if entry and exit are same day
  const isSameDay = formData.entryDate && formData.exitDate && formData.entryDate === formData.exitDate;

  // Auto-calculate time frame
  const autoTimeFrame = useMemo(() => {
    if (!formData.entryDate || !formData.exitDate) return '';
    const entryDate = new Date(formData.entryDate);
    const exitDate = new Date(formData.exitDate);
    
    if (formData.entryDate === formData.exitDate) {
      if (formData.entryTime && formData.exitTime) {
        const [entryHour, entryMin] = formData.entryTime.split(':').map(Number);
        const [exitHour, exitMin] = formData.exitTime.split(':').map(Number);
        const totalMinutes = (exitHour * 60 + exitMin) - (entryHour * 60 + entryMin);
        if (totalMinutes <= 0) return '';
        if (totalMinutes <= 5) return '1 min';
        if (totalMinutes <= 15) return '5 min';
        if (totalMinutes <= 30) return '15 min';
        if (totalMinutes <= 60) return '30 min';
        if (totalMinutes <= 120) return '1 hour';
        if (totalMinutes <= 240) return '2 hour';
        return '4 hour';
      }
      return 'Intraday';
    }
    
    const daysDiff = Math.ceil((exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff <= 1) return 'Daily';
    if (daysDiff <= 7) return `${daysDiff} days`;
    if (daysDiff <= 14) return '1-2 weeks';
    if (daysDiff <= 30) return 'Weekly';
    if (daysDiff <= 90) return 'Monthly';
    return `${Math.round(daysDiff / 30)} months`;
  }, [formData.entryDate, formData.exitDate, formData.entryTime, formData.exitTime]);

  // Update timeFrame when auto-calculated
  useEffect(() => {
    if (autoTimeFrame && !timeFrameManuallySet) {
      setFormData(prev => ({ ...prev, timeFrame: autoTimeFrame }));
    }
  }, [autoTimeFrame, timeFrameManuallySet]);

  // Calculate P&L and Risk Reward
  const calculations = useMemo(() => {
    const entry = parseFloat(formData.entryPrice) || 0;
    const exit = parseFloat(formData.exitPrice) || 0;
    const sl = parseFloat(formData.stopLoss) || 0;
    const target = parseFloat(formData.target) || 0;
    const qty = parseInt(formData.quantity) || 1;
    const isLong = formData.tradeType === 'long';

    console.log('🧮 [EditModal] Calculating with values:', {
      entry, exit, sl, target, qty, isLong,
      rawValues: { ...formData }
    });

    let pnl = 0, pnlPercent = 0, riskReward = 0, risk = 0, reward = 0;

    if (entry > 0) {
      if (exit > 0) {
        pnl = isLong ? (exit - entry) * qty : (entry - exit) * qty;
        pnlPercent = isLong ? ((exit - entry) / entry) * 100 : ((entry - exit) / entry) * 100;
        console.log('🧮 [EditModal] P&L calculated:', { pnl, pnlPercent });
      }
      if (sl > 0) {
        risk = isLong ? Math.abs(entry - sl) : Math.abs(sl - entry);
        if (target > 0) {
          reward = isLong ? Math.abs(target - entry) : Math.abs(entry - target);
        } else if (exit > 0) {
          reward = isLong ? (exit - entry) : (entry - exit);
        }
        if (risk > 0) riskReward = Math.abs(reward) / risk;
        console.log('🧮 [EditModal] Risk/Reward:', { risk, reward, riskReward });
      }
    }
    
    console.log('🧮 [EditModal] Final calculations:', { pnl, pnlPercent, riskReward });
    return { pnl, pnlPercent, riskReward, risk, reward };
  }, [formData.entryPrice, formData.exitPrice, formData.stopLoss, formData.target, formData.quantity, formData.tradeType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('📝 [EditModal] Form submitted with formData:', formData);

    try {
      const tradeData = {
        symbol: formData.symbol.toUpperCase(),
        exchange: formData.exchange,
        segment: formData.segment as 'equity' | 'futures' | 'options',
        tradeType: formData.tradeType as 'long' | 'short',
        quantity: parseInt(formData.quantity),
        entryPrice: parseFloat(formData.entryPrice),
        exitPrice: formData.exitPrice ? parseFloat(formData.exitPrice) : undefined,
        stopLoss: formData.stopLoss ? parseFloat(formData.stopLoss) : undefined,
        target: formData.target ? parseFloat(formData.target) : undefined,
        entryDate: new Date(formData.entryDate).toISOString(),
        exitDate: formData.exitDate ? new Date(formData.exitDate).toISOString() : undefined,
        entryTime: formData.entryTime || undefined,
        exitTime: formData.exitTime || undefined,
        timeFrame: formData.timeFrame || undefined,
        status: formData.exitPrice ? 'closed' as const : 'open' as const,
        strategy: formData.strategy || undefined,
        psychology: formData.psychology || undefined,
        mistake: formData.mistake || undefined,
        riskRewardRatio: calculations.riskReward || undefined,
        notes: formData.notes || undefined,
        charges: trade.charges || 0,
      };

      const result = await updateTrade(trade.id, tradeData);
      if (result.success && result.trade) {
        onSave(result.trade);
        onClose();
      } else {
        setError(result.error || 'Failed to save trade. Is backend running?');
      }
    } catch (err) {
      setError('Failed to save trade. Check if backend is running.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">Edit Trade</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Instrument Type Toggle */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">Instrument Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setInstrumentType('symbol');
                    setFormData({ ...formData, symbol: '', exchange: 'NSE' });
                  }}
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    instrumentType === 'symbol'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  Stock Symbol
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInstrumentType('index');
                    setFormData({ ...formData, symbol: '', exchange: 'NSE' });
                  }}
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    instrumentType === 'index'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  📊 Index
                </button>
              </div>
            </div>

            {/* Symbol or Index Input */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {instrumentType === 'symbol' ? 'Symbol *' : 'Index *'}
              </label>
              {instrumentType === 'symbol' ? (
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                  className="input"
                  placeholder="e.g., RELIANCE, TCS, INFY"
                  required
                />
              ) : (
                <IndexInput
                  value={formData.symbol}
                  onChange={(symbol, exchange) => setFormData({ ...formData, symbol, exchange })}
                  placeholder="Select an index..."
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Exchange</label>
              <select
                value={formData.exchange}
                onChange={(e) => setFormData({ ...formData, exchange: e.target.value })}
                className="input"
              >
                <option value="NSE">NSE</option>
                <option value="BSE">BSE</option>
                <option value="NFO">NFO</option>
                <option value="MCX">MCX</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Segment</label>
              <select
                value={formData.segment}
                onChange={(e) => setFormData({ ...formData, segment: e.target.value as 'equity' | 'futures' | 'options' })}
                className="input"
              >
                <option value="equity">Equity</option>
                <option value="futures">Futures</option>
                <option value="options">Options</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Trade Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, tradeType: 'long' })}
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                    formData.tradeType === 'long'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  Long
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, tradeType: 'short' })}
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                    formData.tradeType === 'short'
                      ? 'bg-red-600 text-white'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  Short
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Quantity *</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="input"
                placeholder="0"
                required
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Entry Price *</label>
              <input
                type="number"
                step="0.01"
                value={formData.entryPrice}
                onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
                className="input"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Stop Loss</label>
              <input
                type="number"
                step="0.01"
                value={formData.stopLoss}
                onChange={(e) => setFormData({ ...formData, stopLoss: e.target.value })}
                className="input"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Target</label>
              <input
                type="number"
                step="0.01"
                value={formData.target}
                onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                className="input"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Exit Price</label>
              <input
                type="number"
                step="0.01"
                value={formData.exitPrice}
                onChange={(e) => setFormData({ ...formData, exitPrice: e.target.value })}
                className="input"
                placeholder="Leave empty if open"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Entry Date *</label>
              <input
                type="date"
                value={formData.entryDate}
                onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Exit Date</label>
              <input
                type="date"
                value={formData.exitDate}
                onChange={(e) => setFormData({ ...formData, exitDate: e.target.value })}
                className="input"
              />
            </div>

            {/* Entry/Exit Time - shown when same day trade */}
            {isSameDay && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Entry Time <span className="text-slate-500">(optional)</span>
                  </label>
                  <input
                    type="time"
                    value={formData.entryTime}
                    onChange={(e) => setFormData({ ...formData, entryTime: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Exit Time <span className="text-slate-500">(optional)</span>
                  </label>
                  <input
                    type="time"
                    value={formData.exitTime}
                    onChange={(e) => setFormData({ ...formData, exitTime: e.target.value })}
                    className="input"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Time Frame
                {autoTimeFrame && !timeFrameManuallySet && (
                  <span className="ml-2 text-xs text-indigo-400">(auto-calculated)</span>
                )}
                {timeFrameManuallySet && (
                  <button
                    type="button"
                    onClick={() => {
                      setTimeFrameManuallySet(false);
                      setFormData({ ...formData, timeFrame: autoTimeFrame });
                    }}
                    className="ml-2 text-xs text-amber-400 hover:text-amber-300"
                  >
                    ↺ Reset to auto
                  </button>
                )}
              </label>
              <TimeFrameInput
                value={formData.timeFrame}
                onChange={(value) => {
                  setFormData({ ...formData, timeFrame: value });
                  if (value !== autoTimeFrame) {
                    setTimeFrameManuallySet(true);
                  }
                }}
                placeholder="Select or enter time frame..."
              />
            </div>

            {/* Calculations Display */}
            {(formData.entryPrice && (formData.exitPrice || formData.stopLoss)) && (
              <div className="col-span-2 p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Trade Calculations
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  {formData.exitPrice && (
                    <>
                      <div>
                        <p className="text-xs text-slate-400">P&L</p>
                        <p className={`text-lg font-bold ${calculations.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {calculations.pnl >= 0 ? '+' : ''}₹{calculations.pnl.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">P&L %</p>
                        <p className={`text-lg font-bold ${calculations.pnlPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {calculations.pnlPercent >= 0 ? '+' : ''}{calculations.pnlPercent.toFixed(2)}%
                        </p>
                      </div>
                    </>
                  )}
                  {formData.stopLoss && (
                    <div>
                      <p className="text-xs text-slate-400">Risk Reward</p>
                      <p className={`text-lg font-bold ${calculations.riskReward >= 1 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        1:{calculations.riskReward.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">Strategy</label>
              <StrategyInput
                value={formData.strategy}
                onChange={(value) => setFormData({ ...formData, strategy: value })}
                placeholder="Select or type strategy..."
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">Psychology / Mindset</label>
              <PsychologyInput
                value={formData.psychology}
                onChange={(value) => setFormData({ ...formData, psychology: value })}
                placeholder="How were you feeling during this trade?"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Mistake (if any)
              </label>
              <MistakeInput
                value={formData.mistake}
                onChange={(value) => setFormData({ ...formData, mistake: value })}
                placeholder="Did you make any mistake?"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="input min-h-[80px]"
                placeholder="Trade notes..."
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 btn-primary flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Update Trade
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function TradeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    setMounted(true);
    const loadTrade = async () => {
      if (params.id) {
        const tradeData = await getTradeById(params.id as string);
        setTrade(tradeData);
      }
    };
    loadTrade();
  }, [params.id]);

  const handleDelete = async () => {
    if (trade) {
      await deleteTrade(trade.id);
      router.push('/trades');
    }
  };

  const handleSave = (updatedTrade: Trade) => {
    setTrade(updatedTrade);
  };

  // Generate realistic price chart data
  const chartData = useMemo(() => {
    if (!trade) return [];
    
    const entryPrice = trade.entryPrice;
    const exitPrice = trade.exitPrice || entryPrice;
    const isLong = trade.tradeType === 'long';
    const isProfit = trade.pnl ? trade.pnl >= 0 : (isLong ? exitPrice >= entryPrice : exitPrice <= entryPrice);
    
    const entryDate = new Date(trade.entryDate);
    const exitDate = trade.exitDate ? new Date(trade.exitDate) : null;
    
    // Check if entry and exit are on the same day
    const isSameDay = exitDate && 
      entryDate.toDateString() === exitDate.toDateString();
    
    // Get entry and exit times for intraday
    const entryTime = trade.entryTime || '09:15';
    const exitTime = trade.exitTime || '15:30';
    
    // Determine time labels based on timeFrame or same-day trade
    let timeLabels: string[] = [];
    let dataPoints = 20;
    
    if (isSameDay) {
      // Intraday - use actual time range
      const [entryHour, entryMin] = entryTime.split(':').map(Number);
      const [exitHour, exitMin] = exitTime.split(':').map(Number);
      const startMinutes = entryHour * 60 + entryMin;
      const endMinutes = exitHour * 60 + exitMin;
      const totalMinutes = Math.max(endMinutes - startMinutes, 60);
      
      // Determine interval based on time frame or total duration
      let interval = 15; // default 15 min intervals
      if (trade.timeFrame) {
        const tf = trade.timeFrame.toLowerCase();
        if (tf.includes('min')) {
          interval = parseInt(tf) || 15;
        } else if (tf.includes('hour')) {
          interval = (parseInt(tf) || 1) * 60;
        }
      }
      
      dataPoints = Math.min(Math.ceil(totalMinutes / interval) + 1, 30);
      
      for (let i = 0; i < dataPoints; i++) {
        const currentMinutes = startMinutes + (i * totalMinutes / (dataPoints - 1));
        const hour = Math.floor(currentMinutes / 60);
        const min = Math.round(currentMinutes % 60);
        timeLabels.push(`${hour}:${min.toString().padStart(2, '0')}`);
      }
    } else if (trade.timeFrame) {
      const tf = trade.timeFrame.toLowerCase();
      if (tf.includes('min')) {
        const minutes = parseInt(tf) || 15;
        dataPoints = Math.min(Math.ceil(360 / minutes), 25); // 6 hours
        for (let i = 0; i < dataPoints; i++) {
          const hour = 9 + Math.floor((i * minutes) / 60);
          const min = (i * minutes) % 60;
          timeLabels.push(`${hour}:${min.toString().padStart(2, '0')}`);
        }
      } else if (tf.includes('hour')) {
        const hours = parseInt(tf) || 1;
        dataPoints = Math.min(Math.ceil(7 / hours) + 1, 15);
        for (let i = 0; i < dataPoints; i++) {
          const hour = 9 + (i * hours);
          if (hour <= 16) timeLabels.push(`${hour}:00`);
        }
        dataPoints = timeLabels.length;
      } else {
        dataPoints = 20;
        for (let i = 0; i < dataPoints; i++) {
          timeLabels.push(`Day ${i + 1}`);
        }
      }
    } else if (exitDate) {
      // Multi-day trade
      const daysDiff = Math.ceil((exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
      dataPoints = Math.min(Math.max(daysDiff + 1, 8), 25);
      
      for (let i = 0; i < dataPoints; i++) {
        const date = new Date(entryDate);
        date.setDate(date.getDate() + Math.round(i * daysDiff / (dataPoints - 1)));
        timeLabels.push(date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
      }
    } else {
      dataPoints = 15;
      for (let i = 0; i < dataPoints; i++) {
        timeLabels.push(`Day ${i + 1}`);
      }
    }
    
    // Generate realistic price movement
    const priceRange = Math.abs(exitPrice - entryPrice);
    const volatility = Math.max(priceRange * 0.3, entryPrice * 0.005); // At least 0.5% volatility
    
    // Use seeded random for consistent chart (based on trade id)
    const seed = trade.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const seededRandom = (i: number) => {
      const x = Math.sin(seed + i * 9999) * 10000;
      return x - Math.floor(x);
    };
    
    const prices: number[] = [entryPrice];
    
    for (let i = 1; i < dataPoints; i++) {
      const progress = i / (dataPoints - 1);
      const targetAtPoint = entryPrice + (exitPrice - entryPrice) * progress;
      
      // Add realistic fluctuation
      const randomWalk = (seededRandom(i) - 0.5) * volatility * 2;
      const meanReversion = (targetAtPoint - prices[i - 1]) * 0.3;
      
      let newPrice = prices[i - 1] + randomWalk + meanReversion;
      
      // Ensure last point is exit price
      if (i === dataPoints - 1) {
        newPrice = exitPrice;
      }
      
      prices.push(Math.round(newPrice * 100) / 100);
    }
    
    return timeLabels.map((time, i) => ({
      time,
      price: prices[i],
    }));
  }, [trade]);

  if (!mounted) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-800 rounded w-48" />
          <div className="h-96 bg-slate-800 rounded-2xl" />
        </div>
      </AppLayout>
    );
  }

  if (!trade) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold text-white mb-2">Trade not found</h2>
          <p className="text-slate-400 mb-6">The trade you're looking for doesn't exist.</p>
          <Link href="/trades" className="btn-primary inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Trades
          </Link>
        </div>
      </AppLayout>
    );
  }

  // Recalculate P&L correctly based on trade type
  // For long: profit when exit > entry
  // For short: profit when exit < entry
  const calculatePnL = () => {
    console.log('📊 [TradeDetail] Calculating P&L for:', trade.symbol, {
      tradeType: trade.tradeType,
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice,
      quantity: trade.quantity,
      status: trade.status,
      storedPnL: trade.pnl
    });
    
    if (!trade.exitPrice || trade.status !== 'closed') {
      console.log('📊 [TradeDetail] Trade is open, returning 0 P&L');
      return { pnl: 0, pnlPercentage: 0 };
    }
    
    const entry = trade.entryPrice;
    const exit = trade.exitPrice;
    const qty = trade.quantity;
    const charges = trade.charges || 0;
    
    let pnl: number;
    let pnlPercentage: number;
    
    if (trade.tradeType === 'long') {
      // Long trade: buy low, sell high
      // Profit = (exitPrice - entryPrice) * quantity
      pnl = (exit - entry) * qty - charges;
      pnlPercentage = ((exit - entry) / entry) * 100;
      console.log('📊 [TradeDetail] LONG trade result:', { 
        pnl, 
        pnlPercentage, 
        formula: `(${exit} - ${entry}) * ${qty} - ${charges} = ${pnl}`,
        isProfit: pnl >= 0 ? 'PROFIT ✅' : 'LOSS ❌'
      });
    } else {
      // Short trade: sell high, buy low
      // Profit = (entryPrice - exitPrice) * quantity
      pnl = (entry - exit) * qty - charges;
      pnlPercentage = ((entry - exit) / entry) * 100;
      console.log('📊 [TradeDetail] SHORT trade result:', { 
        pnl, 
        pnlPercentage, 
        formula: `(${entry} - ${exit}) * ${qty} - ${charges} = ${pnl}`,
        isProfit: pnl >= 0 ? 'PROFIT ✅' : 'LOSS ❌'
      });
    }
    
    return { pnl, pnlPercentage };
  };
  
  const { pnl, pnlPercentage } = calculatePnL();
  const isProfit = pnl >= 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/trades"
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{trade.symbol}</h1>
                <span className={`badge ${trade.tradeType === 'long' ? 'badge-success' : 'badge-danger'}`}>
                  {trade.tradeType.toUpperCase()}
                </span>
                <span className={`badge ${trade.status === 'open' ? 'badge-warning' : 'badge-info'}`}>
                  {trade.status.toUpperCase()}
                </span>
              </div>
              <p className="text-slate-400 mt-1">{trade.exchange} • {trade.segment}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowEditModal(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button 
              onClick={() => setShowDeleteModal(true)}
              className="btn-danger flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <DollarSign className="w-4 h-4" />
              Entry Price
            </div>
            <p className="text-xl font-bold text-white">₹{trade.entryPrice.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <Target className="w-4 h-4" />
              Exit Price
            </div>
            <p className="text-xl font-bold text-white">
              {trade.exitPrice ? `₹${trade.exitPrice.toLocaleString()}` : '-'}
            </p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              P&L
            </div>
            <p className={`text-xl font-bold ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
              {trade.status === 'closed' ? (
                <>
                  {isProfit ? '+' : ''}₹{pnl.toLocaleString()}
                  <span className="text-sm ml-2">({pnlPercentage.toFixed(2)}%)</span>
                </>
              ) : (
                'Open'
              )}
            </p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <Clock className="w-4 h-4" />
              Duration
            </div>
            <p className="text-xl font-bold text-white">
              {trade.exitDate 
                ? `${Math.ceil((new Date(trade.exitDate).getTime() - new Date(trade.entryDate).getTime()) / (1000 * 60 * 60 * 24))} days`
                : 'Active'}
            </p>
          </div>
        </div>

        {/* Risk Management Stats */}
        {(trade.stopLoss || trade.target || trade.riskRewardRatio || trade.timeFrame) && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {trade.stopLoss && (
              <div className="stat-card border-l-4 border-red-500">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  🛑 Stop Loss
                </div>
                <p className="text-xl font-bold text-red-400">₹{trade.stopLoss.toLocaleString()}</p>
              </div>
            )}
            {trade.target && (
              <div className="stat-card border-l-4 border-emerald-500">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  🎯 Target
                </div>
                <p className="text-xl font-bold text-emerald-400">₹{trade.target.toLocaleString()}</p>
              </div>
            )}
            {trade.riskRewardRatio && (
              <div className="stat-card border-l-4 border-indigo-500">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  ⚖️ Risk Reward
                </div>
                <p className={`text-xl font-bold ${trade.riskRewardRatio >= 1 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  1:{trade.riskRewardRatio.toFixed(2)}
                </p>
              </div>
            )}
            {trade.timeFrame && (
              <div className="stat-card border-l-4 border-purple-500">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  ⏱️ Time Frame
                </div>
                <p className="text-xl font-bold text-purple-400">{trade.timeFrame}</p>
              </div>
            )}
          </div>
        )}

        {/* Price Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Price Movement</h3>
            {trade.timeFrame && (
              <span className="text-sm text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full">
                ⏱️ {trade.timeFrame} Chart
              </span>
            )}
            {!trade.timeFrame && trade.exitDate && 
              new Date(trade.entryDate).toDateString() === new Date(trade.exitDate).toDateString() && (
              <span className="text-sm text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full">
                📅 Intraday Trade
              </span>
            )}
          </div>
          <div className="h-64">
            <TradeChart data={chartData} isProfit={isProfit} />
          </div>
        </div>

        {/* Trade Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Trade Details</h3>
            <div className="space-y-4">
              <div className="flex justify-between py-3 border-b border-white/5">
                <span className="text-slate-400">Quantity</span>
                <span className="text-white font-medium">{trade.quantity}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-white/5">
                <span className="text-slate-400">Entry Value</span>
                <span className="text-white font-medium">
                  ₹{(trade.entryPrice * trade.quantity).toLocaleString()}
                </span>
              </div>
              {trade.exitPrice && (
                <div className="flex justify-between py-3 border-b border-white/5">
                  <span className="text-slate-400">Exit Value</span>
                  <span className="text-white font-medium">
                    ₹{(trade.exitPrice * trade.quantity).toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-3 border-b border-white/5">
                <span className="text-slate-400">Charges</span>
                <span className="text-white font-medium">₹{(trade.charges || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-slate-400">Net P&L</span>
                <span className={`font-medium ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                  {trade.status === 'closed' ? `${isProfit ? '+' : ''}₹${pnl.toLocaleString()}` : '-'}
                </span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Dates & Notes</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 py-3 border-b border-white/5">
                <Calendar className="w-5 h-5 text-slate-400" />
                <div className="flex-1">
                  <p className="text-sm text-slate-400">Entry Date</p>
                  <p className="text-white">
                    {new Date(trade.entryDate).toLocaleDateString('en-IN', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                    {trade.entryTime && (
                      <span className="ml-2 text-indigo-400">@ {trade.entryTime}</span>
                    )}
                  </p>
                </div>
              </div>
              {trade.exitDate && (
                <div className="flex items-center gap-3 py-3 border-b border-white/5">
                  <Calendar className="w-5 h-5 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-400">Exit Date</p>
                    <p className="text-white">
                      {new Date(trade.exitDate).toLocaleDateString('en-IN', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                      {trade.exitTime && (
                        <span className="ml-2 text-indigo-400">@ {trade.exitTime}</span>
                      )}
                    </p>
                  </div>
                </div>
              )}
              {trade.strategy && (
                <div className="flex items-center gap-3 py-3 border-b border-white/5">
                  <Tag className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-400">Strategy</p>
                    <p className="text-white">{trade.strategy}</p>
                  </div>
                </div>
              )}
              {trade.psychology && (
                <div className="flex items-center gap-3 py-3 border-b border-white/5">
                  <span className="text-xl">🧠</span>
                  <div>
                    <p className="text-sm text-slate-400">Psychology/Mindset</p>
                    <p className="text-white">{trade.psychology}</p>
                  </div>
                </div>
              )}
              {trade.mistake && (
                <div className="flex items-center gap-3 py-3 border-b border-white/5">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <p className="text-sm text-slate-400">Mistake</p>
                    <p className="text-amber-400">{trade.mistake}</p>
                  </div>
                </div>
              )}
              {trade.notes && (
                <div className="flex items-start gap-3 py-3">
                  <FileText className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-400">Notes</p>
                    <p className="text-white">{trade.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass rounded-2xl w-full max-w-md p-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Delete Trade</h3>
              <p className="text-slate-400 mb-6">
                Are you sure you want to delete this trade for <span className="text-white font-medium">{trade.symbol}</span>?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 btn-secondary">
                  Cancel
                </button>
                <button onClick={handleDelete} className="flex-1 btn-danger">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && trade && (
        <EditTradeModal 
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          trade={trade}
          onSave={handleSave}
        />
      )}
    </AppLayout>
  );
}
