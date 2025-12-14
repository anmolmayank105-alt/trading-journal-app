'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { ChevronDown, Check, Plus, Search, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

// 20 common trading psychology states (shared across all users)
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

// Get user-specific storage key for custom psychology
const getStorageKey = (): string => {
  const userId = getCurrentUserId();
  return userId ? `customPsychology_${userId}` : 'customPsychology_guest';
};

// Get saved custom psychology from localStorage (user-specific)
const getCustomPsychology = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const key = getStorageKey();
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// Save custom psychology to localStorage (user-specific)
const saveCustomPsychology = (psychology: string) => {
  if (typeof window === 'undefined') return;
  try {
    const key = getStorageKey();
    const existing = getCustomPsychology();
    if (!existing.includes(psychology) && !DEFAULT_PSYCHOLOGY.includes(psychology)) {
      const updated = [...existing, psychology];
      localStorage.setItem(key, JSON.stringify(updated));
    }
  } catch {
    // Ignore storage errors
  }
};

// Remove custom psychology from localStorage (user-specific)
const removeCustomPsychology = (psychology: string): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const key = getStorageKey();
    const existing = getCustomPsychology();
    const updated = existing.filter(p => p !== psychology);
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
};

// Get hidden/removed default psychology (user-specific)
const getRemovedDefaultPsychology = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const userId = getCurrentUserId();
    const key = `removedDefaultPsychology_${userId}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// Hide/remove a default psychology (user-specific)
const addRemovedDefaultPsychology = (psychology: string): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const userId = getCurrentUserId();
    const key = `removedDefaultPsychology_${userId}`;
    const existing = getRemovedDefaultPsychology();
    if (!existing.includes(psychology) && DEFAULT_PSYCHOLOGY.includes(psychology)) {
      const updated = [...existing, psychology];
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    }
    return existing;
  } catch {
    return [];
  }
};

interface PsychologyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const PsychologyInput = memo(function PsychologyInput({ 
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
  const [removedDefaultPsychology, setRemovedDefaultPsychology] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load custom and removed psychology on mount
  useEffect(() => {
    setCustomPsychology(getCustomPsychology());
    setRemovedDefaultPsychology(getRemovedDefaultPsychology());
  }, []);

  // Sync input value with prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // All available psychology states (filter out removed defaults)
  const allPsychology = useMemo(() => {
    const availableDefaults = DEFAULT_PSYCHOLOGY.filter(p => !removedDefaultPsychology.includes(p));
    return [...availableDefaults, ...customPsychology].sort();
  }, [customPsychology, removedDefaultPsychology]);

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

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    if (!isOpen) setIsOpen(true);
  }, [onChange, isOpen]);

  const handleSelectPsychology = useCallback((psychology: string) => {
    setInputValue(psychology);
    onChange(psychology);
    setIsOpen(false);
    inputRef.current?.blur();
  }, [onChange]);

  const handleAddNewPsychology = useCallback(() => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      saveCustomPsychology(trimmed);
      setCustomPsychology(prev => [...prev, trimmed]);
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
      handleAddNewPsychology();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }, [showAddNew, handleAddNewPsychology]);

  // Handle delete psychology (both custom and default)
  const handleDeletePsychology = useCallback((psychology: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting when deleting
    
    const isCustom = customPsychology.includes(psychology);
    
    if (isCustom) {
      // Remove custom psychology
      const updated = removeCustomPsychology(psychology);
      setCustomPsychology(updated);
    } else {
      // Hide default psychology
      const updated = addRemovedDefaultPsychology(psychology);
      setRemovedDefaultPsychology(updated);
    }
    
    // Clear selection if deleted psychology was selected
    if (value === psychology) {
      setInputValue('');
      onChange('');
    }
  }, [value, onChange, customPsychology]);

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
              filteredPsychology.map((psychology) => {
                const isSelected = value === psychology;
                return (
                  <button
                    key={psychology}
                    type="button"
                    onClick={() => handleSelectPsychology(psychology)}
                    className={`w-full px-4 py-2.5 text-left flex items-center justify-between transition-colors group ${
                      isDark 
                        ? 'hover:bg-white/5 text-slate-200' 
                        : 'hover:bg-slate-50 text-slate-700'
                    } ${isSelected ? (isDark ? 'bg-purple-600/20 text-purple-400' : 'bg-purple-50 text-purple-600') : ''}`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{getEmoji(psychology)}</span>
                      <span>{psychology}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      {isSelected && <Check className="w-4 h-4" />}
                      <button
                        type="button"
                        onClick={(e) => handleDeletePsychology(psychology, e)}
                        className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                          isDark 
                            ? 'hover:bg-red-600/30 text-red-400 hover:text-red-300' 
                            : 'hover:bg-red-100 text-red-500 hover:text-red-600'
                        }`}
                        title="Remove mindset"
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
});

PsychologyInput.displayName = 'PsychologyInput';

export default PsychologyInput;
