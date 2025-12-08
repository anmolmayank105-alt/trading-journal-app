'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import AddTradeModal from '@/components/AddTradeModal';
import DeleteModal from '@/components/DeleteModal';
import { getTrades, deleteTrade } from '@/lib/api/trades';
import { Trade, TradeFilter } from '@/types';
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  Eye,
  TrendingUp,
  TrendingDown,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

function TradesContent() {
  const searchParams = useSearchParams();
  const symbolFromUrl = searchParams.get('symbol');
  const dateFromUrl = searchParams.get('date');
  
  const [trades, setTrades] = useState<Trade[]>([]);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState(symbolFromUrl || '');
  const [debouncedSearch, setDebouncedSearch] = useState(symbolFromUrl || '');
  const [filters, setFilters] = useState<TradeFilter>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [deletingTrade, setDeletingTrade] = useState<Trade | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Set date filter if coming from calendar
  useEffect(() => {
    if (dateFromUrl) {
      setShowFilters(true);
      setFilters(prev => ({ ...prev, exitDate: dateFromUrl }));
    }
  }, [dateFromUrl]);

  // ⚡ OPTIMIZATION: Debounce search input to reduce re-renders
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300); // Wait 300ms after user stops typing
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Helper to calculate correct P&L
  const getCorrectPnL = useCallback((trade: Trade) => {
    if (!trade.exitPrice || trade.status !== 'closed') {
      return { pnl: 0, pnlPercentage: 0 };
    }
    
    const entry = trade.entryPrice;
    const exit = trade.exitPrice;
    const qty = trade.quantity;
    const charges = trade.charges || 0;
    
    if (trade.tradeType === 'long') {
      // Long: profit when exit > entry
      const pnl = (exit - entry) * qty - charges;
      const pnlPercentage = ((exit - entry) / entry) * 100;
      return { pnl, pnlPercentage };
    } else {
      // Short: profit when entry > exit
      const pnl = (entry - exit) * qty - charges;
      const pnlPercentage = ((entry - exit) / entry) * 100;
      return { pnl, pnlPercentage };
    }
  }, []);

  const loadTrades = useCallback(async () => {
    try {
      const userTrades = await getTrades(filters);
      setTrades(userTrades);
    } catch (error) {
      console.error('Failed to load trades:', error);
      setTrades([]);
    }
  }, [filters]);

  useEffect(() => {
    setMounted(true);
    loadTrades();
  }, [loadTrades]);

  // Filter trades by search query
  const filteredTrades = useMemo(() => {
    if (!debouncedSearch) return trades;
    const query = debouncedSearch.toLowerCase();
    return trades.filter(trade => 
      trade.symbol.toLowerCase().includes(query) ||
      trade.strategy?.toLowerCase().includes(query)
    );
  }, [trades, debouncedSearch]);

  // Pagination
  const totalPages = Math.ceil(filteredTrades.length / itemsPerPage);
  const paginatedTrades = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTrades.slice(start, start + itemsPerPage);
  }, [filteredTrades, currentPage]);

  const handleDeleteConfirm = useCallback(async () => {
    if (deletingTrade) {
      await deleteTrade(deletingTrade.id);
      loadTrades();
      setShowDeleteModal(false);
      setDeletingTrade(null);
    }
  }, [deletingTrade, loadTrades]);

  const handleEdit = useCallback((trade: Trade) => {
    setEditingTrade(trade);
    setShowAddModal(true);
  }, []);

  const handleSave = useCallback(() => {
    loadTrades();
  }, [loadTrades]);

  const handleExport = useCallback(() => {
    const dataToExport = filteredTrades.map(trade => {
      const { pnl, pnlPercentage } = getCorrectPnL(trade);
      return {
        Symbol: trade.symbol,
        Exchange: trade.exchange,
        Segment: trade.segment,
        Type: trade.tradeType,
        Quantity: trade.quantity,
        'Entry Price': trade.entryPrice,
        'Stop Loss': trade.stopLoss || '',
        'Target': trade.target || '',
        'Exit Price': trade.exitPrice || '',
        'Entry Date': new Date(trade.entryDate).toLocaleDateString(),
        'Entry Time': trade.entryTime || '',
        'Exit Date': trade.exitDate ? new Date(trade.exitDate).toLocaleDateString() : '',
        'Exit Time': trade.exitTime || '',
        'Time Frame': trade.timeFrame || '',
        Status: trade.status,
        'P&L': trade.status === 'closed' ? pnl.toFixed(2) : '',
        'P&L %': trade.status === 'closed' ? pnlPercentage.toFixed(2) + '%' : '',
        'Risk Reward': trade.riskRewardRatio ? '1:' + trade.riskRewardRatio.toFixed(2) : '',
        Strategy: trade.strategy || '',
        Psychology: trade.psychology || '',
        Mistake: trade.mistake || '',
        Notes: trade.notes || '',
      };
    });

    // Create CSV content
    const headers = Object.keys(dataToExport[0] || {}).join(',');
    const rows = dataToExport.map(row => 
      Object.values(row).map(val => 
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(',')
    );
    const csv = [headers, ...rows].join('\n');

    // Download file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `trades_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, [filteredTrades, getCorrectPnL]);

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

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Trades</h1>
            <p className="text-slate-400 mt-1">
              {filteredTrades.length} trade{filteredTrades.length !== 1 ? 's' : ''} total
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleExport}
              disabled={filteredTrades.length === 0}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button 
              onClick={() => { setEditingTrade(null); setShowAddModal(true); }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Trade
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by symbol or strategy..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-colors duration-150"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center gap-2 ${showFilters ? 'bg-indigo-600/20 border-indigo-500/30' : ''}`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="card grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => {
                  const newFilters = { ...filters, status: e.target.value as 'open' | 'closed' || undefined };
                  setFilters(newFilters);
                }}
                className="input"
              >
                <option value="">All</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Type</label>
              <select
                value={filters.tradeType || ''}
                onChange={(e) => {
                  const newFilters = { ...filters, tradeType: e.target.value as 'long' | 'short' || undefined };
                  setFilters(newFilters);
                }}
                className="input"
              >
                <option value="">All</option>
                <option value="long">Buy</option>
                <option value="short">Sell</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Segment</label>
              <select
                value={filters.segment || ''}
                onChange={(e) => {
                  const newFilters = { ...filters, segment: e.target.value as typeof filters.segment || undefined };
                  setFilters(newFilters);
                }}
                className="input"
              >
                <option value="">All</option>
                <option value="equity">Equity</option>
                <option value="futures">Futures</option>
                <option value="options">Options</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Date</label>
              <input
                type="date"
                value={filters.exitDate || ''}
                onChange={(e) => {
                  const newFilters = { ...filters, exitDate: e.target.value || undefined };
                  setFilters(newFilters);
                }}
                className="input"
                placeholder="Exit or Entry Date"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({});
                  setSearchQuery('');
                }}
                className="btn-secondary w-full"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Trades Table */}
        <div className="card overflow-hidden p-0">
          {paginatedTrades.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-slate-400 bg-white/5">
                      <th className="px-4 py-4 font-medium">Symbol</th>
                      <th className="px-4 py-4 font-medium">Type</th>
                      <th className="px-4 py-4 font-medium">Qty</th>
                      <th className="px-4 py-4 font-medium">Entry</th>
                      <th className="px-4 py-4 font-medium">Exit</th>
                      <th className="px-4 py-4 font-medium">P&L</th>
                      <th className="px-4 py-4 font-medium">Date</th>
                      <th className="px-4 py-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTrades.map(trade => (
                      <tr key={trade.id} className="table-row">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${trade.tradeType === 'long' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                              {trade.tradeType === 'long' ? (
                                <TrendingUp className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-400" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-white">{trade.symbol}</div>
                              <div className="text-xs text-slate-400">{trade.exchange} • {trade.segment}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`badge ${trade.tradeType === 'long' ? 'badge-success' : 'badge-danger'}`}>
                            {trade.tradeType === 'long' ? 'BUY' : 'SELL'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-300">{trade.quantity}</td>
                        <td className="px-4 py-4 text-slate-300">₹{trade.entryPrice.toLocaleString()}</td>
                        <td className="px-4 py-4 text-slate-300">
                          {trade.exitPrice ? `₹${trade.exitPrice.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-4 py-4">
                          {trade.status === 'closed' && trade.exitPrice ? (
                            (() => {
                              const { pnl } = getCorrectPnL(trade);
                              return (
                                <span className={`font-medium ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {pnl >= 0 ? '+' : ''}₹{pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </span>
                              );
                            })()
                          ) : (
                            <span className="badge badge-warning">OPEN</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-slate-400 text-sm">
                          {trade.status === 'closed' && trade.exitDate
                            ? new Date(trade.exitDate).toLocaleDateString('en-IN')
                            : new Date(trade.entryDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1">
                            <Link
                              href={`/trades/${trade.id}`}
                              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleEdit(trade)}
                              className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setDeletingTrade(trade); setShowDeleteModal(true); }}
                              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-4 border-t border-white/5">
                  <span className="text-sm text-slate-400">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                    {Math.min(currentPage * itemsPerPage, filteredTrades.length)} of {filteredTrades.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-slate-300">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-16 text-center text-slate-400">
              <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium text-white mb-2">No trades found</h3>
              <p className="mb-6">Start tracking your trades by adding your first one</p>
              <button 
                onClick={() => { setEditingTrade(null); setShowAddModal(true); }}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Your First Trade
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddTradeModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingTrade(null); }}
        onSave={handleSave}
        editTrade={editingTrade}
      />
      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeletingTrade(null); }}
        onConfirm={handleDeleteConfirm}
        trade={deletingTrade}
      />
    </AppLayout>
  );
}

export default function TradesPage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-800 rounded w-48" />
          <div className="h-96 bg-slate-800 rounded-xl" />
        </div>
      </AppLayout>
    }>
      <TradesContent />
    </Suspense>
  );
}
