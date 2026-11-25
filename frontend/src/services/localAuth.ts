import { AuthUser } from '../types';

const ACCOUNTS_STORAGE_KEY = 'monvera_local_accounts_v1';
const SESSION_STORAGE_KEY = 'monvera_local_session_v1';

interface StoredAccount {
  _id: string;
  email: string;
  passwordHash: string;
  role: 'Proprietor' | 'Staff';
  createdAt: string;
}

// SHA-256 hex digest of the seeded proprietor credential (never stored in plain text)
const SEEDED_ADMIN_ACCOUNT: StoredAccount = {
  _id: 'admin-jb-proprietor',
  email: 'jb@alderandloom.com',
  passwordHash:
    'a2e103fe9e3f70e2d2caced8421bc3e90020051b8f1ec48cffd633e338bdb3d4',
  role: 'Proprietor',
  createdAt: '2026-01-01T00:00:00.000Z',
};

export const extractNameFromEmail = (email: string): string => {
  const prefix = email.trim().split('@')[0] || 'user';
  return prefix;
};

export const computeInitialsFromName = (name: string): string => {
  const cleaned = name.replace(/[^a-zA-Z0-9._-\s]/g, '').trim();
  const parts = cleaned.split(/[._-\s]+/).filter(Boolean);
  if (parts.length === 0) return 'MV';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

export const sha256Hex = async (input: string): Promise<string> => {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const data = new TextEncoder().encode(input);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  throw new Error('Web Crypto API SHA-256 is required in this browser.');
};

const toAuthUser = (account: StoredAccount): AuthUser => {
  const name = extractNameFromEmail(account.email);
  return {
    _id: account._id,
    fullName: name,
    email: account.email,
    role: account.role,
    initials: computeInitialsFromName(name),
    createdAt: account.createdAt,
  };
};

export const getStoredAccounts = (): StoredAccount[] => {
  let accounts: StoredAccount[] = [];
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        accounts = parsed;
      }
    }
  } catch {
    accounts = [];
  }

  const hasSeeded = accounts.some(
    (a) => a.email.toLowerCase() === SEEDED_ADMIN_ACCOUNT.email.toLowerCase()
  );
  if (!hasSeeded) {
    accounts = [SEEDED_ADMIN_ACCOUNT, ...accounts];
    try {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    } catch {
      // ignore storage quota issues
    }
  }

  return accounts;
};

const saveStoredAccounts = (accounts: StoredAccount[]): void => {
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
};

export const getStoredSessionUser = (): AuthUser | null => {
  try {
    const raw =
      localStorage.getItem(SESSION_STORAGE_KEY) ||
      sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed || !parsed.email || !parsed.role) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const saveSessionUser = (user: AuthUser, remember: boolean): void => {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  const serialized = JSON.stringify(user);
  if (remember) {
    localStorage.setItem(SESSION_STORAGE_KEY, serialized);
  } else {
    sessionStorage.setItem(SESSION_STORAGE_KEY, serialized);
  }
};

export const clearSessionUser = (): void => {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
};

export const signInLocal = async (
  email: string,
  password: string
): Promise<AuthUser> => {
  const normalizedEmail = email.trim().toLowerCase();
  const accounts = getStoredAccounts();
  const match = accounts.find(
    (a) => a.email.toLowerCase() === normalizedEmail
  );
  if (!match) {
    throw new Error('Incorrect email or password');
  }
  const enteredHash = await sha256Hex(password);
  if (enteredHash !== match.passwordHash) {
    throw new Error('Incorrect email or password');
  }
  return toAuthUser(match);
};

export const createAccountLocal = async (
  email: string,
  password: string
): Promise<AuthUser> => {
  const normalizedEmail = email.trim().toLowerCase();
  const accounts = getStoredAccounts();
  if (accounts.some((a) => a.email.toLowerCase() === normalizedEmail)) {
    throw new Error('An account with this email already exists.');
  }

  const passwordHash = await sha256Hex(password);
  const created: StoredAccount = {
    _id: `staff-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    email: normalizedEmail,
    passwordHash,
    role: 'Staff',
    createdAt: new Date().toISOString(),
  };

  saveStoredAccounts([...accounts, created]);
  return toAuthUser(created);
};
