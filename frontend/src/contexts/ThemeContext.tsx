'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState(false);

  // Get system preference
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  };

  // Apply theme to document
  const applyTheme = (resolvedTheme: 'light' | 'dark') => {
    const root = document.documentElement;
    
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      document.body.className = document.body.className
        .replace('bg-white', 'bg-slate-950')
        .replace('text-slate-900', 'text-white');
      if (!document.body.className.includes('bg-slate-950')) {
        document.body.classList.add('bg-slate-950');
      }
      if (!document.body.className.includes('text-white')) {
        document.body.classList.add('text-white');
      }
      document.body.classList.remove('bg-white', 'text-slate-900');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      document.body.classList.remove('bg-slate-950', 'text-white');
      document.body.classList.add('bg-white', 'text-slate-900');
    }
    
    setResolvedTheme(resolvedTheme);
  };

  // Set theme and persist
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Also update appearance_settings for compatibility with settings page
    try {
      const appearance = JSON.parse(localStorage.getItem('appearance_settings') || '{}');
      appearance.theme = newTheme;
      localStorage.setItem('appearance_settings', JSON.stringify(appearance));
    } catch (e) {
      // Ignore errors
    }
    
    const resolved = newTheme === 'system' ? getSystemTheme() : newTheme;
    applyTheme(resolved);
  };

  // Initialize theme on mount
  useEffect(() => {
    setMounted(true);
    
    // Load saved theme
    let savedTheme: Theme = 'dark';
    
    // Check localStorage for theme
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    if (storedTheme && ['light', 'dark', 'system'].includes(storedTheme)) {
      savedTheme = storedTheme;
    } else {
      // Check appearance_settings for backward compatibility
      try {
        const appearance = JSON.parse(localStorage.getItem('appearance_settings') || '{}');
        if (appearance.theme && ['light', 'dark', 'system'].includes(appearance.theme)) {
          savedTheme = appearance.theme;
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    setThemeState(savedTheme);
    const resolved = savedTheme === 'system' ? getSystemTheme() : savedTheme;
    applyTheme(resolved);
  }, []);

  // Listen for system theme changes when using 'system' theme
  useEffect(() => {
    if (!mounted) return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, mounted]);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <ThemeContext.Provider value={{ theme: 'dark', setTheme: () => {}, resolvedTheme: 'dark' }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
