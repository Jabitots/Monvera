import axios, { AxiosError } from 'axios';
import {
  AuthUser,
  Customer,
  CustomerProfileData,
  DashboardSalesData,
  DashboardStats,
  Order,
  OrderStatus,
  PaginatedResponse,
  Product,
  TopProduct,
} from '../types';

export const AUTH_TOKEN_KEY = 'verdant_ledger_token';

export const getStoredToken = (): string | null =>
  localStorage.getItem(AUTH_TOKEN_KEY) ||
  sessionStorage.getItem(AUTH_TOKEN_KEY);

export const setStoredToken = (token: string, remember = true): void => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  if (remember) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  }
};

export const clearStoredToken = (): void => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
};

export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/login') &&
      !error.config?.url?.includes('/auth/register')
    ) {
      clearStoredToken();
      window.dispatchEvent(new Event('verdant:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export interface ApiErrorInfo {
  message: string;
  status?: number;
  canArchive?: boolean;
}

export const extractApiError = (error: unknown): ApiErrorInfo => {
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<{
      message?: string;
      details?: { canArchive?: boolean } | string[];
    }>;
    const status = axiosErr.response?.status;
    const data = axiosErr.response?.data;
    const canArchive =
      typeof data?.details === 'object' &&
      !Array.isArray(data.details) &&
      Boolean(data.details?.canArchive);
    return {
      message:
        data?.message ||
        axiosErr.message ||
        'An unexpected network error occurred.',
      status,
      canArchive,
    };
  }
  return {
    message:
      error instanceof Error ? error.message : 'An unexpected error occurred.',
  };
};

export interface ProductsListResponse extends PaginatedResponse<Product> {
  categories: string[];
  lowStockCount: number;
  totalActive: number;
}

export interface CustomersListResponse extends PaginatedResponse<Customer> {
  totalActive: number;
}

export interface OrdersListResponse extends PaginatedResponse<Order> {
  statusSummary: {
    All: number;
    Pending: number;
    Processing: number;
    Completed: number;
    Cancelled: number;
  };
}

export const productsApi = {
  list: async (params?: {
    search?: string;
    category?: string;
    sort?: string;
    page?: number;
    limit?: number;
    includeArchived?: boolean;
  }) => {
    const res = await apiClient.get<{ success: boolean; data: ProductsListResponse }>(
      '/products',
      { params }
    );
    return res.data.data;
  },
  get: async (id: string) => {
    const res = await apiClient.get<{ success: boolean; data: Product }>(
      `/products/${id}`
    );
    return res.data.data;
  },
  create: async (payload: Omit<Product, '_id' | 'createdAt' | 'updatedAt'>) => {
    const res = await apiClient.post<{
      success: boolean;
      message: string;
      data: Product;
    }>('/products', payload);
    return res.data;
  },
  update: async (
    id: string,
    payload: Partial<Omit<Product, '_id' | 'createdAt' | 'updatedAt'>>
  ) => {
    const res = await apiClient.put<{
      success: boolean;
      message: string;
      data: Product;
    }>(`/products/${id}`, payload);
    return res.data;
  },
  remove: async (id: string, archive = false) => {
    const res = await apiClient.delete<{
      success: boolean;
      message: string;
    }>(`/products/${id}`, {
      params: archive ? { mode: 'archive' } : undefined,
    });
    return res.data;
  },
};

export const customersApi = {
  list: async (params?: {
    search?: string;
    page?: number;
    limit?: number;
    includeArchived?: boolean;
  }) => {
    const res = await apiClient.get<{
      success: boolean;
      data: CustomersListResponse;
    }>('/customers', { params });
    return res.data.data;
  },
  getProfile: async (id: string) => {
    const res = await apiClient.get<{
      success: boolean;
      data: CustomerProfileData;
    }>(`/customers/${id}`);
    return res.data.data;
  },
  create: async (payload: {
    fullName: string;
    email: string;
    contactNumber: string;
    address: string;
  }) => {
    const res = await apiClient.post<{
      success: boolean;
      message: string;
      data: Customer;
    }>('/customers', payload);
    return res.data;
  },
  update: async (
    id: string,
    payload: Partial<{
      fullName: string;
      email: string;
      contactNumber: string;
      address: string;
      isArchived: boolean;
    }>
  ) => {
    const res = await apiClient.put<{
      success: boolean;
      message: string;
      data: Customer;
    }>(`/customers/${id}`, payload);
    return res.data;
  },
  remove: async (id: string, archive = false) => {
    const res = await apiClient.delete<{
      success: boolean;
      message: string;
    }>(`/customers/${id}`, {
      params: archive ? { mode: 'archive' } : undefined,
    });
    return res.data;
  },
};

export const ordersApi = {
  list: async (params?: {
    search?: string;
    status?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await apiClient.get<{
      success: boolean;
      data: OrdersListResponse;
    }>('/orders', { params });
    return res.data.data;
  },
  get: async (id: string) => {
    const res = await apiClient.get<{ success: boolean; data: Order }>(
      `/orders/${id}`
    );
    return res.data.data;
  },
  create: async (payload: {
    customerId: string;
    orderItems: Array<{ productId: string; quantity: number }>;
    status?: OrderStatus;
    notes?: string;
  }) => {
    const res = await apiClient.post<{
      success: boolean;
      message: string;
      data: Order;
    }>('/orders', payload);
    return res.data;
  },
  update: async (
    id: string,
    payload: Partial<{
      customerId: string;
      orderItems: Array<{ productId: string; quantity: number }>;
      status: OrderStatus;
      notes: string;
    }>
  ) => {
    const res = await apiClient.put<{
      success: boolean;
      message: string;
      data: Order;
    }>(`/orders/${id}`, payload);
    return res.data;
  },
  remove: async (id: string) => {
    const res = await apiClient.delete<{
      success: boolean;
      message: string;
    }>(`/orders/${id}`);
    return res.data;
  },
};

export const dashboardApi = {
  stats: async () => {
    const res = await apiClient.get<{ success: boolean; data: DashboardStats }>(
      '/dashboard/stats'
    );
    return res.data.data;
  },
  sales: async (period: 'daily' | 'weekly' | 'monthly') => {
    const res = await apiClient.get<{
      success: boolean;
      data: DashboardSalesData;
    }>('/dashboard/sales', { params: { period } });
    return res.data.data;
  },
  recentOrders: async (limit = 5) => {
    const res = await apiClient.get<{ success: boolean; data: Order[] }>(
      '/dashboard/recent-orders',
      { params: { limit } }
    );
    return res.data.data;
  },
  topProducts: async (limit = 4) => {
    const res = await apiClient.get<{ success: boolean; data: TopProduct[] }>(
      '/dashboard/top-products',
      { params: { limit } }
    );
    return res.data.data;
  },
};

export const uploadApi = {
  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await apiClient.post<{
      success: boolean;
      data: { url: string; filename: string };
    }>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },
};

export const authApi = {
  login: async (payload: { email: string; password: string }) => {
    const res = await apiClient.post<{
      success: boolean;
      message: string;
      data: { user: AuthUser; token: string };
    }>('/auth/login', payload);
    return res.data.data;
  },
  register: async (payload: {
    fullName: string;
    email: string;
    password: string;
    role?: string;
  }) => {
    const res = await apiClient.post<{
      success: boolean;
      message: string;
      data: { user: AuthUser; token: string };
    }>('/auth/register', payload);
    return res.data.data;
  },
  me: async () => {
    const res = await apiClient.get<{
      success: boolean;
      data: { user: AuthUser };
    }>('/auth/me');
    return res.data.data.user;
  },
};
