import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Customer, Order, OrderStatus, Product } from '../types';
import { formatCurrency } from '../utils/formatters';

interface OrderFormProps {
  initialData?: Order | null;
  customers: Customer[];
  products: Product[];
  onSubmit: (values: {
    customerId: string;
    orderItems: Array<{ productId: string; quantity: number }>;
    status: OrderStatus;
    notes?: string;
  }) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

interface DraftLine {
  productId: string;
  quantity: number;
}

const ORDER_STATUSES: OrderStatus[] = [
  'Pending',
  'Processing',
  'Completed',
  'Cancelled',
];

export const OrderForm: React.FC<OrderFormProps> = ({
  initialData,
  customers,
  products,
  onSubmit,
  onCancel,
  submitting = false,
}) => {
  const initialCustomerId =
    initialData && typeof initialData.customerId === 'object' && initialData.customerId
      ? initialData.customerId._id
      : typeof initialData?.customerId === 'string'
        ? initialData.customerId
        : customers[0]?._id || '';

  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [status, setStatus] = useState<OrderStatus>(
    initialData?.status || 'Pending'
  );
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [lines, setLines] = useState<DraftLine[]>(() => {
    if (initialData && initialData.orderItems.length > 0) {
      return initialData.orderItems.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      }));
    }
    const firstAvailable = products.find((p) => p.stockQuantity > 0) || products[0];
    return firstAvailable ? [{ productId: firstAvailable._id, quantity: 1 }] : [];
  });
  const [error, setError] = useState<string | null>(null);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p._id, p])),
    [products]
  );

  // Track quantities already held by this order if editing an active (stockDeducted) order
  const originalHeldQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    if (initialData && initialData.stockDeducted) {
      for (const item of initialData.orderItems) {
        map.set(item.productId, item.quantity);
      }
    }
    return map;
  }, [initialData]);

  // Preserve historical snapshot unit price for existing line items
  const originalSnapshotMap = useMemo(() => {
    const map = new Map<string, { productName: string; unitPrice: number }>();
    if (initialData) {
      for (const item of initialData.orderItems) {
        map.set(item.productId, {
          productName: item.productName,
          unitPrice: item.unitPrice,
        });
      }
    }
    return map;
  }, [initialData]);

  const getMaxAvailableForProduct = (productId: string): number => {
    const prod = productMap.get(productId);
    const held = originalHeldQtyMap.get(productId) || 0;
    return (prod?.stockQuantity || 0) + held;
  };

  const getLineUnitPrice = (productId: string): number => {
    const snap = originalSnapshotMap.get(productId);
    if (snap) return snap.unitPrice;
    return productMap.get(productId)?.price || 0;
  };

  const orderTotal = useMemo(() => {
    return lines.reduce((sum, line) => {
      const price = getLineUnitPrice(line.productId);
      return sum + price * (Number(line.quantity) || 0);
    }, 0);
  }, [lines, productMap, originalSnapshotMap]);

  const handleAddLine = () => {
    const unused = products.find(
      (p) =>
        !lines.some((l) => l.productId === p._id) &&
        getMaxAvailableForProduct(p._id) > 0
    );
    const fallback = unused || products[0];
    if (!fallback) return;
    setLines((prev) => [...prev, { productId: fallback._id, quantity: 1 }]);
  };

  const handleRemoveLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleLineChange = (
    idx: number,
    patch: Partial<{ productId: string; quantity: number }>
  ) => {
    setLines((prev) =>
      prev.map((line, i) => (i === idx ? { ...line, ...patch } : line))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerId) {
      setError('Please select a customer.');
      return;
    }
    if (lines.length === 0) {
      setError('Please add at least one product to the order.');
      return;
    }

    // Aggregate quantities across duplicate lines for stock validation
    const qtyByProduct = new Map<string, number>();
    for (const line of lines) {
      if (!line.productId) {
        setError('Every line item must have a product selected.');
        return;
      }
      if (!Number.isInteger(line.quantity) || line.quantity < 1) {
        setError('Each product quantity must be a whole number of at least 1.');
        return;
      }
      qtyByProduct.set(
        line.productId,
        (qtyByProduct.get(line.productId) || 0) + line.quantity
      );
    }

    if (status !== 'Cancelled') {
      for (const [pid, totalQty] of qtyByProduct.entries()) {
        const maxAvail = getMaxAvailableForProduct(pid);
        const name =
          productMap.get(pid)?.productName ||
          originalSnapshotMap.get(pid)?.productName ||
          'Product';
        if (totalQty > maxAvail) {
          setError(
            `Requested quantity (${totalQty}) for "${name}" exceeds available stock (${maxAvail}).`
          );
          return;
        }
      }
    }

    await onSubmit({
      customerId,
      orderItems: lines,
      status,
      notes: notes.trim(),
    });
  };

  if (customers.length === 0 || products.length === 0) {
    return (
      <div className="py-6 text-center space-y-3">
        <p className="text-sm text-[var(--color-ink-muted)]">
          {customers.length === 0
            ? 'Register at least one customer before creating an order.'
            : 'Add at least one product to your catalog before creating an order.'}
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="btn-forest btn-shimmer px-4 py-2 rounded-xl text-sm font-medium bg-[#1E3B2F] text-[#F5F0E6]"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? (
        <div
          role="alert"
          className="px-4 py-3 rounded-xl bg-[#FDF8F7] border border-[#D9B6B1] text-xs font-medium text-[#7D332B] animate-shake-error"
        >
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[var(--color-ink-muted)] mb-1.5">
            Customer
          </label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-white)] text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[#1E3B2F]/30 focus:border-[#1E3B2F]"
          >
            {customers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.fullName} — {c.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--color-ink-muted)] mb-1.5">
            Order Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-white)] text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[#1E3B2F]/30 focus:border-[#1E3B2F]"
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Order Line Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-subtle)]">
            Order Items
          </span>
          <button
            type="button"
            onClick={handleAddLine}
            className="btn-soft inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-sage-soft)] text-[var(--color-forest)] hover:bg-[#DFE6D7] whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Product
          </button>
        </div>

        <div className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-white)]">
          {lines.map((line, idx) => {
            const unitPrice = getLineUnitPrice(line.productId);
            const maxAvail = getMaxAvailableForProduct(line.productId);
            const subtotal = unitPrice * (Number(line.quantity) || 0);

            return (
              <div
                key={`${idx}-${line.productId}`}
                className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3.5 items-center"
              >
                <div className="sm:col-span-6">
                  <select
                    value={line.productId}
                    onChange={(e) =>
                      handleLineChange(idx, { productId: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-cream)] text-sm text-[var(--color-ink)] focus:outline-none focus:border-[#1E3B2F]"
                  >
                    {products.map((p) => {
                      const avail = getMaxAvailableForProduct(p._id);
                      return (
                        <option key={p._id} value={p._id}>
                          {p.productName} ({formatCurrency(p.price)} · {avail} in
                          stock)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="sm:col-span-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={status === 'Cancelled' ? undefined : Math.max(1, maxAvail)}
                    step={1}
                    value={line.quantity}
                    onChange={(e) =>
                      handleLineChange(idx, {
                        quantity: Math.max(1, parseInt(e.target.value || '1', 10)),
                      })
                    }
                    aria-label="Quantity"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-cream)] text-sm tabular-nums text-[var(--color-ink)] focus:outline-none focus:border-[#1E3B2F]"
                  />
                </div>

                <div className="sm:col-span-3 text-right">
                  <p className="text-sm font-semibold tabular-nums text-[var(--color-ink)]">
                    {formatCurrency(subtotal)}
                  </p>
                  <p className="text-[11px] tabular-nums text-[var(--color-ink-subtle)]">
                    {formatCurrency(unitPrice)} each
                  </p>
                </div>

                <div className="sm:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRemoveLine(idx)}
                    disabled={lines.length === 1}
                    aria-label="Remove item"
                    className="btn-soft p-1.5 rounded-lg bg-white text-[var(--color-ink-subtle)] hover:text-[#7D332B] hover:bg-[#F5E9E7] disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--color-ink-muted)] mb-1.5">
          Order Notes (optional)
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Packaging instructions, delivery timing..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-white)] text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[#1E3B2F]/30 focus:border-[#1E3B2F]"
        />
      </div>

      {/* Live Order Total Summary */}
      <div className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-[var(--color-cream)] border border-[var(--color-border)]">
        <div>
          <p className="text-xs font-medium text-[var(--color-ink-muted)]">
            Calculated Order Total
          </p>
          <p className="text-[11px] text-[var(--color-ink-subtle)]">
            {status === 'Cancelled'
              ? 'Cancelled orders do not reserve inventory.'
              : 'Inventory will be adjusted automatically on save.'}
          </p>
        </div>
        <span className="font-serif text-2xl font-semibold tabular-nums text-[var(--color-forest)]">
          {formatCurrency(orderTotal)}
        </span>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="btn-soft px-4 py-2 rounded-xl bg-white text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-cream)] whitespace-nowrap shrink-0"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="btn-forest btn-shimmer px-5 py-2.5 rounded-xl text-sm font-medium bg-[#1E3B2F] text-[#F5F0E6] hover:bg-[#152B22] disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          {submitting
            ? 'Saving...'
            : initialData
              ? 'Update Order'
              : 'Create Order'}
        </button>
      </div>
    </form>
  );
};
