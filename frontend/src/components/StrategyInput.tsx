'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Plus, Search, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

// Default predefined strategies
const DEFAULT_STRATEGIES = [
  'Breakout',
  'Breakdown',
  'Swing Trading',
  'Scalping',
  'Momentum',
  'Mean Reversion',
  'Trend Following',
  'Support/Resistance',
  'Moving Average Crossover',
  'VWAP',
  'Gap Fill',
  'Range Trading',
  'News Based',
  'Earnings Play',
  'Options Hedging',
  'Positional',
  'Intraday',
  'BTST/STBT',
];

// Get saved custom strategies from localStorage
const getCustomStrategies = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('customStrategies');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// Save custom strategy to localStorage
const saveCustomStrategy = (strategy: string) => {
  if (typeof window === 'undefined') return;
  try {
    const existing = getCustomStrategies();
    if (!existing.includes(strategy) && !DEFAULT_STRATEGIES.includes(strategy)) {
      const updated = [...existing, strategy];
      localStorage.setItem('customStrategies', JSON.stringify(updated));
    }
  } catch {
    // Ignore storage errors
  }
};

interface StrategyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function StrategyInput({ 
  value, 
  onChange, 
  placeholder = 'Select or type strategy...',
  className = ''
}: StrategyInputProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [customStrategies, setCustomStrategies] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load custom strategies on mount
  useEffect(() => {
    setCustomStrategies(getCustomStrategies());
  }, []);

  // Sync input value with prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // All available strategies
  const allStrategies = useMemo(() => {
    return [...DEFAULT_STRATEGIES, ...customStrategies].sort();
  }, [customStrategies]);

  // Filtered strategies based on input
  const filteredStrategies = useMemo(() => {
    if (!inputValue.trim()) return allStrategies;
    const query = inputValue.toLowerCase();
    return allStrategies.filter(s => s.toLowerCase().includes(query));
  }, [allStrategies, inputValue]);

  // Check if current input matches any strategy exactly
  const exactMatch = useMemo(() => {
    return allStrategies.find(s => s.toLowerCase() === inputValue.toLowerCase());
  }, [allStrategies, inputValue]);

  // Check if we should show "Add new strategy" option
  const showAddNew = inputValue.trim() && !exactMatch;

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
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    if (!isOpen) setIsOpen(true);
  };

  const handleSelectStrategy = (strategy: string) => {
    setInputValue(strategy);
    onChange(strategy);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleAddNewStrategy = () => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      saveCustomStrategy(trimmed);
      setCustomStrategies(prev => [...prev, trimmed]);
      handleSelectStrategy(trimmed);
    }
  };

  const handleClear = () => {
    setInputValue('');
    onChange('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && showAddNew) {
      e.preventDefault();
      handleAddNewStrategy();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

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
          {/* Search indicator */}
          {inputValue && (
            <div className={`px-3 py-2 border-b flex items-center gap-2 text-sm ${
              isDark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'
            }`}>
              <Search className="w-4 h-4" />
              Searching for &quot;{inputValue}&quot;
            </div>
          )}

          {/* Strategy list */}
          <div className="max-h-60 overflow-y-auto">
            {filteredStrategies.length > 0 ? (
              filteredStrategies.map((strategy) => (
                <button
                  key={strategy}
                  type="button"
                  onClick={() => handleSelectStrategy(strategy)}
                  className={`w-full px-4 py-2.5 text-left flex items-center justify-between transition-colors ${
                    isDark 
                      ? 'hover:bg-white/5 text-slate-200' 
                      : 'hover:bg-slate-50 text-slate-700'
                  } ${value === strategy ? (isDark ? 'bg-indigo-600/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600') : ''}`}
                >
                  <span>{strategy}</span>
                  {value === strategy && <Check className="w-4 h-4" />}
                </button>
              ))
            ) : (
              !showAddNew && (
                <div className={`px-4 py-8 text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  No strategies found
                </div>
              )
            )}

            {/* Add new strategy option */}
            {showAddNew && (
              <button
                type="button"
                onClick={handleAddNewStrategy}
                className={`w-full px-4 py-3 text-left flex items-center gap-2 border-t transition-colors ${
                  isDark 
                    ? 'border-white/10 hover:bg-emerald-600/20 text-emerald-400' 
                    : 'border-slate-200 hover:bg-emerald-50 text-emerald-600'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Add &quot;{inputValue.trim()}&quot; as new strategy</span>
              </button>
            )}
          </div>

          {/* Footer hint */}
          <div className={`px-3 py-2 border-t text-xs ${
            isDark ? 'border-white/10 text-slate-500' : 'border-slate-200 text-slate-400'
          }`}>
            {showAddNew ? 'Press Enter to add new strategy' : `${allStrategies.length} strategies available`}
          </div>
        </div>
      )}
    </div>
  );
}
