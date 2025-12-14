'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { ChevronDown, Check, Plus, Search, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

// Default predefined strategies (shared across all users)
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

// Get current user ID from localStorage
const getCurrentUserId = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      return user.id || null;
    }
    return null;
  } catch {
    return null;
  }
};

// Get user-specific storage key for custom strategies
const getStorageKey = (): string => {
  const userId = getCurrentUserId();
  return userId ? `customStrategies_${userId}` : 'customStrategies_guest';
};

// Get saved custom strategies from localStorage (user-specific)
const getCustomStrategies = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const key = getStorageKey();
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// Save custom strategy to localStorage (user-specific)
const saveCustomStrategy = (strategy: string) => {
  if (typeof window === 'undefined') return;
  try {
    const key = getStorageKey();
    const existing = getCustomStrategies();
    if (!existing.includes(strategy) && !DEFAULT_STRATEGIES.includes(strategy)) {
      const updated = [...existing, strategy];
      localStorage.setItem(key, JSON.stringify(updated));
    }
  } catch {
    // Ignore storage errors
  }
};

// Remove custom strategy from localStorage (user-specific)
const removeCustomStrategy = (strategy: string): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const key = getStorageKey();
    const existing = getCustomStrategies();
    const updated = existing.filter(s => s !== strategy);
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
};

// Get hidden/removed default strategies (user-specific)
const getRemovedDefaultStrategies = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const userId = getCurrentUserId();
    const key = `removedDefaultStrategies_${userId}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// Hide/remove a default strategy (user-specific)
const addRemovedDefaultStrategy = (strategy: string): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const userId = getCurrentUserId();
    const key = `removedDefaultStrategies_${userId}`;
    const existing = getRemovedDefaultStrategies();
    if (!existing.includes(strategy) && DEFAULT_STRATEGIES.includes(strategy)) {
      const updated = [...existing, strategy];
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    }
    return existing;
  } catch {
    return [];
  }
};

interface StrategyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const StrategyInput = memo(function StrategyInput({ 
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
  const [removedDefaultStrategies, setRemovedDefaultStrategies] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load custom and removed strategies on mount
  useEffect(() => {
    setCustomStrategies(getCustomStrategies());
    setRemovedDefaultStrategies(getRemovedDefaultStrategies());
  }, []);

  // Sync input value with prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // All available strategies (filter out removed defaults)
  const allStrategies = useMemo(() => {
    const availableDefaults = DEFAULT_STRATEGIES.filter(s => !removedDefaultStrategies.includes(s));
    return [...availableDefaults, ...customStrategies].sort();
  }, [customStrategies, removedDefaultStrategies]);

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

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    if (!isOpen) setIsOpen(true);
  }, [onChange, isOpen]);

  const handleSelectStrategy = useCallback((strategy: string) => {
    setInputValue(strategy);
    onChange(strategy);
    setIsOpen(false);
    inputRef.current?.blur();
  }, [onChange]);

  const handleAddNewStrategy = useCallback(() => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      saveCustomStrategy(trimmed);
      setCustomStrategies(prev => [...prev, trimmed]);
      setInputValue(trimmed);
      onChange(trimmed);
      setIsOpen(false);
      inputRef.current?.blur();
    }
  }, [inputValue, onChange]);

  const handleClear = useCallback(() => {
    setInputValue('');
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && showAddNew) {
      e.preventDefault();
      handleAddNewStrategy();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }, [showAddNew, handleAddNewStrategy]);

  // Handle delete strategy (both custom and default)
  const handleDeleteStrategy = useCallback((strategy: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting when deleting
    
    const isCustom = customStrategies.includes(strategy);
    
    if (isCustom) {
      // Remove custom strategy
      const updated = removeCustomStrategy(strategy);
      setCustomStrategies(updated);
    } else {
      // Hide default strategy
      const updated = addRemovedDefaultStrategy(strategy);
      setRemovedDefaultStrategies(updated);
    }
    
    // Clear selection if deleted strategy was selected
    if (value === strategy) {
      setInputValue('');
      onChange('');
    }
  }, [value, onChange, customStrategies]);

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
              filteredStrategies.map((strategy) => {
                const isSelected = value === strategy;
                return (
                  <button
                    key={strategy}
                    type="button"
                    onClick={() => handleSelectStrategy(strategy)}
                    className={`w-full px-4 py-2.5 text-left flex items-center justify-between transition-colors group ${
                      isDark 
                        ? 'hover:bg-white/5 text-slate-200' 
                        : 'hover:bg-slate-50 text-slate-700'
                    } ${isSelected ? (isDark ? 'bg-indigo-600/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600') : ''}`}
                  >
                    <span>{strategy}</span>
                    <div className="flex items-center gap-2">
                      {isSelected && <Check className="w-4 h-4" />}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteStrategy(strategy, e)}
                        className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                          isDark 
                            ? 'hover:bg-red-600/30 text-red-400 hover:text-red-300' 
                            : 'hover:bg-red-100 text-red-500 hover:text-red-600'
                        }`}
                        title="Remove strategy"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </button>
                );
              })
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
});

StrategyInput.displayName = 'StrategyInput';

export default StrategyInput;
