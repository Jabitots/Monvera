import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowUpRight, Plus, RefreshCw } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { StatDisplay } from '../components/StatDisplay';
import { StatusBadge } from '../components/StatusBadge';
import { ProductImage } from '../components/ProductImage';
import { Modal } from '../components/Modal';
import { OrderForm } from '../components/OrderForm';
import {
  customersApi,
  dashboardApi,
  extractApiError,
  ordersApi,
  productsApi,
} from '../services/api';
import {
  Customer,
  DashboardSalesData,
  DashboardStats,
  Order,
  OrderStatus,
  Product,
  TopProduct,
} from '../types';
import {
  formatCurrency,
  formatHeaderDate,
  formatShortDate,
} from '../utils/formatters';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import {
  CountUpValue,
  EDITORIAL_EASE,
  RevealBlock,
} from '../components/MotionPrimitives';

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

export const Dashboard: React.FC = () => {
  const { notify } = useToast();
  const { user } = useAuth();
  const prefersReduced = useReducedMotion();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sales, setSales] = useState<DashboardSalesData | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick Order Modal & Order Inspect Modal
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inspectedOrder, setInspectedOrder] = useState<Order | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, salesRes, recentRes, topRes] = await Promise.all([
        dashboardApi.stats(),
        dashboardApi.sales(period),
        dashboardApi.recentOrders(5),
        dashboardApi.topProducts(4),
      ]);
      setStats(statsRes);
      setSales(salesRes);
      setRecentOrders(recentRes);
      setTopProducts(topRes);
    } catch (err) {
      setError(extractApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handlePeriodChange = async (next: 'daily' | 'weekly' | 'monthly') => {
    setPeriod(next);
    setChartLoading(true);
    try {
      const salesRes = await dashboardApi.sales(next);
      setSales(salesRes);
    } catch (err) {
      notify(extractApiError(err).message, 'error');
    } finally {
      setChartLoading(false);
    }
  };

  const openQuickOrder = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        customersApi.list({ limit: 100 }),
        productsApi.list({ limit: 100 }),
      ]);
      setCustomers(custRes.items);
      setProducts(prodRes.items);
      setOrderModalOpen(true);
    } catch (err) {
      notify(extractApiError(err).message, 'error');
    }
  };

  const handleCreateOrder = async (values: {
    customerId: string;
    orderItems: Array<{ productId: string; quantity: number }>;
    status: OrderStatus;
    notes?: string;
  }) => {
    setSubmittingOrder(true);
    try {
      await ordersApi.create(values);
      notify('Order recorded and inventory synchronized.', 'success');
      setOrderModalOpen(false);
      await loadDashboard();
    } catch (err) {
      notify(extractApiError(err).message, 'error');
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <MainLayout
      pageTitle="Business Overview"
      breadcrumb="Overview"
      metaInfo={
        stats
          ? `${stats.totalOrders} orders · ${stats.totalProducts} catalog items`
          : undefined
      }
    >
      {error ? (
        <div className="bg-[var(--color-surface-white)] border border-[#D9B6B1] rounded-2xl p-8 text-center space-y-4">
          <h2 className="font-serif text-2xl text-[#7D332B]">
            Unable to load business overview
          </h2>
          <p className="text-sm text-[var(--color-ink-muted)] max-w-md mx-auto">
            {error}
          </p>
          <button
            type="button"
            onClick={loadDashboard}
            className="btn-forest btn-shimmer inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[#1E3B2F] text-[#F5F0E6] hover:bg-[#152B22]"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {/* A & B: Asymmetric Welcome + Typographic Metrics + Atelier Dispatch */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-8 flex flex-col justify-between space-y-8">
              <motion.div
                initial={prefersReduced ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EDITORIAL_EASE }}
                className="space-y-3"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium tracking-wider uppercase text-[var(--color-sage)]">
                  <span>{formatHeaderDate()}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-[var(--color-forest)]">
                    {user?.role || 'Proprietor'}
                  </span>
                </div>
                <h1 className="font-serif text-3xl sm:text-4xl lg:text-[42px] font-medium leading-[1.12] tracking-tight text-[var(--color-forest)] max-w-2xl">
                  {getGreeting()},{' '}
                  {user?.email ? user.email.split('@')[0] : user?.fullName || 'jb'}
                  . Here is the state of your atelier.
                </h1>
                <p className="text-sm sm:text-base text-[var(--color-ink-muted)] max-w-xl leading-relaxed">
                  Track live product stock, fulfilling commissions, and client
                  purchases across your storefront ledger.
                </p>
              </motion.div>

              {/* Refined Typographic 4-Metric Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6 border-t border-[var(--color-border-strong)]">
                {loading || !stats ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2.5 py-2">
                      <div className="h-3 skeleton-shimmer rounded w-20" />
                      <div className="h-7 skeleton-shimmer rounded w-24" />
                    </div>
                  ))
                ) : (
                  <>
                    <StatDisplay
                      label="Total Revenue"
                      value={formatCurrency(stats.totalRevenue)}
                      numericValue={stats.totalRevenue}
                      formatter={(n) => formatCurrency(n)}
                      detail={`Avg. ${formatCurrency(stats.averageOrderValue)} / order`}
                      accent="forest"
                    />
                    <StatDisplay
                      label="Total Orders"
                      value={stats.totalOrders}
                      numericValue={stats.totalOrders}
                      formatter={(n) => String(Math.round(n))}
                      detail={`${stats.pendingOrdersCount} active in queue`}
                      accent="forest"
                    />
                    <StatDisplay
                      label="Total Products"
                      value={stats.totalProducts}
                      numericValue={stats.totalProducts}
                      formatter={(n) => String(Math.round(n))}
                      detail={
                        stats.lowStockCount > 0
                          ? `${stats.lowStockCount} low stock`
                          : 'All stock healthy'
                      }
                      accent={stats.lowStockCount > 0 ? 'sand' : 'sage'}
                    />
                    <StatDisplay
                      label="Total Customers"
                      value={stats.totalCustomers}
                      numericValue={stats.totalCustomers}
                      formatter={(n) => String(Math.round(n))}
                      detail="Registered profiles"
                      accent="sage"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Right Asymmetric Dispatch Panel */}
            <RevealBlock delay={0.08} className="lg:col-span-4 flex">
              <div className="card-elevate w-full rounded-2xl bg-[var(--color-surface-white)] border border-[var(--color-border)] p-6 flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                  <h2 className="font-serif text-lg font-medium text-[var(--color-forest)]">
                    Atelier Dispatch
                  </h2>
                  <span className="text-xs text-[var(--color-ink-subtle)] tabular-nums">
                    Live ledger
                  </span>
                </div>

                {loading || !stats ? (
                  <div className="space-y-3">
                    <div className="h-4 skeleton-shimmer rounded w-3/4" />
                    <div className="h-4 skeleton-shimmer rounded w-2/3" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-[var(--color-ink-muted)]">
                        Orders awaiting completion
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-[var(--color-forest)]">
                        <CountUpValue value={stats.pendingOrdersCount} />
                      </span>
                    </div>

                    <div className="pt-3 border-t border-[var(--color-border)] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[var(--color-ink-muted)]">
                          Inventory attention
                        </span>
                        <Link
                          to="/products"
                          className="link-underline text-xs font-medium text-[var(--color-forest)]"
                        >
                          Manage stock
                        </Link>
                      </div>

                      {stats.lowStockProducts.length === 0 ? (
                        <p className="text-xs text-[var(--color-ink-subtle)]">
                          All active products are comfortably stocked above 5 units.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {stats.lowStockProducts.map((item) => (
                            <li
                              key={item._id}
                              className="flex items-center justify-between text-xs py-1"
                            >
                              <span className="text-[var(--color-ink)] truncate pr-3">
                                {item.productName}
                              </span>
                              <span className="font-mono tabular-nums text-[#725522] shrink-0">
                                {item.stockQuantity} left
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={openQuickOrder}
                className="btn-forest btn-shimmer inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-[#1E3B2F] text-[#F5F0E6] hover:bg-[#152B22] whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                Create New Order
              </button>
              </div>
            </RevealBlock>
          </section>

          {/* C: Revenue Overview Section */}
          <RevealBlock delay={0.1}>
          <section className="card-elevate rounded-2xl bg-[var(--color-surface-white)] border border-[var(--color-border)] p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[var(--color-border)]">
              <div>
                <p className="text-xs text-[var(--color-ink-subtle)] tracking-wide">
                  Sales Performance
                </p>
                <div className="mt-1 flex flex-wrap items-baseline gap-4">
                  <h2 className="font-serif text-2xl sm:text-3xl font-medium text-[var(--color-forest)]">
                    Revenue Overview
                  </h2>
                  {sales ? (
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-lg sm:text-xl font-semibold tabular-nums text-[var(--color-ink)]">
                        <CountUpValue
                          value={sales.periodTotal}
                          formatter={(n) => formatCurrency(n)}
                        />
                      </span>
                      {sales.previousComparisonPercent !== null ? (
                        <span
                          className={`text-xs font-medium tabular-nums ${
                            sales.previousComparisonPercent >= 0
                              ? 'text-[var(--color-forest)]'
                              : 'text-[#7D332B]'
                          }`}
                        >
                          {sales.previousComparisonPercent >= 0 ? '+' : ''}
                          {sales.previousComparisonPercent}% vs prior half
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Segmented Timeframe Filter with Sliding Indicator */}
              <div
                role="tablist"
                aria-label="Revenue timeframe"
                className="inline-flex items-center gap-1 p-1 rounded-xl bg-[var(--color-cream)] border border-[var(--color-border)] self-start md:self-auto"
              >
                {(['daily', 'weekly', 'monthly'] as const).map((p) => {
                  const active = period === p;
                  return (
                    <button
                      key={p}
                      role="tab"
                      aria-selected={active}
                      type="button"
                      onClick={() => handlePeriodChange(p)}
                      className={`btn-soft relative px-3.5 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap shrink-0 ${
                        active
                          ? 'text-[#F5F0E6]'
                          : 'text-[var(--color-ink-muted)] bg-transparent shadow-none hover:text-[var(--color-ink)]'
                      }`}
                    >
                      {active ? (
                        <motion.span
                          layoutId="dashboard-period-pill"
                          transition={{ duration: 0.3, ease: EDITORIAL_EASE }}
                          aria-hidden="true"
                          className="absolute inset-0 rounded-lg bg-[#1E3B2F] shadow-[0_3px_10px_rgba(30,59,47,0.22)]"
                        />
                      ) : null}
                      <span className="relative z-10">{p}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 h-[290px] w-full">
              {loading || chartLoading || !sales ? (
                <div className="h-full w-full rounded-xl skeleton-shimmer" />
              ) : sales.series.every((s) => s.revenue === 0) ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <p className="font-serif text-lg text-[var(--color-forest)]">
                    No revenue recorded in this timeframe
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-ink-muted)] max-w-sm">
                    Non-cancelled orders placed within this period will chart here
                    automatically.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={sales.series}
                    margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="sageRevenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7F8C6A" stopOpacity={0.34} />
                        <stop offset="95%" stopColor="#F5F0E6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="rgba(30, 59, 47, 0.08)"
                    />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#76837A', fontSize: 12 }}
                      dy={8}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#76837A', fontSize: 12 }}
                      tickFormatter={(v) => `₱${v}`}
                      width={64}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1E3B2F',
                        border: '1px solid rgba(200, 180, 138, 0.4)',
                        borderRadius: '12px',
                        color: '#F5F0E6',
                        fontSize: '12px',
                        padding: '10px 14px',
                      }}
                      labelStyle={{
                        color: '#C8B48A',
                        fontWeight: 600,
                        marginBottom: '4px',
                      }}
                      formatter={(value: unknown, _name: unknown, item: { payload?: { ordersCount?: number } }) => [
                        `${formatCurrency(Number(value))} (${item?.payload?.ordersCount || 0} orders)`,
                        'Revenue',
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#1E3B2F"
                      strokeWidth={2.25}
                      fillOpacity={1}
                      fill="url(#sageRevenueFill)"
                      isAnimationActive={!prefersReduced}
                      animationDuration={850}
                      activeDot={{
                        r: 5,
                        fill: '#C8B48A',
                        stroke: '#1E3B2F',
                        strokeWidth: 2,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>
          </RevealBlock>

          {/* D & E: Recent Orders & Top-Selling Products Asymmetric Split */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* D: Recent Orders */}
            <RevealBlock delay={0.12} className="lg:col-span-7">
            <div className="card-elevate bg-[var(--color-surface-white)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)]">
                <div>
                  <h2 className="font-serif text-xl font-medium text-[var(--color-forest)]">
                    Recent Orders
                  </h2>
                  <p className="text-xs text-[var(--color-ink-subtle)] mt-0.5">
                    Latest transactions recorded in your ledger
                  </p>
                </div>
                <Link
                  to="/orders"
                  className="link-underline inline-flex items-center gap-1 text-xs font-medium text-[var(--color-forest)] whitespace-nowrap shrink-0"
                >
                  All orders
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {loading ? (
                <div className="divide-y divide-[var(--color-border)]">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="px-6 py-4 flex justify-between"
                    >
                      <div className="h-4 skeleton-shimmer rounded w-1/3" />
                      <div className="h-4 skeleton-shimmer rounded w-1/5" />
                    </div>
                  ))}
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="px-6 py-12 text-center space-y-3">
                  <p className="font-serif text-lg text-[var(--color-forest)]">
                    No orders yet
                  </p>
                  <p className="text-xs text-[var(--color-ink-muted)]">
                    Create your first customer order to populate recent activity.
                  </p>
                  <button
                    type="button"
                    onClick={openQuickOrder}
                    className="btn-forest btn-shimmer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-[#1E3B2F] text-[#F5F0E6]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create Order
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-cream)]/60">
                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-subtle)]">
                          Order ID
                        </th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-subtle)]">
                          Customer
                        </th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-subtle)]">
                          Date
                        </th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-subtle)] text-right">
                          Total
                        </th>
                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-subtle)] text-right">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {recentOrders.map((order, idx) => {
                        const custName =
                          order.customer?.fullName ||
                          (typeof order.customerId === 'object' &&
                          order.customerId
                            ? order.customerId.fullName
                            : 'Customer');
                        return (
                          <motion.tr
                            key={order._id}
                            initial={prefersReduced ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              duration: 0.35,
                              delay: Math.min(idx * 0.045, 0.25),
                              ease: EDITORIAL_EASE,
                            }}
                            onClick={() => setInspectedOrder(order)}
                            className="hover:bg-[var(--color-surface-cream)]/70 cursor-pointer transition-colors"
                          >
                            <td className="px-6 py-3.5 text-xs font-mono font-medium text-[var(--color-forest)] whitespace-nowrap">
                              {order.orderNumber}
                            </td>
                            <td className="px-4 py-3.5 text-sm text-[var(--color-ink)]">
                              {custName}
                            </td>
                            <td className="px-4 py-3.5 text-xs tabular-nums text-[var(--color-ink-muted)] whitespace-nowrap">
                              {formatShortDate(order.orderDate)}
                            </td>
                            <td className="px-4 py-3.5 text-sm font-medium tabular-nums text-right text-[var(--color-ink)] whitespace-nowrap">
                              {formatCurrency(order.totalAmount)}
                            </td>
                            <td className="px-6 py-3.5 text-right">
                              <StatusBadge status={order.status} />
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            </RevealBlock>

            {/* E: Top-Selling Products */}
            <RevealBlock delay={0.16} className="lg:col-span-5">
            <div className="card-elevate bg-[var(--color-surface-white)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)]">
                <div>
                  <h2 className="font-serif text-xl font-medium text-[var(--color-forest)]">
                    Top-Selling Products
                  </h2>
                  <p className="text-xs text-[var(--color-ink-subtle)] mt-0.5">
                    Ranked by actual units sold
                  </p>
                </div>
                <Link
                  to="/products"
                  className="link-underline inline-flex items-center gap-1 text-xs font-medium text-[var(--color-forest)] whitespace-nowrap shrink-0"
                >
                  Catalog
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {loading ? (
                <div className="divide-y divide-[var(--color-border)]">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="px-6 py-4 flex items-center gap-4"
                    >
                      <div className="w-12 h-12 rounded-xl skeleton-shimmer" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 skeleton-shimmer rounded w-1/2" />
                        <div className="h-3 skeleton-shimmer rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : topProducts.length === 0 ? (
                <div className="px-6 py-12 text-center space-y-2">
                  <p className="font-serif text-lg text-[var(--color-forest)]">
                    No product sales recorded
                  </p>
                  <p className="text-xs text-[var(--color-ink-muted)]">
                    Best-selling items appear once active orders are recorded.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--color-border)]">
                  {topProducts.map((item, idx) => {
                    const maxUnits = Math.max(
                      1,
                      ...topProducts.map((p) => p.unitsSold || 0)
                    );
                    const pct = Math.max(
                      10,
                      Math.round(((item.unitsSold || 0) / maxUnits) * 100)
                    );
                    return (
                      <motion.li
                        key={item.productId}
                        initial={prefersReduced ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.38,
                          delay: 0.08 + idx * 0.055,
                          ease: EDITORIAL_EASE,
                        }}
                        className="px-6 py-4 hover:bg-[var(--color-surface-cream)]/60 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <span className="font-serif text-sm text-[var(--color-ink-subtle)] w-5 shrink-0 tabular-nums">
                            0{idx + 1}.
                          </span>
                          <div className="w-12 h-12 rounded-xl overflow-hidden border border-[var(--color-border)] shrink-0">
                            <ProductImage
                              src={item.image}
                              alt={item.productName}
                              className="w-full h-full"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-[var(--color-ink)] truncate">
                              {item.productName}
                            </p>
                            <p className="text-xs text-[var(--color-ink-subtle)] tabular-nums">
                              {item.category} · {item.unitsSold} sold
                            </p>
                            {/* Animated relative demand bar */}
                            <div className="mt-2 h-1 w-full rounded-full bg-[var(--color-cream)] overflow-hidden">
                              <motion.div
                                initial={prefersReduced ? false : { width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{
                                  duration: 0.75,
                                  delay: 0.2 + idx * 0.07,
                                  ease: EDITORIAL_EASE,
                                }}
                                className={`h-full rounded-full ${
                                  idx === 0
                                    ? 'bg-[#1E3B2F]'
                                    : idx === 1
                                      ? 'bg-[#7F8C6A]'
                                      : 'bg-[#C8B48A]'
                                }`}
                              />
                            </div>
                          </div>
                          <span className="text-sm font-semibold tabular-nums text-[var(--color-forest)] shrink-0">
                            {formatCurrency(item.revenue)}
                          </span>
                        </div>
                      </motion.li>
                    );
                  })}
                </ul>
              )}
            </div>
            </RevealBlock>
          </section>
        </div>
      )}

      {/* Quick Create Order Modal */}
      <Modal
        open={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        title="Create Order"
        subtitle="Select customer and products; inventory updates automatically."
        maxWidth="xl"
      >
        <OrderForm
          customers={customers}
          products={products}
          onSubmit={handleCreateOrder}
          onCancel={() => setOrderModalOpen(false)}
          submitting={submittingOrder}
        />
      </Modal>

      {/* Inspect Recent Order Modal */}
      <Modal
        open={Boolean(inspectedOrder)}
        onClose={() => setInspectedOrder(null)}
        title={inspectedOrder ? `Order ${inspectedOrder.orderNumber}` : 'Order'}
        subtitle={
          inspectedOrder
            ? `Placed on ${formatShortDate(inspectedOrder.orderDate)}`
            : undefined
        }
        maxWidth="lg"
      >
        {inspectedOrder ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
              <div>
                <p className="text-xs text-[var(--color-ink-subtle)]">Customer</p>
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  {inspectedOrder.customer?.fullName ||
                    (typeof inspectedOrder.customerId === 'object' &&
                    inspectedOrder.customerId
                      ? inspectedOrder.customerId.fullName
                      : 'Customer')}
                </p>
              </div>
              <StatusBadge status={inspectedOrder.status} />
            </div>

            <div className="divide-y divide-[var(--color-border)] border border-[var(--color-border)] rounded-xl bg-[var(--color-surface-white)]">
              {inspectedOrder.orderItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-[var(--color-ink)]">
                      {item.productName}
                    </p>
                    <p className="text-xs text-[var(--color-ink-subtle)] tabular-nums">
                      {item.quantity} × {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <span className="font-semibold tabular-nums text-[var(--color-ink)]">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-sm font-medium text-[var(--color-ink-muted)]">
                Total Amount
              </span>
              <span className="font-serif text-2xl font-semibold tabular-nums text-[var(--color-forest)]">
                {formatCurrency(inspectedOrder.totalAmount)}
              </span>
            </div>

            <div className="flex justify-end pt-3 border-t border-[var(--color-border)]">
              <Link
                to="/orders"
                className="btn-forest btn-shimmer px-4 py-2 rounded-xl text-sm font-medium bg-[#1E3B2F] text-[#F5F0E6] hover:bg-[#152B22]"
              >
                Open in Orders
              </Link>
            </div>
          </div>
        ) : null}
      </Modal>
    </MainLayout>
  );
};
