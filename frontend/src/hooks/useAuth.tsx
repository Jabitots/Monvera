import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  clearSessionUser,
  createAccountLocal,
  getStoredAccounts,
  getStoredSessionUser,
  saveSessionUser,
  signInLocal,
} from '../services/localAuth';
import { AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
    remember?: boolean,
    onBeforeCommit?: () => Promise<void>
  ) => Promise<void>;
  register: (
    payload: {
      email: string;
      password: string;
      remember?: boolean;
    },
    onBeforeCommit?: () => Promise<void>
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearSessionUser();
    setUser(null);
  }, []);

  useEffect(() => {
    // Seed default admin account into local data store & restore active session if present
    getStoredAccounts();
    const existing = getStoredSessionUser();
    setUser(existing);
    setLoading(false);

    const handleUnauthorized = () => {
      clearSessionUser();
      setUser(null);
    };
    window.addEventListener('verdant:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('verdant:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = useCallback(
    async (
      email: string,
      password: string,
      remember = true,
      onBeforeCommit?: () => Promise<void>
    ) => {
      const authenticated = await signInLocal(email, password);
      if (onBeforeCommit) {
        await onBeforeCommit();
      }
      saveSessionUser(authenticated, remember);
      setUser(authenticated);
    },
    []
  );

  const register = useCallback(
    async (
      payload: {
        email: string;
        password: string;
        remember?: boolean;
      },
      onBeforeCommit?: () => Promise<void>
    ) => {
      const created = await createAccountLocal(payload.email, payload.password);
      if (onBeforeCommit) {
        await onBeforeCommit();
      }
      saveSessionUser(created, payload.remember ?? true);
      setUser(created);
    },
    []
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
