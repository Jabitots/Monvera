import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface LocalProduct {
  _id: string;
  productName: string;
  description: string;
  category: string;
  price: number;
  stockQuantity: number;
  image: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LocalCustomer {
  _id: string;
  fullName: string;
  email: string;
  contactNumber: string;
  address: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LocalOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface LocalOrder {
  _id: string;
  orderNumber: string;
  customerId: string;
  orderItems: LocalOrderItem[];
  totalAmount: number;
  status: 'Pending' | 'Processing' | 'Completed' | 'Cancelled';
  stockDeducted: boolean;
  orderDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalUser {
  _id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  role: string;
  initials: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalDatabaseSchema {
  initialized: boolean;
  customersMigratedV2?: boolean;
  orderCounter: number;
  products: LocalProduct[];
  customers: LocalCustomer[];
  orders: LocalOrder[];
  users: LocalUser[];
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'verdant_ledger.json');

const defaultData: LocalDatabaseSchema = {
  initialized: false,
  customersMigratedV2: false,
  orderCounter: 0,
  products: [],
  customers: [],
  orders: [],
  users: [],
};

let cache: LocalDatabaseSchema | null = null;

export const generateObjectId = (): string =>
  crypto.randomBytes(12).toString('hex');

export const readLocalStore = (): LocalDatabaseSchema => {
  if (cache) return cache;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      cache = structuredClone(defaultData);
      fs.writeFileSync(DATA_FILE, JSON.stringify(cache, null, 2), 'utf-8');
      return cache;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as LocalDatabaseSchema;
    cache = {
      initialized: Boolean(parsed.initialized),
      customersMigratedV2: Boolean(parsed.customersMigratedV2),
      orderCounter: Number(parsed.orderCounter || 0),
      products: Array.isArray(parsed.products) ? parsed.products : [],
      customers: Array.isArray(parsed.customers) ? parsed.customers : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      users: Array.isArray(parsed.users) ? parsed.users : [],
    };
    return cache;
  } catch (error) {
    console.error('[LocalStore] Error reading store, resetting:', error);
    cache = structuredClone(defaultData);
    return cache;
  }
};

export const writeLocalStore = (nextData: LocalDatabaseSchema): void => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  cache = nextData;
  const tempFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(nextData, null, 2), 'utf-8');
  fs.renameSync(tempFile, DATA_FILE);
};
