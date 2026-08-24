import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'universe' | 'light';

interface ThemeContextType {
  theme: ThemeMode;
  isUniverse: boolean;
  isLight: boolean;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'talentiq_theme';
const LEGACY_STORAGE_KEY = 'hr_theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    return saved === 'light' ? 'light' : 'universe';
  });

  const applyThemeToDOM = (currentTheme: ThemeMode) => {
    const root = document.documentElement;
    const body = document.body;

    root.setAttribute('data-theme', currentTheme);
    body.className = currentTheme === 'light' ? 'theme-light' : 'theme-universe';
    body.setAttribute('data-theme', currentTheme);
  };

  useEffect(() => {
    applyThemeToDOM(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    localStorage.setItem(LEGACY_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'universe' ? 'light' : 'universe'));
  };

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isUniverse: theme === 'universe',
        isLight: theme === 'light',
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
