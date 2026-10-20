import { useQueryClient } from '@tanstack/react-query';
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
import type { AuthSession } from '../../api/types';
import { setSessionExpiredHandler } from './session-expiry';
import { isTokenExpired, TOKEN_EXPIRED_MESSAGE, tokenExpiresAt } from './token';

type AuthContextValue = {
  session: AuthSession | null;
  login: (session: AuthSession) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = 'salary-auth';
const NOTICE_KEY = 'salary-auth-notice';
const TOAST_MS = 8000;
let restoreNoticeOnCleanup = true;

function readStoredSession(): AuthSession | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as AuthSession;
    if (!session?.token) return null;
    if (isTokenExpired(session.token)) {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.setItem(NOTICE_KEY, '1');
      return null;
    }
    return session;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function readInitialToast(): string | null {
  return sessionStorage.getItem(NOTICE_KEY) === '1'
    ? TOKEN_EXPIRED_MESSAGE
    : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<AuthSession | null>(readStoredSession);
  const [toast, setToast] = useState<string | null>(readInitialToast);
  const sessionRef = useRef(session);
  const notified = useRef(false);
  sessionRef.current = session;

  const expireSession = useCallback(() => {
    if (!sessionRef.current || notified.current) return;
    notified.current = true;
    sessionRef.current = null;
    sessionStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setToast(TOKEN_EXPIRED_MESSAGE);
    queryClient.clear();
  }, [queryClient]);

  const login = useCallback((next: AuthSession) => {
    notified.current = false;
    restoreNoticeOnCleanup = false;
    sessionRef.current = next;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    sessionStorage.removeItem(NOTICE_KEY);
    setSession(next);
    setToast(null);
  }, []);

  const logout = useCallback(() => {
    sessionRef.current = null;
    sessionStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(expireSession);
    return () => setSessionExpiredHandler(null);
  }, [expireSession]);

  useEffect(() => {
    if (sessionStorage.getItem(NOTICE_KEY) !== '1') return;
    restoreNoticeOnCleanup = true;
    sessionStorage.removeItem(NOTICE_KEY);
    setToast(TOKEN_EXPIRED_MESSAGE);
    return () => {
      if (restoreNoticeOnCleanup) sessionStorage.setItem(NOTICE_KEY, '1');
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    const expiresAt = tokenExpiresAt(session.token);
    if (expiresAt === null) return;
    const delay = expiresAt - Date.now();
    if (delay <= 0) {
      expireSession();
      return;
    }
    const handle = window.setTimeout(() => expireSession(), delay);
    return () => window.clearTimeout(handle);
  }, [session, expireSession]);

  useEffect(() => {
    if (!toast) return;
    const handle = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(handle);
  }, [toast]);

  const value = useMemo<AuthContextValue>(
    () => ({ session, login, logout }),
    [session, login, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {toast ? (
        <div className="toast-viewport">
          <p className="toast" role="alert">
            {toast}
          </p>
        </div>
      ) : null}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return value;
}
