import React, { createContext, useContext, useState } from 'react';

export type AdminThemeMode = 'light-100' | 'light-50' | 'dark-100';

interface AdminThemeContextType {
  theme: AdminThemeMode;
  setTheme: (mode: AdminThemeMode) => void;
}

const AdminThemeContext = createContext<AdminThemeContextType>({
  theme: 'dark-100',
  setTheme: () => {},
});

export const AdminThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AdminThemeMode>(() => {
    const saved = localStorage.getItem('hiremind_admin_theme') as AdminThemeMode;
    if (saved && ['light-100', 'light-50', 'dark-100'].includes(saved)) {
      return saved;
    }
    return 'dark-100';
  });

  const setTheme = (mode: AdminThemeMode) => {
    setThemeState(mode);
    localStorage.setItem('hiremind_admin_theme', mode);
  };

  return (
    <AdminThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </AdminThemeContext.Provider>
  );
};

export const useAdminTheme = () => useContext(AdminThemeContext);
