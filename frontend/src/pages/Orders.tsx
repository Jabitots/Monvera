import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { ColumnDef, DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { OrderForm } from '../components/OrderForm';
import {
  customersApi,
  extractApiError,
  ordersApi,
  productsApi,
} from '../services/api';
import { Customer, Order, OrderStatus, Product } from '../types';
import { formatCurrency, formatShortDate } from '../utils/formatters';
import { useDebounce } from '../hooks/useDebounce';
import { useToast } from '../hooks/useToast';
import { EDITORIAL_EASE, RevealBlock } from '../components/MotionPrimitives';

const STATUS_TABS: Array<'All' | OrderStatus> = [
  'All',
  'Pending',
  'Processing',
  'Completed',
  'Cancelled',
];

export const Orders: React.FC = () => {
  const { notify } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusSummary, setStatusSummary] = useState({
    All: 0,
    Pending: 0,
    Processing: 0,
    Completed: 0,
    Cancelled: 0,
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 250);
  const [statusFilter, setStatusFilter] = useState<'All' | OrderStatus>('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ordersApi.list({
        search: debouncedSearch,
        status: statusFilter,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        page,
        limit: 12,
      });
      setOrders(res.items);
      setStatusSummary(res.statusSummary);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      notify(extractApiError(err).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, dateFrom, dateTo, page, notify]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, dateFrom, dateTo]);

  const loadFormDependencies = async () => {
    const [custRes, prodRes] = await Promise.all([
      customersApi.list({ limit: 100 }),
      productsApi.list({ limit: 100 }),
    ]);
    setCustomers(custRes.items);
    setProducts(prodRes.items);
  };

  const handleOpenCreate = async () => {
    try {
      await loadFormDependencies();
      setEditingOrder(null);
      setFormOpen(true);
    } catch (err) {
      notify(extractApiError(err).message, 'error');
    }
  };

  const handleOpenEdit = async (order: Order) => {
    try {
      await loadFormDependencies();
      setEditingOrder(order);
      setDetailOrder(null);
      setFormOpen(true);
    } catch (err) {
      notify(extractApiError(err).message, 'error');
    }
  };

  const handleFormSubmit = async (values: {
    customerId: string;
    orderItems: Array<{ productId: string; quantity: number }>;
    status: OrderStatus;
    notes?: string;
  }) => {
    setSubmitting(true);
    try {
      if (editingOrder) {
        const res = await ordersApi.update(editingOrder._id, values);
        notify(res.message, 'success');
      } else {
        const res = await ordersApi.create(values);
        notify(res.message, 'success');
      }
      setFormOpen(false);
      setEditingOrder(null);
      await fetchOrders();
    } catch (err) {
      notify(extractApiError(err).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickStatusChange = async (
    order: Order,
    nextStatus: OrderStatus
  ) => {
    if (order.status === nextStatus) return;
    setStatusUpdating(true);
    try {
      const res = await ordersApi.update(order._id, { status: nextStatus });
      notify(res.message, 'success');
      setDetailOrder(res.data);
      await fetchOrders();
    } catch (err) {
      notify(extractApiError(err).message, 'error');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await ordersApi.remove(deleteTarget._id);
      notify(res.message, 'success');
      setDeleteTarget(null);
      if (detailOrder?._id === deleteTarget._id) {
        setDetailOrder(null);
      }
      await fetchOrders();
    } catch (err) {
      notify(extractApiError(err).message, 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: ColumnDef<Order>[] = [
    {
      key: 'orderNumber',
      header: 'Order ID',
      render: (o) => (
        <span className="font-mono text-xs font-medium text-[var(--color-forest)] whitespace-nowrap">
          {o.orderNumber}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (o) => {
        const name =
          o.customer?.fullName ||
          (typeof o.customerId === 'object' && o.customerId
            ? o.customerId.fullName
            : 'Customer');
        return <span className="font-medium text-[var(--color-ink)]">{name}</span>;
      },
    },
    {
      key: 'orderDate',
      header: 'Order Date',
      render: (o) => (
        <span className="text-xs tabular-nums text-[var(--color-ink-muted)] whitespace-nowrap">
          {formatShortDate(o.orderDate)}
        </span>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      align: 'right',
      render: (o) => {
        const totalUnits = o.orderItems.reduce((s, i) => s + i.quantity, 0);
        return (
          <span className="text-xs tabular-nums text-[var(--color-ink-muted)] whitespace-nowrap">
            {totalUnits} {totalUnits === 1 ? 'unit' : 'units'} ({o.orderItems.length}{' '}
            {o.orderItems.length === 1 ? 'line' : 'lines'})
          </span>
        );
      },
    },
    {
      key: 'totalAmount',
      header: 'Total Amount',
      align: 'right',
      render: (o) => (
        <span className="font-semibold tabular-nums text-[var(--color-ink)] whitespace-nowrap">
          {formatCurrency(o.totalAmount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (o) => <StatusBadge status={o.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (o) => (
        <div className="inline-flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDetailOrder(o);
            }}
            aria-label={`View ${o.orderNumber}`}
            className="btn-soft p-2 rounded-lg bg-white text-[var(--color-ink-muted)] hover:text-[var(--color-forest)] hover:bg-[var(--color-cream)]"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEdit(o);
            }}
            aria-label={`Edit ${o.orderNumber}`}
            className="btn-soft p-2 rounded-lg bg-white text-[var(--color-ink-muted)] hover:text-[var(--color-forest)] hover:bg-[var(--color-cream)]"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(o);
            }}
            aria-label={`Delete ${o.orderNumber}`}
            className="btn-soft p-2 rounded-lg bg-white text-[var(--color-ink-muted)] hover:text-[#7D332B] hover:bg-[#F5E9E7]"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <MainLayout
      pageTitle="Order Ledger"
      breadcrumb="Orders"
      metaInfo={`${statusSummary.All} total · ${statusSummary.Pending} pending`}
    >
      <div className="space-y-8">
        {/* Editorial Heading & Status Summary */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[var(--color-border-strong)]">
          <div className="space-y-2 max-w-2xl">
            <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight text-[var(--color-forest)]">
              Orders
            </h1>
            <p className="text-sm sm:text-base text-[var(--color-ink-muted)] leading-relaxed">
              Manage fulfillment stages, review itemized purchase snapshots, and
              keep catalog inventory automatically synchronized.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="btn-forest btn-shimmer inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-[#1E3B2F] text-[#F5F0E6] hover:bg-[#152B22] self-start md:self-auto whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create Order
          </button>
        </section>

        {/* Status Summary Tabs & Search / Date Filters */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`btn-soft relative inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 border ${
                    active
                      ? 'text-[#F5F0E6] border-[#1E3B2F]'
                      : 'bg-[var(--color-surface-white)] text-[var(--color-ink-muted)] border-[var(--color-border)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  {active ? (
                    <motion.span
                      layoutId="orders-status-pill"
                      transition={{ duration: 0.28, ease: EDITORIAL_EASE }}
                      aria-hidden="true"
                      className="absolute inset-0 rounded-xl bg-[#1E3B2F]"
                    />
                  ) : null}
                  <span className="relative z-10">{tab}</span>
                  <span
                    className={`relative z-10 tabular-nums ${
                      active ? 'text-[#C8B48A]' : 'text-[var(--color-ink-subtle)]'
                    }`}
                  >
                    {statusSummary[tab]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-[var(--color-ink-subtle)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search order ID or customer..."
                aria-label="Search orders"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-white)] text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[#1E3B2F]/25 focus:border-[#1E3B2F]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <label className="text-xs text-[var(--color-ink-subtle)]">
                From
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="ml-2 px-3 py-2 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-white)] text-xs tabular-nums text-[var(--color-ink)]"
                />
              </label>

              <label className="text-xs text-[var(--color-ink-subtle)]">
                To
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="ml-2 px-3 py-2 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-white)] text-xs tabular-nums text-[var(--color-ink)]"
                />
              </label>

              {(dateFrom || dateTo || search || statusFilter !== 'All') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('All');
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className="btn-soft px-3 py-2 rounded-xl bg-white text-xs font-medium text-[var(--color-forest)] hover:bg-[var(--color-surface-cream)]"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Order Ledger Table */}
        <RevealBlock delay={0.05}>
        <DataTable
          columns={columns}
          data={orders}
          rowKey={(o) => o._id}
          loading={loading}
          onRowClick={(o) => setDetailOrder(o)}
          emptyTitle="No orders match your filters"
          emptyDescription="Adjust your status or date range filters, or create a new customer order."
          emptyAction={
            <button
              type="button"
              onClick={handleOpenCreate}
              className="btn-forest btn-shimmer inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[#1E3B2F] text-[#F5F0E6]"
            >
              <Plus className="w-4 h-4" />
              Create Order
            </button>
          }
        />
        </RevealBlock>

        {/* Pagination */}
        {totalPages > 1 ? (
          <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-ink-subtle)] tabular-nums">
              Page {page} of {totalPages} ({total} matching orders)
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn-soft inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-white)] text-xs font-medium text-[var(--color-ink)] disabled:opacity-40 hover:bg-[var(--color-cream)]"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="btn-soft inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-white)] text-xs font-medium text-[var(--color-ink)] disabled:opacity-40 hover:bg-[var(--color-cream)]"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Create / Edit Order Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={
          editingOrder ? `Edit ${editingOrder.orderNumber}` : 'Create Order'
        }
        subtitle="Line item prices are preserved as historical snapshots; stock adjusts automatically."
        maxWidth="xl"
      >
        <OrderForm
          initialData={editingOrder}
          customers={customers}
          products={products}
          onSubmit={handleFormSubmit}
          onCancel={() => setFormOpen(false)}
          submitting={submitting}
        />
      </Modal>

      {/* View Individual Order Detail Modal */}
      <Modal
        open={Boolean(detailOrder)}
        onClose={() => setDetailOrder(null)}
        title={detailOrder ? `Order ${detailOrder.orderNumber}` : 'Order'}
        subtitle={
          detailOrder
            ? `Recorded on ${formatShortDate(detailOrder.orderDate)}`
            : undefined
        }
        maxWidth="xl"
      >
        {detailOrder ? (
          <div className="space-y-6">
            {/* Customer & Quick Status Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[var(--color-surface-white)] border border-[var(--color-border)]">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-subtle)]">
                  Customer Record
                </span>
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  {detailOrder.customer?.fullName ||
                    (typeof detailOrder.customerId === 'object' &&
                    detailOrder.customerId
                      ? detailOrder.customerId.fullName
                      : 'Customer')}
                </p>
                {detailOrder.customer?.email ? (
                  <p className="text-xs text-[var(--color-ink-muted)]">
                    {detailOrder.customer.email}
                  </p>
                ) : null}
                {detailOrder.customer?.address ? (
                  <p className="text-xs text-[var(--color-ink-subtle)]">
                    {detailOrder.customer.address}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2 sm:text-right">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-subtle)]">
                  Update Fulfillment Status
                </span>
                <div className="flex sm:justify-end items-center gap-2">
                  <select
                    value={detailOrder.status}
                    disabled={statusUpdating}
                    onChange={(e) =>
                      handleQuickStatusChange(
                        detailOrder,
                        e.target.value as OrderStatus
                      )
                    }
                    aria-label="Order status"
                    className="px-3 py-1.5 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-cream)] text-xs font-medium text-[var(--color-ink)]"
                  >
                    {(['Pending', 'Processing', 'Completed', 'Cancelled'] as const).map(
                      (st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <p className="text-[11px] text-[var(--color-ink-subtle)]">
                  {detailOrder.stockDeducted
                    ? 'Inventory deducted from catalog stock'
                    : 'Inventory released (Cancelled)'}
                </p>
              </div>
            </div>

            {/* Itemized Historical Snapshot */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-white)] overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-cream)]/60">
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-subtle)]">
                      Product Snapshot
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-subtle)] text-right">
                      Unit Price
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-subtle)] text-right">
                      Qty
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-subtle)] text-right">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {detailOrder.orderItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 text-sm font-medium text-[var(--color-ink)]">
                        {item.productName}
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums text-right text-[var(--color-ink-muted)]">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums text-right text-[var(--color-ink)]">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold tabular-nums text-right text-[var(--color-ink)]">
                        {formatCurrency(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {detailOrder.notes ? (
              <div className="px-4 py-3 rounded-xl bg-[var(--color-cream)] border border-[var(--color-border)] text-xs text-[var(--color-ink-muted)]">
                <span className="font-semibold text-[var(--color-ink)]">Notes: </span>
                {detailOrder.notes}
              </div>
            ) : null}

            <div className="flex items-center justify-between pt-2">
              <span className="text-sm font-medium text-[var(--color-ink-muted)]">
                Order Total
              </span>
              <span className="font-serif text-2xl font-semibold tabular-nums text-[var(--color-forest)]">
                {formatCurrency(detailOrder.totalAmount)}
              </span>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setDeleteTarget(detailOrder)}
                className="btn-soft inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-xs font-medium text-[#7D332B] hover:bg-[#F5E9E7]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Order
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setDetailOrder(null)}
                  className="btn-soft px-4 py-2 rounded-xl bg-white text-sm font-medium text-[var(--color-ink-muted)] hover:bg-[var(--color-cream)]"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(detailOrder)}
                  className="btn-forest btn-shimmer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-[#1E3B2F] text-[#F5F0E6] hover:bg-[#152B22]"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Order
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Order?"
        description={
          deleteTarget
            ? deleteTarget.stockDeducted
              ? `Deleting ${deleteTarget.orderNumber} will permanently remove this record and restore its item quantities back into product stock.`
              : `Deleting cancelled order ${deleteTarget.orderNumber} will permanently remove this record. Inventory was already restored when cancelled.`
            : ''
        }
        confirmLabel="Delete Order"
        loading={deleteLoading}
      />
    </MainLayout>
  );
};
