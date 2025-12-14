'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

// Top 10 Tradable Indian Indices (F&O available)
const INDIAN_INDICES = [
  { symbol: 'NIFTY', name: 'Nifty 50', exchange: 'NSE' },
  { symbol: 'BANKNIFTY', name: 'Bank Nifty', exchange: 'NSE' },
  { symbol: 'FINNIFTY', name: 'Nifty Financial Services', exchange: 'NSE' },
  { symbol: 'MIDCPNIFTY', name: 'Nifty Midcap Select', exchange: 'NSE' },
  { symbol: 'SENSEX', name: 'BSE Sensex', exchange: 'BSE' },
  { symbol: 'BANKEX', name: 'BSE Bankex', exchange: 'BSE' },
  { symbol: 'NIFTY IT', name: 'Nifty IT', exchange: 'NSE' },
  { symbol: 'NIFTY NEXT 50', name: 'Nifty Next 50', exchange: 'NSE' },
  { symbol: 'SENSEX 50', name: 'BSE Sensex 50', exchange: 'BSE' },
  { symbol: 'NIFTY CPSE', name: 'Nifty CPSE', exchange: 'NSE' },
];

// Top 10 Tradable Global Indices (Futures/ETFs available)
const GLOBAL_INDICES = [
  { symbol: 'ES', name: 'E-mini S&P 500 Futures', exchange: 'CME' },
  { symbol: 'NQ', name: 'E-mini NASDAQ 100 Futures', exchange: 'CME' },
  { symbol: 'YM', name: 'E-mini Dow Futures', exchange: 'CBOT' },
  { symbol: 'RTY', name: 'E-mini Russell 2000 Futures', exchange: 'CME' },
  { symbol: 'DAX', name: 'DAX Futures', exchange: 'EUREX' },
  { symbol: 'FTSE', name: 'FTSE 100 Futures', exchange: 'ICE' },
  { symbol: 'NKD', name: 'Nikkei 225 Futures', exchange: 'CME' },
  { symbol: 'HSI', name: 'Hang Seng Index Futures', exchange: 'HKEX' },
  { symbol: 'SGX NIFTY', name: 'SGX Nifty Futures', exchange: 'SGX' },
  { symbol: 'STOXX50', name: 'Euro Stoxx 50 Futures', exchange: 'EUREX' },
];

interface IndexInputProps {
  value: string;
  onChange: (symbol: string, exchange: string) => void;
  placeholder?: string;
  className?: string;
}

const IndexInput = memo(function IndexInput({ 
  value, 
  onChange, 
  placeholder = 'Select an index...',
  className = ''
}: IndexInputProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [activeTab, setActiveTab] = useState<'india' | 'global'>('india');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const justSelectedRef = useRef(false);  // Track if a selection was just made

  // Sync input value with prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // All indices based on active tab
  const currentIndices = activeTab === 'india' ? INDIAN_INDICES : GLOBAL_INDICES;

  // Filtered indices based on input
  const filteredIndices = useMemo(() => {
    if (!inputValue.trim()) return currentIndices;
    const query = inputValue.toLowerCase();
    return currentIndices.filter(idx => 
      idx.symbol.toLowerCase().includes(query) ||
      idx.name.toLowerCase().includes(query)
    );
  }, [currentIndices, inputValue]);

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

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase(); // Convert to uppercase for index symbols
    setInputValue(newValue);
    if (!isOpen) setIsOpen(true);
    // Don't call onChange here - wait for blur or selection
  }, [isOpen]);

  const handleSelectIndex = useCallback((index: typeof INDIAN_INDICES[0]) => {
    justSelectedRef.current = true;  // Mark that selection just happened
    setInputValue(index.symbol);
    onChange(index.symbol, index.exchange);
    setIsOpen(false);
    inputRef.current?.blur();
  }, [onChange]);

  const handleClear = useCallback(() => {
    setInputValue('');
    onChange('', '');
    inputRef.current?.focus();
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
      
      // If there's exactly one match, auto-select it
      if (filteredIndices.length === 1) {
        const match = filteredIndices[0];
        setInputValue(match.symbol);
        onChange(match.symbol, match.exchange);
      }
    }
  }, [filteredIndices, onChange]);

  const handleBlur = useCallback(() => {
    // Small delay to allow click events on dropdown items
    setTimeout(() => {
      // Skip if a selection was just made via click
      if (justSelectedRef.current) {
        justSelectedRef.current = false;
        return;
      }
      // Ensure the current manual input value is saved
      if (inputValue) {
        const matchedIndex = currentIndices.find(idx => idx.symbol === inputValue);
        const exchange = matchedIndex?.exchange || 'NSE';
        onChange(inputValue, exchange);
      }
    }, 200);
  }, [inputValue, currentIndices, onChange]);

  return (
    <div className={`relative ${className}`}>
      {/* Input with dropdown trigger */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`input pr-16 ${isDark ? '' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'}`}
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
          {/* Tabs */}
          <div className={`flex border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <button
              type="button"
              onClick={() => setActiveTab('india')}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'india'
                  ? isDark 
                    ? 'bg-indigo-600/20 text-indigo-400 border-b-2 border-indigo-500' 
                    : 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-500'
                  : isDark
                    ? 'text-slate-400 hover:text-white hover:bg-white/5'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              🇮🇳 Indian Indices
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('global')}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'global'
                  ? isDark 
                    ? 'bg-indigo-600/20 text-indigo-400 border-b-2 border-indigo-500' 
                    : 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-500'
                  : isDark
                    ? 'text-slate-400 hover:text-white hover:bg-white/5'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              🌍 Global Indices
            </button>
          </div>

          {/* Search indicator */}
          {inputValue && (
            <div className={`px-3 py-2 border-b flex items-center gap-2 text-sm ${
              isDark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'
            }`}>
              <Search className="w-4 h-4" />
              Searching for &quot;{inputValue}&quot;
            </div>
          )}

          {/* Index list */}
          <div className="max-h-60 overflow-y-auto">
            {filteredIndices.length > 0 ? (
              filteredIndices.map((index) => (
                <button
                  key={index.symbol}
                  type="button"
                  onClick={() => handleSelectIndex(index)}
                  className={`w-full px-4 py-3 text-left flex items-center justify-between transition-colors ${
                    isDark 
                      ? 'hover:bg-white/5 text-slate-200' 
                      : 'hover:bg-slate-50 text-slate-700'
                  } ${value === index.symbol ? (isDark ? 'bg-indigo-600/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600') : ''}`}
                >
                  <div>
                    <div className="font-medium">{index.symbol}</div>
                    <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {index.name} • {index.exchange}
                    </div>
                  </div>
                  {value === index.symbol && <Check className="w-4 h-4" />}
                </button>
              ))
            ) : (
              <div className={`px-4 py-8 text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                No indices found
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`px-3 py-2 border-t text-xs ${
            isDark ? 'border-white/10 text-slate-500' : 'border-slate-200 text-slate-400'
          }`}>
            {activeTab === 'india' ? '10 Indian indices' : '10 Global indices'}
          </div>
        </div>
      )}
    </div>
  );
});

IndexInput.displayName = 'IndexInput';

export default IndexInput;
