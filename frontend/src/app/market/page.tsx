'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { 
  getWatchlists, 
  createWatchlist, 
  addToWatchlist, 
  removeFromWatchlist,
  deleteWatchlist,
  getQuotes, 
  getMarketIndices 
} from '@/lib/storage/watchlist';
import { Watchlist, StockQuote, MarketIndex } from '@/types';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  Star,
  X,
  RefreshCw,
  Eye,
  Trash2,
  Loader2,
} from 'lucide-react';
import { searchStocks, ALL_STOCK_SYMBOLS, UNIQUE_INDIAN_STOCKS } from '@/data/indianStocks';

// Index Card Component
const IndexCard = React.memo(({ index }: { index: MarketIndex }) => {
  const isPositive = index.change >= 0;
  
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-400">{index.symbol}</h3>
        <div className={`p-2 rounded-lg ${isPositive ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
          {isPositive ? (
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-400" />
          )}
        </div>
      </div>
      <p className="text-2xl font-bold text-white mt-2">
        {index.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </p>
      <div className={`flex items-center gap-2 mt-1 text-sm ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
        <span>{isPositive ? '+' : ''}{index.change.toFixed(2)}</span>
        <span>({isPositive ? '+' : ''}{index.changePercent.toFixed(2)}%)</span>
      </div>
    </div>
  );
});
IndexCard.displayName = 'IndexCard';

