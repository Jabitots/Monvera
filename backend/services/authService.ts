import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getDatabaseState } from '../config/db.js';
import { AppError } from '../middleware/errorMiddleware.js';
import { User } from '../models/User.js';
import {
  generateObjectId,
  LocalUser,
  readLocalStore,
  writeLocalStore,
} from './localStore.js';

export interface SafeUserDTO {
  _id: string;
  fullName: string;
  email: string;
  role: string;
  initials: string;
  createdAt: string | Date;
}

const SECRET_FILE = path.resolve(process.cwd(), '.data', '.auth_secret');
let cachedSecret: string | null = null;

const getAuthSecret = (): string => {
  if (process.env.AUTH_SECRET?.trim()) {
    return process.env.AUTH_SECRET.trim();
  }
  if (cachedSecret) return cachedSecret;
  try {
    const dir = path.dirname(SECRET_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(SECRET_FILE)) {
      cachedSecret = fs.readFileSync(SECRET_FILE, 'utf-8').trim();
      if (cachedSecret) return cachedSecret;
    }
    cachedSecret = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(SECRET_FILE, cachedSecret, 'utf-8');
    return cachedSecret;
  } catch {
    cachedSecret = 'verdant-ledger-dev-secret';
    return cachedSecret;
  }
};

export const computeInitials = (fullName: string): string => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'VL';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export const hashPassword = (password: string): string => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
};

export const verifyPassword = (password: string, stored: string): boolean => {
  const [salt, expectedHex] = stored.split(':');
  if (!salt || !expectedHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  if (derived.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(derived, expectedBuf);
};

interface TokenPayload {
  sub: string;
  email: string;
  exp: number;
}

export const signAuthToken = (userId: string, email: string): string => {
  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' })
  ).toString('base64url');
  const payload: TokenPayload = {
    sub: userId,
    email,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getAuthSecret())
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
};

export const verifyAuthToken = (token: string): TokenPayload => {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new AppError('Invalid authentication token.', 401);
  }
  const [header, body, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', getAuthSecret())
    .update(`${header}.${body}`)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (
    sigBuf.length !== expBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expBuf)
  ) {
    throw new AppError('Invalid or tampered authentication token.', 401);
  }

  let parsed: TokenPayload;
  try {
    parsed = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf-8')
    ) as TokenPayload;
  } catch {
    throw new AppError('Malformed authentication token.', 401);
  }

  if (!parsed.sub || !parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
    throw new AppError('Session has expired. Please sign in again.', 401);
  }
  return parsed;
};

const toSafeUser = (u: {
  _id: unknown;
  fullName: string;
  email: string;
  role: string;
  initials: string;
  createdAt: string | Date;
}): SafeUserDTO => ({
  _id: String(u._id),
  fullName: u.fullName,
  email: u.email,
  role: u.role,
  initials: u.initials,
  createdAt: u.createdAt,
});

export const ensureDefaultUser = async (): Promise<void> => {
  const { mode } = getDatabaseState();
  const defaultEmail = 'jb@alderandloom.com';
  const defaultPass = 'Atelier2026!';

  if (mode === 'mongodb') {
    const count = await User.countDocuments();
    if (count > 0) return;
    await User.create({
      fullName: 'JB Hipolito',
      email: defaultEmail,
      passwordHash: hashPassword(defaultPass),
      role: 'Proprietor',
      initials: 'JB',
    });
    console.log(`[Auth] Seeded default proprietor user (${defaultEmail}).`);
    return;
  }

  const store = readLocalStore();
  if (store.users.length > 0) return;

  const now = new Date().toISOString();
  const seededUser: LocalUser = {
    _id: generateObjectId(),
    fullName: 'JB Hipolito',
    email: defaultEmail,
    passwordHash: hashPassword(defaultPass),
    role: 'Proprietor',
    initials: 'JB',
    createdAt: now,
    updatedAt: now,
  };
  store.users.push(seededUser);
  writeLocalStore(store);
  console.log(`[Auth] Seeded default proprietor user (${defaultEmail}).`);
};

export const loginUser = async (payload: {
  email: string;
  password: string;
}): Promise<{ user: SafeUserDTO; token: string }> => {
  const email = payload.email.trim().toLowerCase();
  const password = payload.password;
  const { mode } = getDatabaseState();

  if (mode === 'mongodb') {
    const user = await User.findOne({ email }).lean();
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new AppError('Invalid email address or password.', 401);
    }
    const safe = toSafeUser(user);
    return { user: safe, token: signAuthToken(safe._id, safe.email) };
  }

  const store = readLocalStore();
  const user = store.users.find((u) => u.email.toLowerCase() === email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new AppError('Invalid email address or password.', 401);
  }
  const safe = toSafeUser(user);
  return { user: safe, token: signAuthToken(safe._id, safe.email) };
};

export const registerUser = async (payload: {
  fullName: string;
  email: string;
  password: string;
  role?: string;
}): Promise<{ user: SafeUserDTO; token: string }> => {
  const fullName = payload.fullName.trim();
  const email = payload.email.trim().toLowerCase();
  const role = payload.role?.trim() || 'Proprietor';
  const initials = computeInitials(fullName);
  const passwordHash = hashPassword(payload.password);
  const { mode } = getDatabaseState();

  if (mode === 'mongodb') {
    const existing = await User.findOne({ email });
    if (existing) {
      throw new AppError('An account with this email address already exists.', 409);
    }
    const created = await User.create({
      fullName,
      email,
      passwordHash,
      role,
      initials,
    });
    const safe = toSafeUser(created);
    return { user: safe, token: signAuthToken(safe._id, safe.email) };
  }

  const store = readLocalStore();
  if (store.users.some((u) => u.email.toLowerCase() === email)) {
    throw new AppError('An account with this email address already exists.', 409);
  }

  const now = new Date().toISOString();
  const created: LocalUser = {
    _id: generateObjectId(),
    fullName,
    email,
    passwordHash,
    role,
    initials,
    createdAt: now,
    updatedAt: now,
  };
  store.users.push(created);
  writeLocalStore(store);

  const safe = toSafeUser(created);
  return { user: safe, token: signAuthToken(safe._id, safe.email) };
};

export const getUserById = async (id: string): Promise<SafeUserDTO> => {
  const { mode } = getDatabaseState();
  if (mode === 'mongodb') {
    const user = await User.findById(id).lean();
    if (!user) throw new AppError('Account not found.', 401);
    return toSafeUser(user);
  }
  const store = readLocalStore();
  const user = store.users.find((u) => u._id === id);
  if (!user) throw new AppError('Account not found.', 401);
  return toSafeUser(user);
};
