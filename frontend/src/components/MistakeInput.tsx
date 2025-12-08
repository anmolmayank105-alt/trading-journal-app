'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Plus, Search, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

// 20 common trading mistakes
const DEFAULT_MISTAKES = [
  'No Stop Loss',
  'Moved Stop Loss',
  'Entered Too Early',
  'Entered Too Late',
  'Exited Too Early',
  'Exited Too Late',
  'Position Size Too Large',
  'Position Size Too Small',
  'Revenge Trading',
  'FOMO Entry',
  'Ignored Trading Plan',
  'Overtrading',
  'Averaging Down',
  'Not Taking Profits',
  'Chasing the Trade',
  'Trading Against Trend',
  'Ignored Risk Management',
  'Emotional Decision',
  'No Clear Setup',
  'Holding Overnight Unplanned',
];

// Get saved custom mistakes from localStorage
const getCustomMistakes = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('customMistakes');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// Save custom mistake to localStorage
const saveCustomMistake = (mistake: string) => {
  if (typeof window === 'undefined') return;
  try {
    const existing = getCustomMistakes();
    if (!existing.includes(mistake) && !DEFAULT_MISTAKES.includes(mistake)) {
      const updated = [...existing, mistake];
      localStorage.setItem('customMistakes', JSON.stringify(updated));
    }
  } catch {
    // Ignore storage errors
  }
};

interface MistakeInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function MistakeInput({ 
  value, 
  onChange, 
  placeholder = 'Select or describe mistake...',
  className = ''
}: MistakeInputProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [customMistakes, setCustomMistakes] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load custom mistakes on mount
  useEffect(() => {
    setCustomMistakes(getCustomMistakes());
  }, []);

  // Sync input value with prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // All available mistakes
  const allMistakes = useMemo(() => {
    return [...DEFAULT_MISTAKES, ...customMistakes];
  }, [customMistakes]);

  // Filtered mistakes based on input
  const filteredMistakes = useMemo(() => {
    if (!inputValue.trim()) return allMistakes;
    const query = inputValue.toLowerCase();
    return allMistakes.filter(m => m.toLowerCase().includes(query));
  }, [allMistakes, inputValue]);

  // Check if current input matches any mistake exactly
  const exactMatch = useMemo(() => {
    return allMistakes.find(m => m.toLowerCase() === inputValue.toLowerCase());
  }, [allMistakes, inputValue]);

  // Check if we should show "Add new" option
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

  const handleSelectMistake = (mistake: string) => {
    setInputValue(mistake);
    onChange(mistake);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleAddNewMistake = () => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      saveCustomMistake(trimmed);
      setCustomMistakes(prev => [...prev, trimmed]);
      handleSelectMistake(trimmed);
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
      handleAddNewMistake();
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

          {/* Mistakes list */}
          <div className="max-h-60 overflow-y-auto">
            {filteredMistakes.length > 0 ? (
              filteredMistakes.map((mistake) => (
                <button
                  key={mistake}
                  type="button"
                  onClick={() => handleSelectMistake(mistake)}
                  className={`w-full px-4 py-2.5 text-left flex items-center justify-between transition-colors ${
                    isDark 
                      ? 'hover:bg-white/5 text-slate-200' 
                      : 'hover:bg-slate-50 text-slate-700'
                  } ${value === mistake ? (isDark ? 'bg-red-600/20 text-red-400' : 'bg-red-50 text-red-600') : ''}`}
                >
                  <span className="flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{mistake}</span>
                  </span>
                  {value === mistake && <Check className="w-4 h-4" />}
                </button>
              ))
            ) : (
              !showAddNew && (
                <div className={`px-4 py-8 text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  No matching mistakes found
                </div>
              )
            )}

            {/* Add new mistake option */}
            {showAddNew && (
              <button
                type="button"
                onClick={handleAddNewMistake}
                className={`w-full px-4 py-3 text-left flex items-center gap-2 border-t transition-colors ${
                  isDark 
                    ? 'border-white/10 hover:bg-red-600/20 text-red-400' 
                    : 'border-slate-200 hover:bg-red-50 text-red-600'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Add &quot;{inputValue.trim()}&quot; as new mistake</span>
              </button>
            )}
          </div>

          {/* Footer hint */}
          <div className={`px-3 py-2 border-t text-xs ${
            isDark ? 'border-white/10 text-slate-500' : 'border-slate-200 text-slate-400'
          }`}>
            {showAddNew ? 'Press Enter to add new mistake' : `${allMistakes.length} mistakes listed`}
          </div>
        </div>
      )}
    </div>
  );
}
