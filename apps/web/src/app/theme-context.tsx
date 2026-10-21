import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from '../features/auth/auth-context';

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

function readThemeEvent(raw: string): Theme | null {
  try {
    const parsed = JSON.parse(raw) as {
      event?: unknown;
      data?: { theme?: unknown };
    };
    if (parsed.event !== 'theme') return null;
    if (parsed.data?.theme === 'day' || parsed.data?.theme === 'night') {
      return parsed.data.theme;
    }
  } catch {
    return null;
  }
  return null;
}

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const socketRef = useRef<WebSocket | null>(null);
  const pendingRef = useRef<Theme | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    const next = readTheme();
    applyTheme(next);
    return next;
  });

  const store = useCallback((next: Theme) => {
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    setTheme(next);
  }, []);

  useEffect(() => {
    const token = session?.token;
    if (!token || typeof WebSocket === 'undefined') return;
    let stopped = false;
    let socket: WebSocket | null = null;
    let attempt = 0;
    let timer = 0;

    const connect = () => {
      if (stopped) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      socket = new WebSocket(
        `${protocol}//${window.location.host}/api/v1/theme?token=${encodeURIComponent(token)}`,
      );
      socketRef.current = socket;
      socket.addEventListener('open', () => {
        attempt = 0;
        const pending = pendingRef.current;
        if (pending && socket?.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({ event: 'theme', data: { theme: pending } }),
          );
          pendingRef.current = null;
        }
      });
      socket.addEventListener('message', (event) => {
        const next = readThemeEvent(String(event.data));
        if (next) store(next);
      });
      socket.addEventListener('close', () => {
        if (socketRef.current === socket) socketRef.current = null;
        if (stopped) return;
        attempt += 1;
        if (attempt > 5) return;
        timer = window.setTimeout(connect, 500 * attempt);
      });
    };

    connect();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      socket?.close();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [session?.token, store]);

  const toggleTheme = useCallback(() => {
    const next = theme === 'day' ? 'night' : 'day';
    store(next);
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ event: 'theme', data: { theme: next } }));
    } else if (session?.token) {
      pendingRef.current = next;
    }
  }, [session?.token, store, theme]);

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
