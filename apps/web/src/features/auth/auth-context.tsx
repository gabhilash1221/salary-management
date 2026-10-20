import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { AuthSession } from '../../api/types';

type AuthContextValue = {
  session: AuthSession | null;
  login: (session: AuthSession) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = 'salary-auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      login(next) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setSession(next);
      },
      logout() {
        sessionStorage.removeItem(STORAGE_KEY);
        setSession(null);
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return value;
}
