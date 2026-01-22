import { useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

const THEME_KEY = 'user-theme-preference';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage first
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(THEME_KEY) as Theme | null;
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    }
    // Default to dark
    return 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove both classes first
    root.classList.remove('light', 'dark');
    
    // Add the current theme class
    root.classList.add(theme);
    
    // Save to localStorage
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const setLightMode = () => setTheme('light');
  const setDarkMode = () => setTheme('dark');

  return {
    theme,
    toggleTheme,
    setLightMode,
    setDarkMode,
    isDark: theme === 'dark',
    isLight: theme === 'light',
  };
}
