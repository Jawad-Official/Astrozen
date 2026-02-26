import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ThemeName, themes } from '@/lib/themes';

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  resolvedTheme: Exclude<ThemeName, 'system'>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme') as ThemeName;
      // Validate stored theme
      if (stored && (stored in themes || stored === 'system')) {
        return stored;
      }
      return 'system';
    }
    return 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<Exclude<ThemeName, 'system'>>('dark');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updateResolvedTheme = () => {
      if (theme === 'system') {
        setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');
      } else {
        setResolvedTheme(theme);
      }
    };

    updateResolvedTheme();

    const listener = () => updateResolvedTheme();
    mediaQuery.addEventListener('change', listener);

    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all possible theme classes
    Object.keys(themes).forEach((t) => {
      root.classList.remove(`theme-${t}`);
      root.classList.remove(t);
    });

    // Add new theme class
    const themeClass = `theme-${resolvedTheme}`;
    root.classList.add(themeClass);
    
    if (resolvedTheme !== 'light') {
      root.classList.add('dark');
    } else {
      root.classList.add('light');
    }

    console.log(`[Theme] Switched to: ${resolvedTheme} (Applied class: ${themeClass})`);
    localStorage.setItem('theme', theme);
  }, [theme, resolvedTheme]);

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
