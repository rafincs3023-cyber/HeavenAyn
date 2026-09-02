import React, { createContext, useContext, useState, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme } from '../theme/theme';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [override, setOverride] = useState(null); // null = follow system, 'light' | 'dark' = manual

  const mode = override || systemScheme || 'light';
  const theme = mode === 'dark' ? darkTheme : lightTheme;

  const toggleTheme = () => {
    setOverride((prev) => {
      const current = prev || systemScheme || 'light';
      return current === 'dark' ? 'light' : 'dark';
    });
  };

  const value = useMemo(() => ({ theme, mode, toggleTheme }), [theme, mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used within ThemeProvider');
  return ctx;
}
