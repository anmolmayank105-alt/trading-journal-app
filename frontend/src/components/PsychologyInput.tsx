'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Plus, Search, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

// 20 common trading psychology states
const DEFAULT_PSYCHOLOGY = [
  'Confident',
  'Fearful',
  'Greedy',
  'FOMO (Fear of Missing Out)',
  'Overconfident',
  'Anxious',
  'Calm & Disciplined',
  'Impatient',
  'Revenge Trading',
  'Hesitant',
  'Euphoric',
  'Frustrated',
  'Hopeful',
  'Panicked',
  'Focused',
  'Distracted',
  'Overthinker',
  'Impulsive',
  'Risk Averse',
  'Regretful',
];

// Get saved custom psychology from localStorage
const getCustomPsychology = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('customPsychology');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// Save custom psychology to localStorage
const saveCustomPsychology = (psychology: string) => {
  if (typeof window === 'undefined') return;
  try {
    const existing = getCustomPsychology();
    if (!existing.includes(psychology) && !DEFAULT_PSYCHOLOGY.includes(psychology)) {
      const updated = [...existing, psychology];
      localStorage.setItem('customPsychology', JSON.stringify(updated));
    }
  } catch {
    // Ignore storage errors
  }
};

interface PsychologyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function PsychologyInput({ 
  value, 
  onChange, 
  placeholder = 'Select or describe your mindset...',
  className = ''
}: PsychologyInputProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [customPsychology, setCustomPsychology] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load custom psychology on mount
  useEffect(() => {
    setCustomPsychology(getCustomPsychology());
  }, []);

  // Sync input value with prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // All available psychology states
  const allPsychology = useMemo(() => {
    return [...DEFAULT_PSYCHOLOGY, ...customPsychology].sort();
  }, [customPsychology]);

  // Filtered psychology based on input
  const filteredPsychology = useMemo(() => {
    if (!inputValue.trim()) return allPsychology;
    const query = inputValue.toLowerCase();
    return allPsychology.filter(p => p.toLowerCase().includes(query));
  }, [allPsychology, inputValue]);

  // Check if current input matches any psychology exactly
  const exactMatch = useMemo(() => {
    return allPsychology.find(p => p.toLowerCase() === inputValue.toLowerCase());
  }, [allPsychology, inputValue]);

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

  const handleSelectPsychology = (psychology: string) => {
    setInputValue(psychology);
    onChange(psychology);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleAddNewPsychology = () => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      saveCustomPsychology(trimmed);
      setCustomPsychology(prev => [...prev, trimmed]);
      handleSelectPsychology(trimmed);
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
      handleAddNewPsychology();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Get emoji for psychology state
  const getEmoji = (psychology: string): string => {
    const emojiMap: Record<string, string> = {
      'Confident': '💪',
      'Fearful': '😰',
      'Greedy': '🤑',
      'FOMO (Fear of Missing Out)': '😱',
      'Overconfident': '😎',
      'Anxious': '😟',
      'Calm & Disciplined': '🧘',
      'Impatient': '⏰',
      'Revenge Trading': '😤',
      'Hesitant': '🤔',
      'Euphoric': '🎉',
      'Frustrated': '😫',
      'Hopeful': '🙏',
      'Panicked': '😨',
      'Focused': '🎯',
      'Distracted': '😵',
      'Overthinker': '🧠',
      'Impulsive': '⚡',
      'Risk Averse': '🛡️',
      'Regretful': '😔',
    };
    return emojiMap[psychology] || '🧠';
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

          {/* Psychology list */}
          <div className="max-h-60 overflow-y-auto">
            {filteredPsychology.length > 0 ? (
              filteredPsychology.map((psychology) => (
                <button
                  key={psychology}
                  type="button"
                  onClick={() => handleSelectPsychology(psychology)}
                  className={`w-full px-4 py-2.5 text-left flex items-center justify-between transition-colors ${
                    isDark 
                      ? 'hover:bg-white/5 text-slate-200' 
                      : 'hover:bg-slate-50 text-slate-700'
                  } ${value === psychology ? (isDark ? 'bg-purple-600/20 text-purple-400' : 'bg-purple-50 text-purple-600') : ''}`}
                >
                  <span className="flex items-center gap-2">
                    <span>{getEmoji(psychology)}</span>
                    <span>{psychology}</span>
                  </span>
                  {value === psychology && <Check className="w-4 h-4" />}
                </button>
              ))
            ) : (
              !showAddNew && (
                <div className={`px-4 py-8 text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  No matching psychology found
                </div>
              )
            )}

            {/* Add new psychology option */}
            {showAddNew && (
              <button
                type="button"
                onClick={handleAddNewPsychology}
                className={`w-full px-4 py-3 text-left flex items-center gap-2 border-t transition-colors ${
                  isDark 
                    ? 'border-white/10 hover:bg-purple-600/20 text-purple-400' 
                    : 'border-slate-200 hover:bg-purple-50 text-purple-600'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Add &quot;{inputValue.trim()}&quot; as new mindset</span>
              </button>
            )}
          </div>

          {/* Footer hint */}
          <div className={`px-3 py-2 border-t text-xs ${
            isDark ? 'border-white/10 text-slate-500' : 'border-slate-200 text-slate-400'
          }`}>
            {showAddNew ? 'Press Enter to add new mindset' : `${allPsychology.length} mindset options available`}
          </div>
        </div>
      )}
    </div>
  );
}
