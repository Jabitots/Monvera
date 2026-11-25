export type OrderStatus = 'Pending' | 'Processing' | 'Completed' | 'Cancelled';

export interface Product {
  _id: string;
  productName: string;
  description: string;
  category: string;
  price: number;
  stockQuantity: number;
  image: string;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  _id: string;
  fullName: string;
  email: string;
  contactNumber: string;
  address: string;
  isArchived?: boolean;
  orderCount?: number;
  totalSpent?: number;
  lastOrderDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Order {
  _id: string;
  orderNumber: string;
  customerId: string | Customer | null;
  customer?: Customer | null;
  orderItems: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  stockDeducted: boolean;
  orderDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerProfileData {
  customer: Customer;
  stats: {
    totalOrders: number;
    validOrdersCount: number;
    totalPurchaseAmount: number;
    mostRecentPurchase: Order | null;
  };
  orderHistory: Order[];
}

export interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalCustomers: number;
  totalRevenue: number;
  lowStockCount: number;
  lowStockProducts: Array<{
    _id: string;
    productName: string;
    stockQuantity: number;
    category: string;
  }>;
  pendingOrdersCount: number;
  averageOrderValue: number;
}

export interface DashboardSalesData {
  period: 'daily' | 'weekly' | 'monthly';
  periodTotal: number;
  previousComparisonPercent: number | null;
  series: Array<{
    label: string;
    revenue: number;
    ordersCount: number;
  }>;
}

export interface TopProduct {
  productId: string;
  productName: string;
  unitsSold: number;
  revenue: number;
  image: string;
  category: string;
  stockQuantity: number | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuthUser {
  _id: string;
  fullName: string;
  email: string;
  role: string;
  initials: string;
  createdAt: string;
}
