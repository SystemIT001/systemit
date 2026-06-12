import { useState, useEffect } from 'react';

export type ThemeType = 'cyberpunk' | 'light' | 'sunset';

export function useTheme() {
  const [theme, setTheme] = useState<ThemeType>(
    (localStorage.getItem('systemit_theme') as ThemeType) || 'cyberpunk'
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light-theme', 'sunset-theme', 'cyberpunk-theme');
    
    if (theme === 'light') {
      root.classList.add('light-theme');
    } else if (theme === 'sunset') {
      root.classList.add('sunset-theme');
    } else {
      root.classList.add('cyberpunk-theme');
    }
    
    localStorage.setItem('systemit_theme', theme);
  }, [theme]);

  // Keep toggleTheme for backwards compatibility if any component still uses it
  const toggleTheme = () => {
    setTheme(prev => prev === 'cyberpunk' ? 'light' : 'cyberpunk');
  };

  return { theme, setTheme, toggleTheme };
}
