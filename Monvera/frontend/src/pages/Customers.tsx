import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { ColumnDef, DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { CustomerForm } from '../components/CustomerForm';
import { customersApi, extractApiError } from '../services/api';
import { Customer, CustomerProfileData } from '../types';
import {
  formatCurrency,
  formatShortDate,
  formatShortId,
} from '../utils/formatters';
import { useDebounce } from '../hooks/useDebounce';
import { useToast } from '../hooks/useToast';
import {
  CountUpValue,
  EDITORIAL_EASE,
  RevealBlock,
} from '../components/MotionPrimitives';

export const Customers: React.FC = () => {
  const { notify } = useToast();
  const prefersReduced = useReducedMotion();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [totalActive, setTotalActive] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 250);
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profile, setProfile] = useState<CustomerProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [archivePrompt, setArchivePrompt] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await customersApi.list({
        search: debouncedSearch,
        page,
        limit: 20,
      });
      setCustomers(res.items);
      setTotal(res.total);
      setTotalActive(res.totalActive);
      setTotalPages(res.totalPages);

      if (res.items.length > 0 && !selectedId) {
        setSelectedId(res.items[0]._id);
      }
    } catch (err) {
      notify(extractApiError(err).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, notify, selectedId]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const loadCustomerProfile = useCallback(
    async (id: string) => {
      setProfileLoading(true);
      try {
        const data = await customersApi.getProfile(id);
        setProfile(data);
      } catch (err) {
        notify(extractApiError(err).message, 'error');
      } finally {
        setProfileLoading(false);
      }
    },
    [notify]
  );

  useEffect(() => {
    if (selectedId) {
      loadCustomerProfile(selectedId);
    } else {
      setProfile(null);
    }
  }, [selectedId, loadCustomerProfile]);

  const handleSelectCustomer = (c: Customer) => {
    setSelectedId(c._id);
    if (window.innerWidth < 1024) {
      setMobileProfileOpen(true);
    }
  };

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormOpen(true);
  };

  const handleFormSubmit = async (values: {
    fullName: string;
    email: string;
    contactNumber: string;
    address: string;
  }) => {
    setSubmitting(true);
    try {
      if (editingCustomer) {
        const res = await customersApi.update(editingCustomer._id, values);
        notify(res.message, 'success');
        if (selectedId === editingCustomer._id) {
          await loadCustomerProfile(editingCustomer._id);
        }
      } else {
        const res = await customersApi.create(values);
        notify(res.message, 'success');
        setSelectedId(res.data._id);
      }
      setFormOpen(false);
      setEditingCustomer(null);
      await fetchCustomers();
    } catch (err) {
      notify(extractApiError(err).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await customersApi.remove(deleteTarget._id, false);
      notify(res.message, 'success');
      if (selectedId === deleteTarget._id) {
        setSelectedId(null);
        setMobileProfileOpen(false);
      }
      setDeleteTarget(null);
      setArchivePrompt(null);
      await fetchCustomers();
    } catch (err) {
      const info = extractApiError(err);
      if (info.status === 409 && info.canArchive) {
        setArchivePrompt(info.message);
      } else {
        notify(info.message, 'error');
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await customersApi.remove(deleteTarget._id, true);
      notify(res.message, 'success');
      if (selectedId === deleteTarget._id) {
        setSelectedId(null);
        setMobileProfileOpen(false);
      }
      setDeleteTarget(null);
      setArchivePrompt(null);
      await fetchCustomers();
    } catch (err) {
      notify(extractApiError(err).message, 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: ColumnDef<Customer>[] = [
    {
      key: 'id',
      header: 'ID',
      render: (c) => (
        <span className="font-mono text-xs text-[var(--color-ink-subtle)]">
          CUS-{formatShortId(c._id)}
        </span>
      ),
    },
    {
      key: 'fullName',
      header: 'Customer',
      render: (c) => (
        <div>
          <p className="font-medium text-[var(--color-ink)]">{c.fullName}</p>
          <p className="text-xs text-[var(--color-ink-subtle)]">{c.email}</p>
        </div>
      ),
    },
    {
      key: 'orders',
      header: 'Orders',
      align: 'right',
      render: (c) => (
        <span className="text-xs tabular-nums text-[var(--color-ink-muted)]">
          {c.orderCount ?? 0}
        </span>
      ),
    },
    {
      key: 'spent',
      header: 'Lifetime Spend',
      align: 'right',
      render: (c) => (
        <span className="font-medium tabular-nums text-[var(--color-forest)]">
          {formatCurrency(c.totalSpent ?? 0)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (c) => (
        <div className="inline-flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEdit(c);
            }}
            aria-label={`Edit ${c.fullName}`}
            className="btn-soft p-2 rounded-lg bg-white text-[var(--color-ink-muted)] hover:text-[var(--color-forest)] hover:bg-[var(--color-cream)]"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setArchivePrompt(null);
              setDeleteTarget(c);
            }}
            aria-label={`Delete ${c.fullName}`}
            className="btn-soft p-2 rounded-lg bg-white text-[var(--color-ink-muted)] hover:text-[#7D332B] hover:bg-[#F5E9E7]"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const renderProfilePanel = () => {
    if (profileLoading) {
      return (
        <div className="p-6 space-y-5">
          <div className="h-6 skeleton-shimmer rounded w-1/2" />
          <div className="h-4 skeleton-shimmer rounded w-2/3" />
          <div className="h-24 skeleton-shimmer rounded w-full" />
        </div>
      );
    }

    if (!profile) {
      return (
        <div className="p-10 text-center space-y-2">
          <h3 className="font-serif text-xl text-[var(--color-forest)]">
            Select a customer
          </h3>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Choose any record from the directory to inspect their lifetime
            purchases and order ledger.
          </p>
        </div>
      );
    }

    const { customer, stats, orderHistory } = profile;

    return (
      <AnimatePresence mode="wait">
      <motion.div
        key={customer._id}
        initial={prefersReduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={prefersReduced ? undefined : { opacity: 0, y: -6 }}
        transition={{ duration: 0.25, ease: EDITORIAL_EASE }}
        className="divide-y divide-[var(--color-border)]"
      >
        {/* Customer Identity */}
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="font-mono text-xs text-[var(--color-ink-subtle)]">
                CUS-{formatShortId(customer._id)} · Registered{' '}
                {formatShortDate(customer.createdAt)}
              </span>
              <h2 className="mt-1 font-serif text-2xl font-medium text-[var(--color-forest)]">
                {customer.fullName}
              </h2>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleOpenEdit(customer)}
                aria-label="Edit customer"
                className="btn-soft p-2 rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-ink-muted)] hover:text-[var(--color-forest)] hover:bg-[var(--color-cream)]"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setArchivePrompt(null);
                  setDeleteTarget(customer);
                }}
                aria-label="Delete customer"
                className="btn-soft p-2 rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-ink-muted)] hover:text-[#7D332B] hover:bg-[#F5E9E7]"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-2 text-xs text-[var(--color-ink-muted)]">
            <div className="flex items-center gap-2.5">
              <Mail className="w-3.5 h-3.5 text-[var(--color-sage)] shrink-0" />
              <span>{customer.email}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone className="w-3.5 h-3.5 text-[var(--color-sage)] shrink-0" />
              <span className="tabular-nums">{customer.contactNumber}</span>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin className="w-3.5 h-3.5 text-[var(--color-sage)] shrink-0 mt-0.5" />
              <span>{customer.address}</span>
            </div>
          </div>
        </div>

        {/* Calculated Purchase Metrics */}
        <div className="grid grid-cols-3 divide-x divide-[var(--color-border)] bg-[var(--color-surface-cream)]/60">
          <div className="p-4">
            <span className="block text-[11px] text-[var(--color-ink-subtle)]">
              Total Orders
            </span>
            <span className="mt-1 block text-lg font-semibold tabular-nums text-[var(--color-forest)]">
              <CountUpValue value={stats.totalOrders} />
            </span>
          </div>
          <div className="p-4">
            <span className="block text-[11px] text-[var(--color-ink-subtle)]">
              Total Spent
            </span>
            <span className="mt-1 block text-lg font-semibold tabular-nums text-[var(--color-forest)]">
              <CountUpValue
                value={stats.totalPurchaseAmount}
                formatter={(n) => formatCurrency(n)}
              />
            </span>
          </div>
          <div className="p-4">
            <span className="block text-[11px] text-[var(--color-ink-subtle)]">
              Most Recent
            </span>
            <span className="mt-1 block text-xs font-medium tabular-nums text-[var(--color-ink)]">
              {stats.mostRecentPurchase
                ? formatShortDate(stats.mostRecentPurchase.orderDate)
                : 'No orders'}
            </span>
          </div>
        </div>

        {/* Order History */}
        <div className="p-6 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-subtle)]">
            Order History ({orderHistory.length})
          </h3>

          {orderHistory.length === 0 ? (
            <p className="text-xs text-[var(--color-ink-muted)] py-4">
              This client has not placed any orders yet.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)] border border-[var(--color-border)] rounded-xl bg-[var(--color-surface-cream)]/40">
              {orderHistory.map((ord, idx) => (
                <motion.li
                  key={ord._id}
                  initial={prefersReduced ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: Math.min(idx * 0.04, 0.2),
                    ease: EDITORIAL_EASE,
                  }}
                  className="px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium text-[var(--color-forest)]">
                        {ord.orderNumber}
                      </span>
                      <StatusBadge status={ord.status} />
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-ink-subtle)] truncate">
                      {formatShortDate(ord.orderDate)} ·{' '}
                      {ord.orderItems.map((i) => `${i.quantity}× ${i.productName}`).join(', ')}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-[var(--color-ink)] shrink-0">
                    {formatCurrency(ord.totalAmount)}
                  </span>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <MainLayout
      pageTitle="Customer Directory"
      breadcrumb="Customers"
      metaInfo={`${totalActive} registered clients`}
    >
      <div className="space-y-8">
        {/* Editorial Page Header */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[var(--color-border-strong)]">
          <div className="space-y-2 max-w-2xl">
            <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight text-[var(--color-forest)]">
              Customers
            </h1>
            <p className="text-sm sm:text-base text-[var(--color-ink-muted)] leading-relaxed">
              Maintain client contact records and inspect real-time lifetime
              spend calculated directly from historical orders.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="btn-forest btn-shimmer inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-[#1E3B2F] text-[#F5F0E6] hover:bg-[#152B22] self-start md:self-auto whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </section>

        {/* Search Bar */}
        <section className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[var(--color-ink-subtle)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers by name or email..."
              aria-label="Search customers"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-white)] text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[#1E3B2F]/25 focus:border-[#1E3B2F]"
            />
          </div>
          <span className="hidden sm:inline text-xs text-[var(--color-ink-subtle)] tabular-nums">
            {total} matching records
          </span>
        </section>

        {/* Asymmetric Master-Detail Workspace */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <RevealBlock delay={0.05} className="lg:col-span-7 space-y-4">
            <DataTable
              columns={columns}
              data={customers}
              rowKey={(c) => c._id}
              loading={loading}
              onRowClick={handleSelectCustomer}
              selectedRowKey={selectedId}
              emptyTitle="No customers found"
              emptyDescription="Adjust your search query or register your first customer profile."
              emptyAction={
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="btn-forest btn-shimmer inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[#1E3B2F] text-[#F5F0E6]"
                >
                  <Plus className="w-4 h-4" />
                  Add Customer
                </button>
              }
            />

            {totalPages > 1 ? (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-[var(--color-ink-subtle)] tabular-nums">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="btn-soft inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-white)] text-xs font-medium disabled:opacity-40"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="btn-soft inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-white)] text-xs font-medium disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : null}
          </RevealBlock>

          {/* Desktop Customer Dossier */}
          <RevealBlock delay={0.1} className="hidden lg:block lg:col-span-5 sticky top-6">
          <aside className="card-elevate rounded-2xl bg-[var(--color-surface-white)] border border-[var(--color-border)] overflow-hidden">
            {renderProfilePanel()}
          </aside>
          </RevealBlock>
        </section>
      </div>

      {/* Mobile Profile Modal */}
      <Modal
        open={mobileProfileOpen}
        onClose={() => setMobileProfileOpen(false)}
        title="Customer Profile"
        maxWidth="lg"
      >
        <div className="-m-6">{renderProfilePanel()}</div>
      </Modal>

      {/* Add / Edit Customer Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingCustomer ? 'Edit Customer' : 'Register Customer'}
        subtitle="Email addresses must remain unique across customer profiles."
        maxWidth="lg"
      >
        <CustomerForm
          initialData={editingCustomer}
          onSubmit={handleFormSubmit}
          onCancel={() => setFormOpen(false)}
          submitting={submitting}
        />
      </Modal>

      {/* Delete / Archive Customer Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          setDeleteTarget(null);
          setArchivePrompt(null);
        }}
        onConfirm={handleDeleteConfirm}
        onArchiveInstead={handleArchiveConfirm}
        title={archivePrompt ? 'Archive Customer?' : 'Delete Customer?'}
        description={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.fullName}" from the customer directory?`
            : ''
        }
        archivePrompt={archivePrompt}
        loading={deleteLoading}
      />
    </MainLayout>
  );
};
