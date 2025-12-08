'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown, X } from 'lucide-react';

// Default time frames
const DEFAULT_TIME_FRAMES = [
  '1 min', '3 min', '5 min', '15 min', '30 min',
  '1 hour', '2 hour', '4 hour', 'Daily', 'Weekly', 'Monthly'
];

interface TimeFrameInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function TimeFrameInput({ value, onChange, placeholder = "Select or enter time frame..." }: TimeFrameInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [filteredOptions, setFilteredOptions] = useState<string[]>(DEFAULT_TIME_FRAMES);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update input value when external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Filter options based on input
  useEffect(() => {
    if (inputValue) {
      const filtered = DEFAULT_TIME_FRAMES.filter(tf =>
        tf.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions(DEFAULT_TIME_FRAMES);
    }
  }, [inputValue]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // If there's input but no selection, use the typed value
        if (inputValue && inputValue !== value) {
          onChange(inputValue);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inputValue, value, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
  };

  const handleSelect = (timeFrame: string) => {
    setInputValue(timeFrame);
    onChange(timeFrame);
    setIsOpen(false);
  };

  const handleClear = () => {
    setInputValue('');
    onChange('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue) {
        onChange(inputValue);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="input pl-10 pr-16"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full max-h-60 overflow-y-auto rounded-xl bg-slate-800 border border-white/10 shadow-xl">
          {/* Predefined options */}
          {filteredOptions.length > 0 ? (
            <div className="p-2">
              <p className="text-xs text-slate-500 px-2 py-1 uppercase tracking-wider">Common Time Frames</p>
              <div className="grid grid-cols-3 gap-1">
                {filteredOptions.map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => handleSelect(tf)}
                    className={`px-3 py-2 text-sm rounded-lg text-left transition-colors ${
                      value === tf
                        ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Custom entry hint */}
          {inputValue && !DEFAULT_TIME_FRAMES.includes(inputValue) && (
            <div className="p-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => handleSelect(inputValue)}
                className="w-full px-3 py-2 text-sm text-left rounded-lg text-emerald-400 hover:bg-white/10 flex items-center gap-2"
              >
                <span className="text-lg">⏱️</span>
                Use custom: <span className="font-medium">&quot;{inputValue}&quot;</span>
              </button>
            </div>
          )}

          {/* Help text */}
          <div className="p-2 border-t border-white/5 bg-white/5">
            <p className="text-xs text-slate-400 px-2">
              💡 Type any custom time frame (e.g., &quot;2 days&quot;, &quot;45 min&quot;)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