// Stock Row Component
const StockRow = React.memo(({ 
  quote, 
  isWatchlisted,
  onAdd,
  onRemove 
}: { 
  quote: StockQuote;
  isWatchlisted: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) => {
  const isPositive = quote.changePercent >= 0;
  
  return (
    <tr className="table-row">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isPositive ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
            {isPositive ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
          </div>
          <div>
            <div className="font-medium text-white">{quote.symbol}</div>
            <div className="text-xs text-slate-400">{quote.exchange}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-white font-medium">
        ₹{quote.ltp.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </td>
      <td className="px-4 py-3">
        <span className={isPositive ? 'text-emerald-400' : 'text-red-400'}>
          {isPositive ? '+' : ''}{quote.change.toFixed(2)}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={`badge ${isPositive ? 'badge-success' : 'badge-danger'}`}>
          {isPositive ? '+' : ''}{quote.changePercent.toFixed(2)}%
        </span>
      </td>
      <td className="px-4 py-3 text-slate-400">
        {(quote.volume / 1000000).toFixed(2)}M
      </td>
      <td className="px-4 py-3">
        <button
          onClick={isWatchlisted ? onRemove : onAdd}
          className={`p-2 rounded-lg transition-colors ${
            isWatchlisted
              ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
              : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-amber-400'
          }`}
          title={isWatchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          <Star className={`w-4 h-4 ${isWatchlisted ? 'fill-current' : ''}`} />
        </button>
      </td>
    </tr>
  );
});
StockRow.displayName = 'StockRow';

export default function MarketPage() {
  const [mounted, setMounted] = useState(false);
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeWatchlist, setActiveWatchlist] = useState<Watchlist | null>(null);
  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<(StockQuote & { companyName?: string; sector?: string })[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingIndices, setLoadingIndices] = useState(true);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [showNewWatchlist, setShowNewWatchlist] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    setLoadingIndices(true);
    try {
      const indicesData = await getMarketIndices();
      setIndices(indicesData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load indices:', error);
    } finally {
      setLoadingIndices(false);
    }
    
    const lists = getWatchlists();
    setWatchlists(lists);
    if (lists.length > 0 && !activeWatchlist) {
      setActiveWatchlist(lists[0]);
    }
  }, [activeWatchlist]);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [loadData]);

  // Auto-refresh indices every 60 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const indicesData = await getMarketIndices();
        setIndices(indicesData);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Auto-refresh failed:', error);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Load quotes for active watchlist
  useEffect(() => {
    const loadQuotes = async () => {
      if (activeWatchlist && activeWatchlist.symbols.length > 0) {
        setLoadingQuotes(true);
        try {
          const quotesData = await getQuotes(activeWatchlist.symbols);
          setQuotes(quotesData);
        } catch (error) {
          console.error('Failed to load quotes:', error);
        } finally {
          setLoadingQuotes(false);
        }
      } else {
        setQuotes([]);
      }
    };
    loadQuotes();
  }, [activeWatchlist]);

  // Search symbols
  useEffect(() => {
    const searchSymbols = async () => {
      if (searchQuery.length >= 2) {
        // Search by symbol, name, or sector
        const matchedStocks = searchStocks(searchQuery, 15);
        const symbols = matchedStocks.map(s => s.symbol);
        const quotes = await getQuotes(symbols);
        
        // Merge quote data with stock info (name, sector)
        const resultsWithInfo = quotes.map(quote => {
          const stockInfo = matchedStocks.find(s => s.symbol === quote.symbol);
          return {
            ...quote,
            companyName: stockInfo?.name || quote.symbol,
            sector: stockInfo?.sector || '',
          };
        });
        
        setSearchResults(resultsWithInfo);
      } else {
        setSearchResults([]);
      }
    };
    searchSymbols();
  }, [searchQuery]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const indicesData = await getMarketIndices();
      setIndices(indicesData);
      if (activeWatchlist) {
        const quotesData = await getQuotes(activeWatchlist.symbols);
        setQuotes(quotesData);
      }
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddToWatchlist = (symbol: string) => {
    if (activeWatchlist) {
      addToWatchlist(activeWatchlist.id, symbol);
      loadData();
      setActiveWatchlist(prev => prev ? { ...prev, symbols: [...prev.symbols, symbol] } : null);
      setSearchQuery('');
      setShowSearch(false);
    }
  };

  const handleRemoveFromWatchlist = (symbol: string) => {
    if (activeWatchlist) {
      removeFromWatchlist(activeWatchlist.id, symbol);
      loadData();
      setActiveWatchlist(prev => prev ? { ...prev, symbols: prev.symbols.filter(s => s !== symbol) } : null);
    }
  };

  const handleCreateWatchlist = () => {
    if (newWatchlistName.trim()) {
      const result = createWatchlist(newWatchlistName.trim());
      if (result.success && result.watchlist) {
        loadData();
        setActiveWatchlist(result.watchlist);
        setNewWatchlistName('');
        setShowNewWatchlist(false);
      }
    }
  };

  const handleDeleteWatchlist = (id: string) => {
    deleteWatchlist(id);
    loadData();
    if (activeWatchlist?.id === id) {
      setActiveWatchlist(watchlists.find(w => w.id !== id) || null);
    }
  };

  if (!mounted) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-800 rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-slate-800 rounded-2xl" />
            ))}
          </div>
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
            <h1 className="text-2xl font-bold text-white">Market Dashboard</h1>
            <p className="text-slate-400 mt-1">
              {lastUpdated ? (
                <>Live data • Last updated: {lastUpdated.toLocaleTimeString()}</>
              ) : (
                'Track indices and your watchlist'
              )}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Market Indices */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loadingIndices ? (
            <>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="stat-card animate-pulse">
                  <div className="h-4 bg-slate-700 rounded w-20 mb-3"></div>
                  <div className="h-8 bg-slate-700 rounded w-32 mb-2"></div>
                  <div className="h-4 bg-slate-700 rounded w-24"></div>
                </div>
              ))}
            </>
          ) : (
            indices.map(index => (
              <IndexCard key={index.symbol} index={index} />
            ))
          )}
        </div>

        {/* Watchlist Section */}
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-white">Watchlist</h3>
              
              {/* Watchlist Tabs */}
              <div className="flex gap-2">
                {watchlists.map(list => (
                  <button
                    key={list.id}
                    onClick={() => setActiveWatchlist(list)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      activeWatchlist?.id === list.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {list.name}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteWatchlist(list.id); }}
                      className="p-1 hover:bg-white/20 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </button>
                ))}
                <button
                  onClick={() => setShowNewWatchlist(true)}
                  className="px-3 py-2 rounded-lg text-sm bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              {!showSearch ? (
                <button
                  onClick={() => setShowSearch(true)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Symbol
                </button>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, symbol or sector..."
                    className="input pl-10 pr-10 w-80"
                    autoFocus
                  />
                  <button
                    onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  
                  {/* Search Results Dropdown */}
                  {searchResults.length > 0 && (
                    <div className="absolute top-full mt-2 left-0 w-96 bg-slate-800 border border-white/10 rounded-xl overflow-hidden z-10 shadow-xl max-h-80 overflow-y-auto">
                      {searchResults.map(quote => (
                        <button
                          key={quote.symbol}
                          onClick={() => handleAddToWatchlist(quote.symbol)}
                          disabled={activeWatchlist?.symbols.includes(quote.symbol)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed border-b border-white/5 last:border-b-0"
                        >
                          <div className="flex flex-col items-start gap-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">{quote.symbol}</span>
                              <span className="text-xs px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded">{quote.sector}</span>
                            </div>
                            <div className="text-sm text-slate-400 truncate max-w-[200px]">{quote.companyName}</div>
                          </div>
                          <div className="text-right">
                            <div className={`font-medium ${quote.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              ₹{quote.ltp.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </div>
                            <div className={`text-xs ${quote.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {quote.changePercent >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* New Watchlist Form */}
          {showNewWatchlist && (
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newWatchlistName}
                onChange={(e) => setNewWatchlistName(e.target.value)}
                placeholder="Watchlist name..."
                className="input flex-1"
                autoFocus
              />
              <button onClick={handleCreateWatchlist} className="btn-primary">Create</button>
              <button onClick={() => setShowNewWatchlist(false)} className="btn-secondary">Cancel</button>
            </div>
          )}

          {/* Watchlist Table */}
          {quotes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-slate-400 border-b border-white/5">
                    <th className="px-4 py-3 font-medium">Symbol</th>
                    <th className="px-4 py-3 font-medium">LTP</th>
                    <th className="px-4 py-3 font-medium">Change</th>
                    <th className="px-4 py-3 font-medium">%</th>
                    <th className="px-4 py-3 font-medium">Volume</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map(quote => (
                    <StockRow
                      key={quote.symbol}
                      quote={quote}
                      isWatchlisted={true}
                      onAdd={() => {}}
                      onRemove={() => handleRemoveFromWatchlist(quote.symbol)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center text-slate-400">
              <Star className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="mb-4">Your watchlist is empty</p>
              <button
                onClick={() => setShowSearch(true)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Symbols
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
