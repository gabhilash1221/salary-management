import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

export type Theme = 'day' | 'night';

const STORAGE_KEY = 'salary-theme';

export function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'day' || stored === 'night') return stored;
  } catch {
    return 'day';
  }
  if (typeof window.matchMedia !== 'function') return 'day';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'night'
    : 'day';
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'night');
  document.documentElement.style.colorScheme =
    theme === 'night' ? 'dark' : 'light';
}

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const next = readTheme();
    applyTheme(next);
    return next;
  });

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === 'day' ? 'night' : 'day';
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return value;
}
