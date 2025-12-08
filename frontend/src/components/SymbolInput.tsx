'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { searchStocks, UNIQUE_INDIAN_STOCKS, StockInfo } from '@/data/indianStocks';

interface SymbolInputProps {
  value: string;
  onChange: (symbol: string, exchange: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SymbolInput({ 
  value, 
  onChange, 
  placeholder = 'Search by name or symbol...',
  className = ''
}: SymbolInputProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync input value with prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Filtered stocks based on input
  const filteredStocks = useMemo(() => {
    if (!inputValue.trim()) {
      // Show popular stocks when empty
      return UNIQUE_INDIAN_STOCKS.slice(0, 15);
    }
    return searchStocks(inputValue, 15);
  }, [inputValue]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    setInputValue(newValue);
    onChange(newValue, 'NSE');
    if (!isOpen) setIsOpen(true);
  };

  const handleSelectStock = (stock: StockInfo) => {
    setInputValue(stock.symbol);
    onChange(stock.symbol, stock.exchange === 'BOTH' ? 'NSE' : stock.exchange);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setInputValue('');
    onChange('', 'NSE');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Get sector color
  const getSectorColor = (sector: string) => {
    const colors: Record<string, string> = {
      'Banking': 'bg-blue-500/20 text-blue-400',
      'IT': 'bg-purple-500/20 text-purple-400',
      'Pharma': 'bg-green-500/20 text-green-400',
      'Oil & Gas': 'bg-orange-500/20 text-orange-400',
      'Auto': 'bg-red-500/20 text-red-400',
      'FMCG': 'bg-yellow-500/20 text-yellow-400',
      'Metals': 'bg-slate-500/20 text-slate-400',
      'Power': 'bg-cyan-500/20 text-cyan-400',
      'Infrastructure': 'bg-amber-500/20 text-amber-400',
      'Telecom': 'bg-pink-500/20 text-pink-400',
      'Insurance': 'bg-teal-500/20 text-teal-400',
      'NBFC': 'bg-indigo-500/20 text-indigo-400',
    };
    return colors[sector] || 'bg-slate-500/20 text-slate-400';
  };

  return (
    <div className={`relative ${className}`}>
      {/* Input with dropdown trigger */}
      <div className="relative">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`input pl-11 pr-16 ${isDark ? '' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'}`}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className={`p-1 rounded hover:bg-white/10 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`p-1 rounded hover:bg-white/10 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div 
          ref={dropdownRef}
          className={`absolute z-50 w-full mt-2 rounded-xl shadow-xl border overflow-hidden ${
            isDark 
              ? 'bg-slate-800 border-white/10' 
              : 'bg-white border-slate-200'
          }`}
        >
          {/* Search indicator */}
          {inputValue ? (
            <div className={`px-3 py-2 border-b flex items-center gap-2 text-sm ${
              isDark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'
            }`}>
              <Search className="w-4 h-4" />
              Results for &quot;{inputValue}&quot;
            </div>
          ) : (
            <div className={`px-3 py-2 border-b text-sm font-medium ${
              isDark ? 'border-white/10 text-slate-300' : 'border-slate-200 text-slate-600'
            }`}>
              Popular Stocks
            </div>
          )}

          {/* Stock list */}
          <div className="max-h-72 overflow-y-auto">
            {filteredStocks.length > 0 ? (
              filteredStocks.map((stock) => (
                <button
                  key={stock.symbol}
                  type="button"
                  onClick={() => handleSelectStock(stock)}
                  className={`w-full px-4 py-3 text-left flex items-center justify-between transition-colors border-b last:border-b-0 ${
                    isDark 
                      ? 'hover:bg-white/5 text-slate-200 border-white/5' 
                      : 'hover:bg-slate-50 text-slate-700 border-slate-100'
                  } ${value === stock.symbol ? (isDark ? 'bg-indigo-600/20' : 'bg-indigo-50') : ''}`}
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {stock.symbol}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${getSectorColor(stock.sector)}`}>
                        {stock.sector}
                      </span>
                    </div>
                    <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {stock.name}
                    </div>
                  </div>
                  <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {stock.exchange === 'BOTH' ? 'NSE/BSE' : stock.exchange}
                  </div>
                </button>
              ))
            ) : (
              <div className={`px-4 py-8 text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <p>No stocks found for &quot;{inputValue}&quot;</p>
                <p className="text-xs mt-1">Try searching by company name or symbol</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`px-3 py-2 border-t text-xs ${
            isDark ? 'border-white/10 text-slate-500' : 'border-slate-200 text-slate-400'
          }`}>
            {filteredStocks.length} stocks • Search by name, symbol or sector
          </div>
        </div>
      )}
    </div>
  );
}
