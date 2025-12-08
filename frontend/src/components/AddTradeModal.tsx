'use client';

import React, { useState, useEffect, useMemo } from 'react';
import StrategyInput from '@/components/StrategyInput';
import PsychologyInput from '@/components/PsychologyInput';
import MistakeInput from '@/components/MistakeInput';
import IndexInput from '@/components/IndexInput';
import SymbolInput from '@/components/SymbolInput';
import TimeFrameInput from '@/components/TimeFrameInput';
import { createTrade, updateTrade, exitTrade } from '@/lib/api/trades';
import { Trade } from '@/types';
import {
  X,
  TrendingUp,
  Loader2,
  Target,
  AlertTriangle,
} from 'lucide-react';

interface AddTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editTrade?: Trade | null;
}

const AddTradeModal = React.memo(({ isOpen, onClose, onSave, editTrade }: AddTradeModalProps) => {
  const [instrumentType, setInstrumentType] = useState<'symbol' | 'index'>('symbol');
  const [selectedIndex, setSelectedIndex] = useState(''); // Store base index like "NIFTY"
  const [strikePrice, setStrikePrice] = useState(''); // Store strike/level like "25000"
  const [optionType, setOptionType] = useState<'CE' | 'PE' | ''>(''); // Call or Put option
  const [formData, setFormData] = useState({
    symbol: '',
    exchange: 'NSE',
    segment: 'equity' as 'equity' | 'futures' | 'options',
    tradeType: 'long' as 'long' | 'short',
    quantity: '',
    entryPrice: '',
    exitPrice: '',
    stopLoss: '',
    target: '',
    entryDate: new Date().toISOString().split('T')[0],
    exitDate: '',
    entryTime: '',
    exitTime: '',
    timeFrame: '',
    status: 'open' as 'open' | 'closed',
    strategy: '',
    psychology: '',
    mistake: '',
    notes: '',
    brokerage: '',
    exitBrokerage: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if entry and exit are same day
  const isSameDay = formData.entryDate && formData.exitDate && formData.entryDate === formData.exitDate;

  // Calculate P&L and Risk Reward
  const calculations = useMemo(() => {
    const entry = parseFloat(formData.entryPrice) || 0;
    const exit = parseFloat(formData.exitPrice) || 0;
    const sl = parseFloat(formData.stopLoss) || 0;
    const target = parseFloat(formData.target) || 0;
    const qty = parseInt(formData.quantity) || 1;
    const entryBrokerage = parseFloat(formData.brokerage) || 0;
    const exitBrokerage = parseFloat(formData.exitBrokerage) || 0;
    const totalBrokerage = entryBrokerage + exitBrokerage;
    const isLong = formData.tradeType === 'long';

    let grossPnl = 0;
    let pnl = 0;
    let pnlPercent = 0;
    let riskReward = 0;
    let risk = 0;
    let reward = 0;

    if (entry > 0) {
      if (exit > 0) {
        grossPnl = isLong ? (exit - entry) * qty : (entry - exit) * qty;
        pnl = grossPnl - totalBrokerage;
        pnlPercent = isLong ? ((exit - entry) / entry) * 100 : ((entry - exit) / entry) * 100;
      }

      if (sl > 0) {
        risk = isLong ? Math.abs(entry - sl) : Math.abs(sl - entry);
        
        if (target > 0) {
          reward = isLong ? Math.abs(target - entry) : Math.abs(entry - target);
        } else if (exit > 0) {
          reward = isLong ? (exit - entry) : (entry - exit);
        }
        
        if (risk > 0) {
          riskReward = Math.abs(reward) / risk;
        }
      }
    }

    return { grossPnl, pnl, pnlPercent, brokerage: totalBrokerage, riskReward, risk, reward };
  }, [formData.entryPrice, formData.exitPrice, formData.stopLoss, formData.target, formData.quantity, formData.tradeType, formData.brokerage, formData.exitBrokerage]);

  useEffect(() => {
    if (editTrade) {
      const indexSymbols = ['NIFTY', 'SENSEX', 'BANKNIFTY', 'SPX', 'DJI', 'IXIC', 'FTSE', 'DAX', 'N225', 'HSI'];
      const isIndex = indexSymbols.some(idx => editTrade.symbol.toUpperCase().includes(idx));
      setInstrumentType(isIndex ? 'index' : 'symbol');
      
      // Extract base index, strike price, and option type if it's an index
      if (isIndex) {
        const match = editTrade.symbol.match(/^([A-Z]+)\s*(\d+)?\s*(CE|PE)?$/i);
        if (match) {
          setSelectedIndex(match[1]);
          setStrikePrice(match[2] || '');
          setOptionType((match[3]?.toUpperCase() as 'CE' | 'PE') || '');
        } else {
          setSelectedIndex(editTrade.symbol);
          setStrikePrice('');
          setOptionType('');
        }
      }
      
      // Helper to safely extract date from ISO string
      const getDateOnly = (dateStr?: string) => {
        if (!dateStr) return '';
        try {
          return dateStr.split('T')[0];
        } catch (e) {
          return '';
        }
      };
      
      setFormData({
        symbol: editTrade.symbol || '',
        exchange: editTrade.exchange || 'NSE',
        segment: editTrade.segment || 'equity',
        tradeType: editTrade.tradeType || 'long',
        quantity: editTrade.quantity?.toString() || '',
        entryPrice: editTrade.entryPrice?.toString() || '',
        exitPrice: editTrade.exitPrice?.toString() || '',
        stopLoss: editTrade.stopLoss?.toString() || '',
        target: editTrade.target?.toString() || '',
        entryDate: getDateOnly(editTrade.entryDate),
        exitDate: getDateOnly(editTrade.exitDate),
        entryTime: editTrade.entryTime || '',
        exitTime: editTrade.exitTime || '',
        timeFrame: editTrade.timeFrame || '',
        status: editTrade.status || 'open',
        strategy: editTrade.strategy || '',
        psychology: editTrade.psychology || '',
        mistake: editTrade.mistake || '',
        notes: editTrade.notes || '',
        brokerage: '',
        exitBrokerage: '',
      });
    } else {
      setInstrumentType('symbol');
      setSelectedIndex('');
      setStrikePrice('');
      setOptionType('');
      setFormData({
        symbol: '',
        exchange: 'NSE',
        segment: 'equity',
        tradeType: 'long',
        quantity: '',
        entryPrice: '',
        exitPrice: '',
        stopLoss: '',
        target: '',
        entryDate: new Date().toISOString().split('T')[0],
        exitDate: '',
        entryTime: '',
        exitTime: '',
        timeFrame: '',
        status: 'open',
        strategy: '',
        psychology: '',
        mistake: '',
        notes: '',
        brokerage: '',
        exitBrokerage: '',
      });
    }
  }, [editTrade, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // For editing existing trades
      if (editTrade) {
        const hasExitPrice = formData.exitPrice && parseFloat(formData.exitPrice) > 0;
        const wasOpen = editTrade.status === 'open';
        const isClosed = editTrade.status === 'closed';
        
        // Update trade details FIRST (before closing it)
        const updateData: any = {
          strategy: formData.strategy || undefined,
          notes: formData.notes || undefined,
          tags: [],
        };
        
        // For closed trades, allow updating exit price and dates
        if (isClosed) {
          if (formData.exitPrice && parseFloat(formData.exitPrice) > 0) {
            updateData.exitPrice = parseFloat(formData.exitPrice);
          }
          if (formData.entryDate) {
            updateData.entryDate = formData.entryDate;
          }
          if (formData.exitDate) {
            updateData.exitTime = formData.exitDate;
          }
        }
        
        // For open trades, allow updating all fields
        if (!isClosed) {
          updateData.symbol = formData.symbol.toUpperCase();
          updateData.exchange = formData.exchange;
          updateData.segment = formData.segment;
          updateData.tradeType = formData.tradeType;
          updateData.quantity = parseInt(formData.quantity);
          updateData.entryPrice = parseFloat(formData.entryPrice);
          updateData.stopLoss = formData.stopLoss ? parseFloat(formData.stopLoss) : undefined;
          updateData.target = formData.target ? parseFloat(formData.target) : undefined;
          updateData.entryTimestamp = new Date(formData.entryDate).toISOString();
          updateData.brokerage = parseFloat(formData.exitBrokerage) || 0;
        }
        
        const result = await updateTrade(editTrade.id, updateData);
        if (!result.success) {
          setError(result.error || 'Failed to update trade');
          return;
        }
        
        // THEN if adding exit price to an open trade, use exitTrade API
        if (hasExitPrice && wasOpen) {
          const exitResult = await exitTrade(
            editTrade.id,
            parseFloat(formData.exitPrice),
            formData.exitDate ? new Date(formData.exitDate).toISOString() : undefined
          );
          
          if (!exitResult.success) {
            setError(exitResult.error || 'Failed to exit trade');
            return;
          }
        }
      } else {
        // For creating new trades
        const tradeData = {
          symbol: formData.symbol.toUpperCase(),
          exchange: formData.exchange,
          segment: formData.segment,
          tradeType: formData.tradeType,
          quantity: parseInt(formData.quantity),
          entryPrice: parseFloat(formData.entryPrice),
          stopLoss: formData.stopLoss ? parseFloat(formData.stopLoss) : undefined,
          target: formData.target ? parseFloat(formData.target) : undefined,
          entryDate: formData.entryDate,
          entryTimestamp: new Date(formData.entryDate).toISOString(),
          status: 'open' as const,
          strategy: formData.strategy || undefined,
          notes: formData.notes || undefined,
          tags: [],
          brokerage: parseFloat(formData.brokerage) || 0,
        };
        
        const result = await createTrade(tradeData);
        if (!result.success) {
          setError(result.error || 'Failed to create trade');
          return;
        }
        
        // If exit price provided for new trade, immediately exit it
        if (formData.exitPrice && parseFloat(formData.exitPrice) > 0 && result.trade) {
          const exitResult = await exitTrade(
            result.trade.id,
            parseFloat(formData.exitPrice),
            formData.exitDate ? new Date(formData.exitDate).toISOString() : undefined
          );
          
          if (!exitResult.success) {
            setError('Trade created but failed to add exit price');
            return;
          }
        }
      }
      
      onSave();
      onClose();
    } catch (err) {
      console.error('Form submission error:', err);
      setError('Failed to save trade. Please check if backend is running.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">
            {editTrade ? 'Edit Trade' : 'Add New Trade'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-4 gap-3">
            {/* Instrument Type Toggle */}
            <div className="col-span-4">
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
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {instrumentType === 'symbol' ? 'Symbol *' : 'Index *'}
              </label>
              {instrumentType === 'symbol' ? (
                <SymbolInput
                  value={formData.symbol}
                  onChange={(symbol, exchange) => setFormData({ ...formData, symbol, exchange })}
                  placeholder="Search by name or symbol..."
                />
              ) : (
                <div className="space-y-3">
                  <IndexInput
                    value={selectedIndex}
                    onChange={(symbol, exchange) => {
                      setSelectedIndex(symbol);
                      setFormData({ ...formData, exchange });
                      // Combine index + strike price + option type
                      const parts = [symbol, strikePrice, optionType].filter(Boolean);
                      const fullSymbol = parts.join(' ');
                      setFormData(prev => ({ ...prev, symbol: fullSymbol, exchange }));
                    }}
                    placeholder="Select an index..."
                  />
                  {selectedIndex && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Strike Price / Level
                            <span className="text-xs text-slate-500 font-normal ml-2">
                              (e.g., 25000, 15000)
                            </span>
                          </label>
                          <input
                            type="text"
                            value={strikePrice}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              setStrikePrice(value);
                              // Update full symbol
                              const parts = [selectedIndex, value, optionType].filter(Boolean);
                              const fullSymbol = parts.join(' ');
                              setFormData(prev => ({ ...prev, symbol: fullSymbol }));
                            }}
                            placeholder="Enter strike/level (optional)"
                            className="input"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Option Type
                            <span className="text-xs text-slate-500 font-normal ml-2">(Optional)</span>
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const newType = optionType === 'CE' ? '' : 'CE';
                                setOptionType(newType);
                                const parts = [selectedIndex, strikePrice, newType].filter(Boolean);
                                const fullSymbol = parts.join(' ');
                                setFormData(prev => ({ ...prev, symbol: fullSymbol }));
                              }}
                              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                                optionType === 'CE'
                                  ? 'bg-green-600 text-white'
                                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
                              }`}
                            >
                              CE
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const newType = optionType === 'PE' ? '' : 'PE';
                                setOptionType(newType);
                                const parts = [selectedIndex, strikePrice, newType].filter(Boolean);
                                const fullSymbol = parts.join(' ');
                                setFormData(prev => ({ ...prev, symbol: fullSymbol }));
                              }}
                              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                                optionType === 'PE'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
                              }`}
                            >
                              PE
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
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
                onChange={(e) => setFormData({ ...formData, segment: e.target.value as typeof formData.segment })}
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
                  Buy
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
                  Sell
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Quantity *
                {editTrade?.status === 'closed' && <span className="text-xs text-amber-500 ml-2">(Read-only for closed trades)</span>}
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="input"
                placeholder="0"
                required
                min="1"
                disabled={editTrade?.status === 'closed'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Entry Price *
                <span className="text-xs text-slate-500 font-normal ml-2">
                  {formData.tradeType === 'short' ? '(Price you sold at)' : '(Price you bought at)'}
                </span>
                {editTrade?.status === 'closed' && <span className="text-xs text-amber-500 ml-2">(Read-only)</span>}
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.entryPrice}
                onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
                className="input"
                placeholder="0.00"
                required
                disabled={editTrade?.status === 'closed'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Entry Brokerage (₹)
                <span className="text-xs text-slate-500 font-normal ml-2">(Optional)</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.brokerage}
                onChange={(e) => setFormData({ ...formData, brokerage: e.target.value })}
                className="input"
                placeholder="0.00"
                disabled={editTrade?.status === 'closed'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Stop Loss
                <span className="text-xs text-slate-500 font-normal ml-2">
                  {formData.tradeType === 'short' ? '(Above entry)' : '(Below entry)'}
                </span>
              </label>
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
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Target
                <span className="text-xs text-slate-500 font-normal ml-2">
                  {formData.tradeType === 'short' ? '(Below entry)' : '(Above entry)'}
                </span>
              </label>
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
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Exit Price
                <span className="text-xs text-slate-500 font-normal ml-2">
                  {formData.tradeType === 'short' ? '(Price you bought back at)' : '(Price you sold at)'}
                </span>
              </label>
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
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Exit Brokerage (₹)
                <span className="text-xs text-slate-500 font-normal ml-2">(Optional)</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.exitBrokerage}
                onChange={(e) => setFormData({ ...formData, exitBrokerage: e.target.value })}
                className="input"
                placeholder="0.00"
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
                min={formData.entryDate}
                onChange={(e) => {
                  const newExitDate = e.target.value;
                  // Validate exit date is not before entry date
                  if (newExitDate && formData.entryDate && newExitDate < formData.entryDate) {
                    alert('Exit date cannot be before entry date!');
                    return;
                  }
                  setFormData({ ...formData, exitDate: newExitDate });
                }}
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
                    placeholder="09:15"
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
                    placeholder="15:30"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Time Frame
                <span className="text-xs text-slate-500 font-normal ml-2">(Optional)</span>
              </label>
              <TimeFrameInput
                value={formData.timeFrame}
                onChange={(value) => setFormData({ ...formData, timeFrame: value })}
                placeholder="Select or enter time frame..."
              />
            </div>

            {/* Calculations Display */}
            {(formData.entryPrice && (formData.exitPrice || formData.stopLoss)) && (
              <div className="col-span-4 p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Trade Calculations
                </h4>
                <div className="grid grid-cols-4 gap-4">
                  {formData.exitPrice && (
                    <>
                      <div>
                        <p className="text-xs text-slate-400">Gross P&L</p>
                        <p className={`text-lg font-bold ${calculations.grossPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {calculations.grossPnl >= 0 ? '+' : ''}₹{calculations.grossPnl.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Brokerage</p>
                        <p className="text-lg font-bold text-amber-400">
                          -₹{calculations.brokerage.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Net P&L</p>
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
                  {formData.stopLoss && !formData.exitPrice && (
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

            <div className="col-span-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">Strategy</label>
              <StrategyInput
                value={formData.strategy}
                onChange={(value) => setFormData({ ...formData, strategy: value })}
                placeholder="Select or type strategy..."
              />
            </div>

            <div className="col-span-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">Psychology / Mindset</label>
              <PsychologyInput
                value={formData.psychology}
                onChange={(value) => setFormData({ ...formData, psychology: value })}
                placeholder="How were you feeling during this trade?"
              />
            </div>

            <div className="col-span-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">Mistake / Learning</label>
              <MistakeInput
                value={formData.mistake}
                onChange={(value) => setFormData({ ...formData, mistake: value })}
                placeholder="Did you make any mistake?"
              />
            </div>

            <div className="col-span-4">
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
              {editTrade ? 'Update Trade' : 'Add Trade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

AddTradeModal.displayName = 'AddTradeModal';

export default AddTradeModal;
