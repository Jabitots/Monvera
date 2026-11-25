import mongoose, { ClientSession } from 'mongoose';
import { getDatabaseState } from '../config/db.js';
import { AppError } from '../middleware/errorMiddleware.js';
import { Product } from '../models/Product.js';
import { Customer } from '../models/Customer.js';
import { Order, OrderStatus } from '../models/Order.js';
import {
  generateObjectId,
  LocalCustomer,
  LocalOrder,
  LocalOrderItem,
  LocalProduct,
  readLocalStore,
  writeLocalStore,
} from './localStore.js';

export interface ProductQueryParams {
  search?: string;
  category?: string;
  sort?: string;
  includeArchived?: boolean;
  page?: number;
  limit?: number;
}

export interface CustomerQueryParams {
  search?: string;
  includeArchived?: boolean;
  page?: number;
  limit?: number;
}

export interface OrderQueryParams {
  search?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

const formatOrderNumber = (_num: number): string => {
  const year = new Date().getFullYear();
  // A generated ObjectId suffix stays unique even when older orders are deleted.
  return `ORD-${year}-${new mongoose.Types.ObjectId().toHexString()}`;
};

const consolidateItems = (
  items: Array<{ productId: string; quantity: number }>
): Array<{ productId: string; quantity: number }> => {
  const map = new Map<string, number>();
  for (const item of items) {
    const id = String(item.productId);
    map.set(id, (map.get(id) || 0) + Number(item.quantity));
  }
  return Array.from(map.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
};

async function runMongoTransaction<T>(
  fn: (session: ClientSession | null) => Promise<T>
): Promise<T> {
  const { supportsTransactions } = getDatabaseState();
  if (!supportsTransactions) {
    throw new AppError('Order inventory operations require MongoDB transactions. Configure Atlas or a replica set.', 503);
  }
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

/* ===========================
   PRODUCTS
   =========================== */

export const listProducts = async (params: ProductQueryParams) => {
  const {
    search = '',
    category = '',
    sort = 'newest',
    includeArchived = false,
    page = 1,
    limit = 50,
  } = params;
  const { mode } = getDatabaseState();

  if (mode === 'mongodb') {
    const filter: Record<string, unknown> = {};
    if (!includeArchived) filter.isArchived = { $ne: true };
    if (category && category !== 'All') filter.category = category;
    if (search.trim()) {
      filter.$or = [
        { productName: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { category: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      'price-asc': { price: 1 },
      'price-desc': { price: -1 },
      'name-asc': { productName: 1 },
      'name-desc': { productName: -1 },
    };

    const skip = (page - 1) * limit;
    const [items, total, categories, lowStockCount, totalActive] =
      await Promise.all([
        Product.find(filter)
          .sort(sortMap[sort] || sortMap.newest)
          .skip(skip)
          .limit(limit)
          .lean(),
        Product.countDocuments(filter),
        Product.distinct('category', { isArchived: { $ne: true } }),
        Product.countDocuments({
          isArchived: { $ne: true },
          stockQuantity: { $lte: 5 },
        }),
        Product.countDocuments({ isArchived: { $ne: true } }),
      ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      categories: (categories as string[]).sort(),
      lowStockCount,
      totalActive,
    };
  }

  const store = readLocalStore();
  let items = store.products.filter((p) =>
    includeArchived ? true : !p.isArchived
  );

  const activeProducts = store.products.filter((p) => !p.isArchived);
  const categories = Array.from(new Set(activeProducts.map((p) => p.category))).sort();
  const lowStockCount = activeProducts.filter((p) => p.stockQuantity <= 5).length;

  if (category && category !== 'All') {
    items = items.filter((p) => p.category === category);
  }
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    items = items.filter(
      (p) =>
        p.productName.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }

  items = [...items].sort((a, b) => {
    switch (sort) {
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      case 'name-asc':
        return a.productName.localeCompare(b.productName);
      case 'name-desc':
        return b.productName.localeCompare(a.productName);
      case 'newest':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const total = items.length;
  const start = (page - 1) * limit;
  const paged = items.slice(start, start + limit);

  return {
    items: paged,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    categories,
    lowStockCount,
    totalActive: activeProducts.length,
  };
};

export const getProductById = async (id: string) => {
  const { mode } = getDatabaseState();
  if (mode === 'mongodb') {
    const product = await Product.findById(id).lean();
    if (!product) throw new AppError('Product not found', 404);
    return product;
  }
  const store = readLocalStore();
  const product = store.products.find((p) => p._id === id);
  if (!product) throw new AppError('Product not found', 404);
  return product;
};

export const createProduct = async (payload: {
  productName: string;
  description: string;
  category: string;
  price: number;
  stockQuantity: number;
  image?: string;
}) => {
  const { mode } = getDatabaseState();
  if (mode === 'mongodb') {
    const created = await Product.create({
      ...payload,
      image: payload.image || '',
      isArchived: false,
    });
    return created.toObject();
  }

  const store = readLocalStore();
  const now = new Date().toISOString();
  const created: LocalProduct = {
    _id: generateObjectId(),
    productName: payload.productName,
    description: payload.description,
    category: payload.category,
    price: payload.price,
    stockQuantity: payload.stockQuantity,
    image: payload.image || '',
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };
  store.products.unshift(created);
  writeLocalStore(store);
  return created;
};

export const updateProduct = async (
  id: string,
  payload: Partial<{
    productName: string;
    description: string;
    category: string;
    price: number;
    stockQuantity: number;
    image: string;
    isArchived: boolean;
  }>
) => {
  const { mode } = getDatabaseState();
  if (mode === 'mongodb') {
    const updated = await Product.findByIdAndUpdate(
      id,
      { $set: payload },
      { new: true, runValidators: true }
    ).lean();
    if (!updated) throw new AppError('Product not found', 404);
    return updated;
  }

  const store = readLocalStore();
  const idx = store.products.findIndex((p) => p._id === id);
  if (idx === -1) throw new AppError('Product not found', 404);
  const updated: LocalProduct = {
    ...store.products[idx],
    ...payload,
    updatedAt: new Date().toISOString(),
  };
  store.products[idx] = updated;
  writeLocalStore(store);
  return updated;
};

export const deleteOrArchiveProduct = async (id: string, archiveOnly = false) => {
  const { mode } = getDatabaseState();
  if (mode === 'mongodb') {
    const product = await Product.findById(id);
    if (!product) throw new AppError('Product not found', 404);

    const hasOrders = await Order.exists({ 'orderItems.productId': id });
    if (hasOrders) {
      if (archiveOnly) {
        product.isArchived = true;
        await product.save();
        return { action: 'archived', product: product.toObject() };
      }
      throw new AppError(
        'This product appears in existing order history and cannot be permanently deleted. You may archive it instead to preserve historical order ledgers.',
        409,
        { canArchive: true }
      );
    }

    if (archiveOnly) {
      product.isArchived = true;
      await product.save();
      return { action: 'archived', product: product.toObject() };
    }

    await Product.findByIdAndDelete(id);
    return { action: 'deleted', _id: id };
  }

  const store = readLocalStore();
  const idx = store.products.findIndex((p) => p._id === id);
  if (idx === -1) throw new AppError('Product not found', 404);

  const hasOrders = store.orders.some((o) =>
    o.orderItems.some((item) => item.productId === id)
  );
  if (hasOrders) {
    if (archiveOnly) {
      store.products[idx].isArchived = true;
      store.products[idx].updatedAt = new Date().toISOString();
      writeLocalStore(store);
      return { action: 'archived', product: store.products[idx] };
    }
    throw new AppError(
      'This product appears in existing order history and cannot be permanently deleted. You may archive it instead to preserve historical order ledgers.',
      409,
      { canArchive: true }
    );
  }

  if (archiveOnly) {
    store.products[idx].isArchived = true;
    store.products[idx].updatedAt = new Date().toISOString();
    writeLocalStore(store);
    return { action: 'archived', product: store.products[idx] };
  }

  store.products.splice(idx, 1);
  writeLocalStore(store);
  return { action: 'deleted', _id: id };
};

/* ===========================
   CUSTOMERS
   =========================== */

export const listCustomers = async (params: CustomerQueryParams) => {
  const { search = '', includeArchived = false, page = 1, limit = 50 } = params;
  const { mode } = getDatabaseState();

  if (mode === 'mongodb') {
    const filter: Record<string, unknown> = {};
    if (!includeArchived) filter.isArchived = { $ne: true };
    if (search.trim()) {
      filter.$or = [
        { fullName: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
        { contactNumber: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [customers, total, totalActive, orders] = await Promise.all([
      Customer.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Customer.countDocuments(filter),
      Customer.countDocuments({ isArchived: { $ne: true } }),
      Order.find({ status: { $ne: 'Cancelled' } })
        .select('customerId totalAmount orderDate')
        .lean(),
    ]);

    const statsByCustomer = new Map<
      string,
      { orderCount: number; totalSpent: number; lastOrderDate: string | null }
    >();
    for (const o of orders) {
      const cid = String(o.customerId);
      const curr = statsByCustomer.get(cid) || {
        orderCount: 0,
        totalSpent: 0,
        lastOrderDate: null,
      };
      curr.orderCount += 1;
      curr.totalSpent = Number((curr.totalSpent + o.totalAmount).toFixed(2));
      const dt = new Date(o.orderDate).toISOString();
      if (!curr.lastOrderDate || dt > curr.lastOrderDate) {
        curr.lastOrderDate = dt;
      }
      statsByCustomer.set(cid, curr);
    }

    const enriched = customers.map((c) => {
      const st = statsByCustomer.get(String(c._id)) || {
        orderCount: 0,
        totalSpent: 0,
        lastOrderDate: null,
      };
      return { ...c, ...st };
    });

    return {
      items: enriched,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      totalActive,
    };
  }

  const store = readLocalStore();
  const activeCustomers = store.customers.filter((c) => !c.isArchived);
  let items = store.customers.filter((c) =>
    includeArchived ? true : !c.isArchived
  );

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    items = items.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.contactNumber.toLowerCase().includes(q)
    );
  }

  items = [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const statsByCustomer = new Map<
    string,
    { orderCount: number; totalSpent: number; lastOrderDate: string | null }
  >();
  for (const o of store.orders) {
    if (o.status === 'Cancelled') continue;
    const curr = statsByCustomer.get(o.customerId) || {
      orderCount: 0,
      totalSpent: 0,
      lastOrderDate: null,
    };
    curr.orderCount += 1;
    curr.totalSpent = Number((curr.totalSpent + o.totalAmount).toFixed(2));
    if (!curr.lastOrderDate || o.orderDate > curr.lastOrderDate) {
      curr.lastOrderDate = o.orderDate;
    }
    statsByCustomer.set(o.customerId, curr);
  }

  const total = items.length;
  const start = (page - 1) * limit;
  const paged = items.slice(start, start + limit).map((c) => {
    const st = statsByCustomer.get(c._id) || {
      orderCount: 0,
      totalSpent: 0,
      lastOrderDate: null,
    };
    return { ...c, ...st };
  });

  return {
    items: paged,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    totalActive: activeCustomers.length,
  };
};

export const getCustomerProfile = async (id: string) => {
  const { mode } = getDatabaseState();
  if (mode === 'mongodb') {
    const customer = await Customer.findById(id).lean();
    if (!customer) throw new AppError('Customer not found', 404);

    const orders = await Order.find({ customerId: id })
      .sort({ orderDate: -1 })
      .lean();

    const activeOrders = orders.filter((o) => o.status !== 'Cancelled');
    const totalOrders = orders.length;
    const totalPurchaseAmount = Number(
      activeOrders.reduce((sum, o) => sum + o.totalAmount, 0).toFixed(2)
    );
    const mostRecentPurchase = orders[0] || null;

    return {
      customer,
      stats: {
        totalOrders,
        validOrdersCount: activeOrders.length,
        totalPurchaseAmount,
        mostRecentPurchase,
      },
      orderHistory: orders,
    };
  }

  const store = readLocalStore();
  const customer = store.customers.find((c) => c._id === id);
  if (!customer) throw new AppError('Customer not found', 404);

  const orders = store.orders
    .filter((o) => o.customerId === id)
    .sort(
      (a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
    );

  const activeOrders = orders.filter((o) => o.status !== 'Cancelled');
  const totalPurchaseAmount = Number(
    activeOrders.reduce((sum, o) => sum + o.totalAmount, 0).toFixed(2)
  );

  return {
    customer,
    stats: {
      totalOrders: orders.length,
      validOrdersCount: activeOrders.length,
      totalPurchaseAmount,
      mostRecentPurchase: orders[0] || null,
    },
    orderHistory: orders,
  };
};

export const createCustomer = async (payload: {
  fullName: string;
  email: string;
  contactNumber: string;
  address: string;
}) => {
  const { mode } = getDatabaseState();
  if (mode === 'mongodb') {
    const existing = await Customer.findOne({ email: payload.email.toLowerCase() });
    if (existing) {
      throw new AppError('A customer with this email address already exists.', 409);
    }
    const created = await Customer.create({ ...payload, isArchived: false });
    return created.toObject();
  }

  const store = readLocalStore();
  const duplicate = store.customers.find(
    (c) => c.email.toLowerCase() === payload.email.toLowerCase()
  );
  if (duplicate) {
    throw new AppError('A customer with this email address already exists.', 409);
  }

  const now = new Date().toISOString();
  const created: LocalCustomer = {
    _id: generateObjectId(),
    ...payload,
    email: payload.email.toLowerCase(),
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };
  store.customers.unshift(created);
  writeLocalStore(store);
  return created;
};

export const updateCustomer = async (
  id: string,
  payload: Partial<{
    fullName: string;
    email: string;
    contactNumber: string;
    address: string;
    isArchived: boolean;
  }>
) => {
  const { mode } = getDatabaseState();
  if (mode === 'mongodb') {
    if (payload.email) {
      const existing = await Customer.findOne({
        email: payload.email.toLowerCase(),
        _id: { $ne: id },
      });
      if (existing) {
        throw new AppError('Another customer already uses this email address.', 409);
      }
    }
    const updated = await Customer.findByIdAndUpdate(
      id,
      { $set: payload },
      { new: true, runValidators: true }
    ).lean();
    if (!updated) throw new AppError('Customer not found', 404);
    return updated;
  }

  const store = readLocalStore();
  const idx = store.customers.findIndex((c) => c._id === id);
  if (idx === -1) throw new AppError('Customer not found', 404);

  if (payload.email) {
    const duplicate = store.customers.find(
      (c) =>
        c.email.toLowerCase() === payload.email!.toLowerCase() && c._id !== id
    );
    if (duplicate) {
      throw new AppError('Another customer already uses this email address.', 409);
    }
  }

  const updated: LocalCustomer = {
    ...store.customers[idx],
    ...payload,
    updatedAt: new Date().toISOString(),
  };
  store.customers[idx] = updated;
  writeLocalStore(store);
  return updated;
};

export const deleteOrArchiveCustomer = async (id: string, archiveOnly = false) => {
  const { mode } = getDatabaseState();
  if (mode === 'mongodb') {
    const customer = await Customer.findById(id);
    if (!customer) throw new AppError('Customer not found', 404);

    const hasOrders = await Order.exists({ customerId: id });
    if (hasOrders) {
      if (archiveOnly) {
        customer.isArchived = true;
        await customer.save();
        return { action: 'archived', customer: customer.toObject() };
      }
      throw new AppError(
        'This customer has existing order history and cannot be permanently deleted. You may archive the record to preserve ledger integrity.',
        409,
        { canArchive: true }
      );
    }

    if (archiveOnly) {
      customer.isArchived = true;
      await customer.save();
      return { action: 'archived', customer: customer.toObject() };
    }

    await Customer.findByIdAndDelete(id);
    return { action: 'deleted', _id: id };
  }

  const store = readLocalStore();
  const idx = store.customers.findIndex((c) => c._id === id);
  if (idx === -1) throw new AppError('Customer not found', 404);

  const hasOrders = store.orders.some((o) => o.customerId === id);
  if (hasOrders) {
    if (archiveOnly) {
      store.customers[idx].isArchived = true;
      store.customers[idx].updatedAt = new Date().toISOString();
      writeLocalStore(store);
      return { action: 'archived', customer: store.customers[idx] };
    }
    throw new AppError(
      'This customer has existing order history and cannot be permanently deleted. You may archive the record to preserve ledger integrity.',
      409,
      { canArchive: true }
    );
  }

  if (archiveOnly) {
    store.customers[idx].isArchived = true;
    store.customers[idx].updatedAt = new Date().toISOString();
    writeLocalStore(store);
    return { action: 'archived', customer: store.customers[idx] };
  }

  store.customers.splice(idx, 1);
  writeLocalStore(store);
  return { action: 'deleted', _id: id };
};

/* ===========================
   ORDERS & INVENTORY
   =========================== */

export const listOrders = async (params: OrderQueryParams) => {
  const { search = '', status = '', from = '', to = '', page = 1, limit = 50 } = params;
  const { mode } = getDatabaseState();

  if (mode === 'mongodb') {
    const filter: Record<string, unknown> = {};
    if (status && status !== 'All') filter.status = status;
    if (from || to) {
      const dateRange: Record<string, Date> = {};
      if (from) dateRange.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        dateRange.$lte = end;
      }
      filter.orderDate = dateRange;
    }

    let allMatching = await Order.find(filter)
      .populate('customerId', 'fullName email contactNumber address')
      .sort({ orderDate: -1 })
      .lean();

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      allMatching = allMatching.filter((o) => {
        const cust = o.customerId as unknown as { fullName?: string; email?: string } | null;
        return (
          o.orderNumber.toLowerCase().includes(q) ||
          String(o._id).toLowerCase().includes(q) ||
          (cust?.fullName || '').toLowerCase().includes(q) ||
          (cust?.email || '').toLowerCase().includes(q)
        );
      });
    }

    const allForSummary = await Order.find().select('status').lean();
    const statusSummary = {
      All: allForSummary.length,
      Pending: 0,
      Processing: 0,
      Completed: 0,
      Cancelled: 0,
    };
    for (const row of allForSummary) {
      if (row.status in statusSummary) {
        statusSummary[row.status as OrderStatus] += 1;
      }
    }

    const total = allMatching.length;
    const start = (page - 1) * limit;
    const items = allMatching.slice(start, start + limit).map((o) => ({
      ...o,
      customer: o.customerId,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      statusSummary,
    };
  }

  const store = readLocalStore();
  const customerMap = new Map(store.customers.map((c) => [c._id, c]));

  const statusSummary = {
    All: store.orders.length,
    Pending: 0,
    Processing: 0,
    Completed: 0,
    Cancelled: 0,
  };
  for (const o of store.orders) {
    statusSummary[o.status] += 1;
  }

  let items = store.orders.map((o) => ({
    ...o,
    customer: customerMap.get(o.customerId) || null,
  }));

  if (status && status !== 'All') {
    items = items.filter((o) => o.status === status);
  }
  if (from) {
    const fromTime = new Date(from).getTime();
    items = items.filter((o) => new Date(o.orderDate).getTime() >= fromTime);
  }
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    items = items.filter(
      (o) => new Date(o.orderDate).getTime() <= toDate.getTime()
    );
  }
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    items = items.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o._id.toLowerCase().includes(q) ||
        (o.customer?.fullName || '').toLowerCase().includes(q) ||
        (o.customer?.email || '').toLowerCase().includes(q)
    );
  }

  items.sort(
    (a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
  );

  const total = items.length;
  const start = (page - 1) * limit;
  const paged = items.slice(start, start + limit);

  return {
    items: paged,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    statusSummary,
  };
};

export const getOrderById = async (id: string) => {
  const { mode } = getDatabaseState();
  if (mode === 'mongodb') {
    const order = await Order.findById(id)
      .populate('customerId', 'fullName email contactNumber address')
      .lean();
    if (!order) throw new AppError('Order not found', 404);
    return { ...order, customer: order.customerId };
  }

  const store = readLocalStore();
  const order = store.orders.find((o) => o._id === id);
  if (!order) throw new AppError('Order not found', 404);
  const customer = store.customers.find((c) => c._id === order.customerId) || null;
  return { ...order, customer };
};

export const createOrder = async (payload: {
  customerId: string;
  orderItems: Array<{ productId: string; quantity: number }>;
  status?: OrderStatus;
  orderDate?: string;
  notes?: string;
}) => {
  const consolidated = consolidateItems(payload.orderItems);
  const targetStatus: OrderStatus = payload.status || 'Pending';
  const shouldDeduct = targetStatus !== 'Cancelled';
  const { mode } = getDatabaseState();

  if (mode === 'mongodb') {
    return runMongoTransaction(async (session) => {
      const customer = await Customer.findById(payload.customerId).session(session);
      if (!customer || customer.isArchived) {
        throw new AppError('Selected customer was not found or is archived.', 404);
      }

      const productIds = consolidated.map((i) => i.productId);
      const products = await Product.find({ _id: { $in: productIds } }).session(
        session
      );
      const productMap = new Map(products.map((p) => [String(p._id), p]));

      const builtItems = [];
      for (const item of consolidated) {
        const product = productMap.get(item.productId);
        if (!product) throw new AppError('Referenced product was not found.', 404);
        if (product.isArchived) {
          throw new AppError(
            'One of the selected products is unavailable or archived.',
            400
          );
        }
        if (shouldDeduct && product.stockQuantity < item.quantity) {
          throw new AppError(
            `Insufficient stock for "${product.productName}". Available: ${product.stockQuantity}, requested: ${item.quantity}.`,
            400
          );
        }
        if (shouldDeduct) {
          product.stockQuantity -= item.quantity;
          await product.save({ session });
        }
        builtItems.push({
          productId: product._id,
          productName: product.productName,
          quantity: item.quantity,
          unitPrice: product.price,
          subtotal: Number((product.price * item.quantity).toFixed(2)),
        });
      }

      const totalAmount = Number(
        builtItems.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2)
      );
      const count = await Order.countDocuments().session(session);
      const orderNumber = formatOrderNumber(101 + count);

      const [created] = await Order.create(
        [
          {
            orderNumber,
            customerId: customer._id,
            orderItems: builtItems,
            totalAmount,
            status: targetStatus,
            stockDeducted: shouldDeduct,
            orderDate: payload.orderDate ? new Date(payload.orderDate) : new Date(),
            notes: payload.notes?.trim() || '',
          },
        ],
        { session }
      );

      const populated = await Order.findById(created._id)
        .populate('customerId', 'fullName email contactNumber address')
        .session(session)
        .lean();
      return { ...populated, customer: populated?.customerId };
    });
  }

  // Local persistent store atomic operation
  const store = readLocalStore();
  const customer = store.customers.find((c) => c._id === payload.customerId);
  if (!customer || customer.isArchived) {
    throw new AppError('Selected customer was not found or is archived.', 404);
  }

  const productMap = new Map(store.products.map((p) => [p._id, p]));
  const builtItems: LocalOrderItem[] = [];

  // Validate stock for all items before mutating anything
  for (const item of consolidated) {
    const product = productMap.get(item.productId);
    if (!product) throw new AppError('Referenced product was not found.', 404);
    if (product.isArchived) {
      throw new AppError(
        'One of the selected products is unavailable or archived.',
        400
      );
    }
    if (shouldDeduct && product.stockQuantity < item.quantity) {
      throw new AppError(
        `Insufficient stock for "${product.productName}". Available: ${product.stockQuantity}, requested: ${item.quantity}.`,
        400
      );
    }
  }

  const now = new Date().toISOString();
  for (const item of consolidated) {
    const product = productMap.get(item.productId)!;
    if (shouldDeduct) {
      product.stockQuantity -= item.quantity;
      product.updatedAt = now;
    }
    builtItems.push({
      productId: product._id,
      productName: product.productName,
      quantity: item.quantity,
      unitPrice: product.price,
      subtotal: Number((product.price * item.quantity).toFixed(2)),
    });
  }

  const totalAmount = Number(
    builtItems.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2)
  );
  store.orderCounter = Math.max(store.orderCounter + 1, 101 + store.orders.length);

  const created: LocalOrder = {
    _id: generateObjectId(),
    orderNumber: formatOrderNumber(store.orderCounter),
    customerId: customer._id,
    orderItems: builtItems,
    totalAmount,
    status: targetStatus,
    stockDeducted: shouldDeduct,
    orderDate: payload.orderDate
      ? new Date(payload.orderDate).toISOString()
      : now,
    notes: payload.notes?.trim() || '',
    createdAt: now,
    updatedAt: now,
  };

  store.orders.unshift(created);
  writeLocalStore(store);

  return { ...created, customer };
};

export const updateOrder = async (
  id: string,
  payload: Partial<{
    customerId: string;
    orderItems: Array<{ productId: string; quantity: number }>;
    status: OrderStatus;
    orderDate: string;
    notes: string;
  }>
) => {
  const { mode } = getDatabaseState();

  if (mode === 'mongodb') {
    return runMongoTransaction(async (session) => {
      const existing = await Order.findById(id).session(session);
      if (!existing) throw new AppError('Order not found', 404);

      const newStatus: OrderStatus = payload.status || existing.status;
      const oldDeducted = existing.stockDeducted;
      const newDeducted = newStatus !== 'Cancelled';

      const existingItemsMap = new Map(
        existing.orderItems.map((i) => [String(i.productId), i])
      );
      const nextRawItems = payload.orderItems
        ? consolidateItems(payload.orderItems)
        : existing.orderItems.map((i) => ({
            productId: String(i.productId),
            quantity: i.quantity,
          }));

      const allProductIds = Array.from(
        new Set([
          ...existing.orderItems.map((i) => String(i.productId)),
          ...nextRawItems.map((i) => i.productId),
        ])
      );
      const products = await Product.find({ _id: { $in: allProductIds } }).session(
        session
      );
      const productMap = new Map(products.map((p) => [String(p._id), p]));

      // Compute net delta per product:
      // oldHeld = oldDeducted ? oldQty : 0
      // newHeld = newDeducted ? newQty : 0
      // stockChange = oldHeld - newHeld (positive restores stock, negative deducts stock)
      const oldQtyMap = new Map<string, number>();
      if (oldDeducted) {
        for (const item of existing.orderItems) {
          oldQtyMap.set(String(item.productId), item.quantity);
        }
      }
      const newQtyMap = new Map<string, number>();
      if (newDeducted) {
        for (const item of nextRawItems) {
          newQtyMap.set(item.productId, item.quantity);
        }
      }

      // Validate sufficiency first
      for (const pid of allProductIds) {
        const product = productMap.get(pid);
        const oldHeld = oldQtyMap.get(pid) || 0;
        const newHeld = newQtyMap.get(pid) || 0;
        const additionalNeeded = newHeld - oldHeld;
        if (additionalNeeded > 0) {
          if (!product) {
            throw new AppError('Selected product no longer exists.', 404);
          }
          if (product.stockQuantity < additionalNeeded) {
            throw new AppError(
              `Insufficient stock for "${product.productName}". Available: ${product.stockQuantity}, additional needed: ${additionalNeeded}.`,
              400
            );
          }
        }
      }

      // Apply inventory adjustments
      for (const pid of allProductIds) {
        const product = productMap.get(pid);
        if (!product) continue;
        const oldHeld = oldQtyMap.get(pid) || 0;
        const newHeld = newQtyMap.get(pid) || 0;
        const delta = oldHeld - newHeld;
        if (delta !== 0) {
          product.stockQuantity += delta;
          await product.save({ session });
        }
      }

      // Build updated order items preserving historical snapshot prices for existing lines
      const updatedOrderItems = nextRawItems.map((item) => {
        const prev = existingItemsMap.get(item.productId);
        const prod = productMap.get(item.productId);
        if (!prev && !prod) {
          throw new AppError('Referenced product was not found.', 404);
        }
        const unitPrice = prev ? prev.unitPrice : prod!.price;
        const productName = prev ? prev.productName : prod!.productName;
        return {
          productId: new mongoose.Types.ObjectId(item.productId),
          productName,
          quantity: item.quantity,
          unitPrice,
          subtotal: Number((unitPrice * item.quantity).toFixed(2)),
        };
      });

      if (payload.customerId && payload.customerId !== String(existing.customerId)) {
        const cust = await Customer.findById(payload.customerId).session(session);
        if (!cust) throw new AppError('Selected customer not found.', 404);
        existing.customerId = cust._id;
      }

      existing.orderItems = updatedOrderItems;
      existing.totalAmount = Number(
        updatedOrderItems.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2)
      );
      existing.status = newStatus;
      existing.stockDeducted = newDeducted;
      if (payload.orderDate) existing.orderDate = new Date(payload.orderDate);
      if (payload.notes !== undefined) existing.notes = payload.notes.trim();

      await existing.save({ session });

      const populated = await Order.findById(existing._id)
        .populate('customerId', 'fullName email contactNumber address')
        .session(session)
        .lean();
      return { ...populated, customer: populated?.customerId };
    });
  }

  // Local store parity
  const store = readLocalStore();
  const idx = store.orders.findIndex((o) => o._id === id);
  if (idx === -1) throw new AppError('Order not found', 404);

  const existing = store.orders[idx];
  const newStatus: OrderStatus = payload.status || existing.status;
  const oldDeducted = existing.stockDeducted;
  const newDeducted = newStatus !== 'Cancelled';

  const existingItemsMap = new Map(
    existing.orderItems.map((i) => [i.productId, i])
  );
  const nextRawItems = payload.orderItems
    ? consolidateItems(payload.orderItems)
    : existing.orderItems.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      }));

  const allProductIds = Array.from(
    new Set([
      ...existing.orderItems.map((i) => i.productId),
      ...nextRawItems.map((i) => i.productId),
    ])
  );
  const productMap = new Map(store.products.map((p) => [p._id, p]));

  const oldQtyMap = new Map<string, number>();
  if (oldDeducted) {
    for (const item of existing.orderItems) {
      oldQtyMap.set(item.productId, item.quantity);
    }
  }
  const newQtyMap = new Map<string, number>();
  if (newDeducted) {
    for (const item of nextRawItems) {
      newQtyMap.set(item.productId, item.quantity);
    }
  }

  // Validate stock sufficiency first
  for (const pid of allProductIds) {
    const product = productMap.get(pid);
    const oldHeld = oldQtyMap.get(pid) || 0;
    const newHeld = newQtyMap.get(pid) || 0;
    const additionalNeeded = newHeld - oldHeld;
    if (additionalNeeded > 0) {
      if (!product) {
        throw new AppError('Selected product no longer exists.', 404);
      }
      if (product.stockQuantity < additionalNeeded) {
        throw new AppError(
          `Insufficient stock for "${product.productName}". Available: ${product.stockQuantity}, additional needed: ${additionalNeeded}.`,
          400
        );
      }
    }
  }

  const now = new Date().toISOString();
  // Apply inventory adjustments
  for (const pid of allProductIds) {
    const product = productMap.get(pid);
    if (!product) continue;
    const oldHeld = oldQtyMap.get(pid) || 0;
    const newHeld = newQtyMap.get(pid) || 0;
    const delta = oldHeld - newHeld;
    if (delta !== 0) {
      product.stockQuantity += delta;
      product.updatedAt = now;
    }
  }

  const updatedOrderItems: LocalOrderItem[] = nextRawItems.map((item) => {
    const prev = existingItemsMap.get(item.productId);
    const prod = productMap.get(item.productId);
    if (!prev && !prod) {
      throw new AppError('Referenced product was not found.', 404);
    }
    const unitPrice = prev ? prev.unitPrice : prod!.price;
    const productName = prev ? prev.productName : prod!.productName;
    return {
      productId: item.productId,
      productName,
      quantity: item.quantity,
      unitPrice,
      subtotal: Number((unitPrice * item.quantity).toFixed(2)),
    };
  });

  let nextCustomerId = existing.customerId;
  if (payload.customerId && payload.customerId !== existing.customerId) {
    const cust = store.customers.find((c) => c._id === payload.customerId);
    if (!cust) throw new AppError('Selected customer not found.', 404);
    nextCustomerId = cust._id;
  }

  const updated: LocalOrder = {
    ...existing,
    customerId: nextCustomerId,
    orderItems: updatedOrderItems,
    totalAmount: Number(
      updatedOrderItems.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2)
    ),
    status: newStatus,
    stockDeducted: newDeducted,
    orderDate: payload.orderDate
      ? new Date(payload.orderDate).toISOString()
      : existing.orderDate,
    notes: payload.notes !== undefined ? payload.notes.trim() : existing.notes,
    updatedAt: now,
  };

  store.orders[idx] = updated;
  writeLocalStore(store);

  const customer =
    store.customers.find((c) => c._id === updated.customerId) || null;
  return { ...updated, customer };
};

export const deleteOrder = async (id: string) => {
  const { mode } = getDatabaseState();

  if (mode === 'mongodb') {
    return runMongoTransaction(async (session) => {
      const existing = await Order.findById(id).session(session);
      if (!existing) throw new AppError('Order not found', 404);

      if (existing.stockDeducted) {
        for (const item of existing.orderItems) {
          await Product.findByIdAndUpdate(
            item.productId,
            { $inc: { stockQuantity: item.quantity } },
            { session }
          );
        }
      }

      await Order.findByIdAndDelete(id).session(session);
      return {
        _id: id,
        stockRestored: existing.stockDeducted,
      };
    });
  }

  const store = readLocalStore();
  const idx = store.orders.findIndex((o) => o._id === id);
  if (idx === -1) throw new AppError('Order not found', 404);

  const existing = store.orders[idx];
  const now = new Date().toISOString();

  if (existing.stockDeducted) {
    const productMap = new Map(store.products.map((p) => [p._id, p]));
    for (const item of existing.orderItems) {
      const prod = productMap.get(item.productId);
      if (prod) {
        prod.stockQuantity += item.quantity;
        prod.updatedAt = now;
      }
    }
  }

  store.orders.splice(idx, 1);
  writeLocalStore(store);
  return { _id: id, stockRestored: existing.stockDeducted };
};

/* ===========================
   DASHBOARD ANALYTICS
   =========================== */

const loadNormalizedEntities = async () => {
  const { mode } = getDatabaseState();
  if (mode === 'mongodb') {
    const [products, customers, orders] = await Promise.all([
      Product.find({ isArchived: { $ne: true } }).lean(),
      Customer.find({ isArchived: { $ne: true } }).lean(),
      Order.find()
        .populate('customerId', 'fullName email')
        .sort({ orderDate: -1 })
        .lean(),
    ]);
    return { products, customers, orders };
  }

  const store = readLocalStore();
  const customerMap = new Map(store.customers.map((c) => [c._id, c]));
  const orders = store.orders
    .map((o) => ({
      ...o,
      customerId: customerMap.get(o.customerId) || null,
    }))
    .sort(
      (a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
    );

  return {
    products: store.products.filter((p) => !p.isArchived),
    customers: store.customers.filter((c) => !c.isArchived),
    orders,
  };
};

export const getDashboardStats = async () => {
  const { products, customers, orders } = await loadNormalizedEntities();
  const validOrders = orders.filter((o) => o.status !== 'Cancelled');
  const totalRevenue = Number(
    validOrders.reduce((sum, o) => sum + o.totalAmount, 0).toFixed(2)
  );
  const lowStockProducts = products.filter((p) => p.stockQuantity <= 5);
  const pendingOrdersCount = orders.filter(
    (o) => o.status === 'Pending' || o.status === 'Processing'
  ).length;
  const averageOrderValue =
    validOrders.length > 0
      ? Number((totalRevenue / validOrders.length).toFixed(2))
      : 0;

  return {
    totalProducts: products.length,
    totalOrders: orders.length,
    totalCustomers: customers.length,
    totalRevenue,
    lowStockCount: lowStockProducts.length,
    lowStockProducts: lowStockProducts.slice(0, 4).map((p) => ({
      _id: String(p._id),
      productName: p.productName,
      stockQuantity: p.stockQuantity,
      category: p.category,
    })),
    pendingOrdersCount,
    averageOrderValue,
  };
};

export const getDashboardSales = async (
  period: 'daily' | 'weekly' | 'monthly' = 'weekly'
) => {
  const { orders } = await loadNormalizedEntities();
  const validOrders = orders.filter((o) => o.status !== 'Cancelled');
  const now = new Date();

  const buckets: Array<{
    key: string;
    label: string;
    start: Date;
    end: Date;
    revenue: number;
    ordersCount: number;
  }> = [];

  if (period === 'daily') {
    for (let i = 13; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(now.getDate() - i);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      const label = start.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      buckets.push({
        key: start.toISOString().slice(0, 10),
        label,
        start,
        end,
        revenue: 0,
        ordersCount: 0,
      });
    }
  } else if (period === 'weekly') {
    for (let i = 7; i >= 0; i--) {
      const end = new Date(now);
      end.setDate(now.getDate() - i * 7);
      end.setHours(23, 59, 59, 999);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      const label = start.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      buckets.push({
        key: `W-${i}`,
        label,
        start,
        end,
        revenue: 0,
        ordersCount: 0,
      });
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1, 0, 0, 0, 0);
      const end = new Date(
        now.getFullYear(),
        now.getMonth() - i + 1,
        0,
        23,
        59,
        59,
        999
      );
      const label = start.toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit',
      });
      buckets.push({
        key: `${start.getFullYear()}-${start.getMonth() + 1}`,
        label,
        start,
        end,
        revenue: 0,
        ordersCount: 0,
      });
    }
  }

  for (const order of validOrders) {
    const od = new Date(order.orderDate).getTime();
    for (const bucket of buckets) {
      if (od >= bucket.start.getTime() && od <= bucket.end.getTime()) {
        bucket.revenue = Number((bucket.revenue + order.totalAmount).toFixed(2));
        bucket.ordersCount += 1;
        break;
      }
    }
  }

  const periodTotal = Number(
    buckets.reduce((sum, b) => sum + b.revenue, 0).toFixed(2)
  );

  // Split buckets into current half vs previous half for genuine period-over-period delta
  const mid = Math.floor(buckets.length / 2);
  const prevHalf = buckets
    .slice(0, mid)
    .reduce((sum, b) => sum + b.revenue, 0);
  const currHalf = buckets
    .slice(mid)
    .reduce((sum, b) => sum + b.revenue, 0);

  let growthPercent: number | null = null;
  if (prevHalf > 0) {
    growthPercent = Number((((currHalf - prevHalf) / prevHalf) * 100).toFixed(1));
  }

  return {
    period,
    periodTotal,
    previousComparisonPercent: growthPercent,
    series: buckets.map(({ label, revenue, ordersCount }) => ({
      label,
      revenue,
      ordersCount,
    })),
  };
};

export const getRecentOrders = async (limit = 5) => {
  const { orders } = await loadNormalizedEntities();
  return orders.slice(0, limit).map((o) => ({
    ...o,
    customer: o.customerId,
  }));
};

export const getTopProducts = async (limit = 4) => {
  const { products, orders } = await loadNormalizedEntities();
  const productImageMap = new Map(
    products.map((p) => [String(p._id), { image: p.image, category: p.category, stockQuantity: p.stockQuantity }])
  );

  const tally = new Map<
    string,
    {
      productId: string;
      productName: string;
      unitsSold: number;
      revenue: number;
      image: string;
      category: string;
      stockQuantity: number | null;
    }
  >();

  for (const order of orders) {
    if (order.status === 'Cancelled') continue;
    for (const item of order.orderItems) {
      const pid = String(item.productId);
      const meta = productImageMap.get(pid);
      const curr = tally.get(pid) || {
        productId: pid,
        productName: item.productName,
        unitsSold: 0,
        revenue: 0,
        image: meta?.image || '',
        category: meta?.category || 'Catalog',
        stockQuantity: meta?.stockQuantity ?? null,
      };
      curr.unitsSold += item.quantity;
      curr.revenue = Number((curr.revenue + item.subtotal).toFixed(2));
      tally.set(pid, curr);
    }
  }

  return Array.from(tally.values())
    .sort((a, b) => b.unitsSold - a.unitsSold || b.revenue - a.revenue)
    .slice(0, limit);
};
