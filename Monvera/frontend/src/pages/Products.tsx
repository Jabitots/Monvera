import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { DataTable, ColumnDef } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ProductForm } from '../components/ProductForm';
import { ProductImage } from '../components/ProductImage';
import { extractApiError, productsApi } from '../services/api';
import { Product } from '../types';
import {
  formatCurrency,
  formatShortDate,
  formatShortId,
} from '../utils/formatters';
import { useDebounce } from '../hooks/useDebounce';
import { useToast } from '../hooks/useToast';
import { EDITORIAL_EASE, RevealBlock } from '../components/MotionPrimitives';

export const Products: React.FC = () => {
  const { notify } = useToast();
  const prefersReduced = useReducedMotion();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [totalActive, setTotalActive] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [viewMode, setViewMode] = useState<'catalog' | 'table'>('catalog');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 250);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [archivePrompt, setArchivePrompt] = useState<string | null>(null);

  const limit = viewMode === 'catalog' ? 9 : 10;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productsApi.list({
        search: debouncedSearch,
        category: selectedCategory,
        sort: sortBy,
        page,
        limit,
      });
      setProducts(res.items);
      setCategories(res.categories);
      setTotal(res.total);
      setTotalActive(res.totalActive);
      setLowStockCount(res.lowStockCount);
      setTotalPages(res.totalPages);
    } catch (err) {
      notify(extractApiError(err).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedCategory, sortBy, page, limit, notify]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedCategory, sortBy, viewMode]);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setFormOpen(true);
  };

  const handleFormSubmit = async (values: {
    productName: string;
    description: string;
    category: string;
    price: number;
    stockQuantity: number;
    image: string;
  }) => {
    setSubmitting(true);
    try {
      if (editingProduct) {
        await productsApi.update(editingProduct._id, values);
        notify(`"${values.productName}" updated.`, 'success');
      } else {
        await productsApi.create(values);
        notify(`"${values.productName}" added to catalog.`, 'success');
      }
      setFormOpen(false);
      setEditingProduct(null);
      await fetchProducts();
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
      const res = await productsApi.remove(deleteTarget._id, false);
      notify(res.message, 'success');
      setDeleteTarget(null);
      setArchivePrompt(null);
      await fetchProducts();
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
      const res = await productsApi.remove(deleteTarget._id, true);
      notify(res.message, 'success');
      setDeleteTarget(null);
      setArchivePrompt(null);
      await fetchProducts();
    } catch (err) {
      notify(extractApiError(err).message, 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const tableColumns: ColumnDef<Product>[] = [
    {
      key: 'id',
      header: 'Product ID',
      render: (p) => (
        <span className="font-mono text-xs text-[var(--color-ink-subtle)]">
          PRD-{formatShortId(p._id)}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Product',
      render: (p) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden border border-[var(--color-border)] shrink-0">
            <ProductImage
              src={p.image}
              alt={p.productName}
              className="w-full h-full"
            />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-[var(--color-ink)] truncate">
              {p.productName}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (p) => (
        <span className="text-sm text-[var(--color-ink-muted)]">
          {p.category}
        </span>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      align: 'right',
      render: (p) => (
        <span className="font-medium tabular-nums text-[var(--color-ink)]">
          {formatCurrency(p.price)}
        </span>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      align: 'right',
      render: (p) => {
        const isOut = p.stockQuantity === 0;
        const isLow = p.stockQuantity > 0 && p.stockQuantity <= 5;
        return (
          <span
            className={`text-xs font-medium tabular-nums ${
              isOut
                ? 'text-[#7D332B]'
                : isLow
                  ? 'text-[#725522]'
                  : 'text-[var(--color-forest)]'
            }`}
          >
            {p.stockQuantity} units
            {isOut ? ' (Out of stock)' : isLow ? ' (Low stock)' : ''}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Date Added',
      render: (p) => (
        <span className="text-xs tabular-nums text-[var(--color-ink-muted)] whitespace-nowrap">
          {formatShortDate(p.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (p) => (
        <div className="inline-flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEdit(p);
            }}
            aria-label={`Edit ${p.productName}`}
            className="btn-soft p-2 rounded-lg bg-white text-[var(--color-ink-muted)] hover:text-[var(--color-forest)] hover:bg-[var(--color-cream)]"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setArchivePrompt(null);
              setDeleteTarget(p);
            }}
            aria-label={`Delete ${p.productName}`}
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
      pageTitle="Product Catalog"
      breadcrumb="Products"
      metaInfo={`${totalActive} active items · ${lowStockCount} low stock`}
    >
      <div className="space-y-8">
        {/* Editorial Page Header */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[var(--color-border-strong)]">
          <div className="space-y-2 max-w-2xl">
            <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight text-[var(--color-forest)]">
              Products
            </h1>
            <p className="text-sm sm:text-base text-[var(--color-ink-muted)] leading-relaxed">
              Curate your studio inventory, manage seasonal pricing, and monitor
              low-stock thresholds across every collection.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-[var(--color-ink-subtle)] tabular-nums">
              <span>{totalActive} catalog items</span>
              <span aria-hidden="true">·</span>
              <span
                className={
                  lowStockCount > 0 ? 'text-[#725522] font-medium' : ''
                }
              >
                {lowStockCount} low stock alerts
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="btn-forest btn-shimmer inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-[#1E3B2F] text-[#F5F0E6] hover:bg-[#152B22] self-start md:self-auto whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </section>

        {/* Search, Category Filter, Sort & Display Mode Toolbar */}
        <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-[var(--color-ink-subtle)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products by name..."
                aria-label="Search products"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-white)] text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[#1E3B2F]/25 focus:border-[#1E3B2F]"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter by category"
              className="px-3.5 py-2.5 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-white)] text-sm text-[var(--color-ink)] focus:outline-none focus:border-[#1E3B2F]"
            >
              <option value="All">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort products"
              className="px-3.5 py-2.5 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-white)] text-sm text-[var(--color-ink)] focus:outline-none focus:border-[#1E3B2F]"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
            </select>
          </div>

          {/* View Mode Toggle: Visual Catalog vs Table with Sliding Indicator */}
          <div
            role="group"
            aria-label="Product display mode"
            className="inline-flex items-center gap-1 p-1 rounded-xl bg-[var(--color-surface-white)] border border-[var(--color-border-strong)] self-start lg:self-auto"
          >
            <button
              type="button"
              onClick={() => setViewMode('catalog')}
              aria-pressed={viewMode === 'catalog'}
              className={`btn-soft relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 ${
                viewMode === 'catalog'
                  ? 'text-[#F5F0E6]'
                  : 'text-[var(--color-ink-muted)] bg-transparent shadow-none hover:text-[var(--color-ink)]'
              }`}
            >
              {viewMode === 'catalog' ? (
                <motion.span
                  layoutId="products-view-pill"
                  transition={{ duration: 0.28, ease: EDITORIAL_EASE }}
                  aria-hidden="true"
                  className="absolute inset-0 rounded-lg bg-[#1E3B2F] shadow-[0_3px_10px_rgba(30,59,47,0.22)]"
                />
              ) : null}
              <LayoutGrid className="relative z-10 w-3.5 h-3.5" />
              <span className="relative z-10">Catalog</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-pressed={viewMode === 'table'}
              className={`btn-soft relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 ${
                viewMode === 'table'
                  ? 'text-[#F5F0E6]'
                  : 'text-[var(--color-ink-muted)] bg-transparent shadow-none hover:text-[var(--color-ink)]'
              }`}
            >
              {viewMode === 'table' ? (
                <motion.span
                  layoutId="products-view-pill"
                  transition={{ duration: 0.28, ease: EDITORIAL_EASE }}
                  aria-hidden="true"
                  className="absolute inset-0 rounded-lg bg-[#1E3B2F] shadow-[0_3px_10px_rgba(30,59,47,0.22)]"
                />
              ) : null}
              <List className="relative z-10 w-3.5 h-3.5" />
              <span className="relative z-10">Table</span>
            </button>
          </div>
        </section>

        {/* Cross-fade between Visual Catalog and Editorial Table */}
        <AnimatePresence mode="wait">
        {viewMode === 'catalog' ? (
          <motion.div
            key="catalog-view"
            initial={prefersReduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReduced ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.24, ease: EDITORIAL_EASE }}
          >
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-7">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl bg-[var(--color-surface-white)] border border-[var(--color-border)] overflow-hidden"
                >
                  <div className="aspect-[4/3] skeleton-shimmer" />
                  <div className="p-5 space-y-3">
                    <div className="h-3 skeleton-shimmer rounded w-1/3" />
                    <div className="h-5 skeleton-shimmer rounded w-2/3" />
                    <div className="h-4 skeleton-shimmer rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-[var(--color-surface-white)] border border-[var(--color-border)] rounded-2xl px-8 py-16 text-center space-y-3">
              <h3 className="font-serif text-2xl text-[var(--color-forest)]">
                No products match your view
              </h3>
              <p className="text-sm text-[var(--color-ink-muted)] max-w-md mx-auto">
                {search || selectedCategory !== 'All'
                  ? 'Try clearing your search term or selecting another category.'
                  : 'Begin building your catalog by adding your first product.'}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="btn-forest btn-shimmer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#1E3B2F] text-[#F5F0E6]"
                >
                  <Plus className="w-4 h-4" />
                  Add Product
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-7">
              {products.map((product, idx) => {
                const isOut = product.stockQuantity === 0;
                const isLow =
                  product.stockQuantity > 0 && product.stockQuantity <= 5;
                return (
                  <RevealBlock
                    key={product._id}
                    delay={Math.min(idx * 0.045, 0.25)}
                    className="flex"
                  >
                  <article
                    className="card-elevate group w-full flex flex-col justify-between rounded-2xl bg-[var(--color-surface-white)] border border-[var(--color-border)] overflow-hidden hover:border-[var(--color-border-strong)]"
                  >
                    <div>
                      <div className="aspect-[4/3] w-full overflow-hidden bg-[#ECE6D9] border-b border-[var(--color-border)]">
                        <ProductImage
                          src={product.image}
                          alt={product.productName}
                          className="w-full h-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
                        />
                      </div>

                      <div className="p-6 space-y-3">
                        {/* Unboxed Editorial Metadata */}
                        <div className="flex items-center justify-between gap-2 text-xs text-[var(--color-ink-subtle)]">
                          <span>
                            {product.category}{' '}
                            <span aria-hidden="true">·</span>{' '}
                            <span className="font-mono">
                              PRD-{formatShortId(product._id)}
                            </span>
                          </span>
                          <span
                            className={`font-medium tabular-nums ${
                              isOut
                                ? 'text-[#7D332B]'
                                : isLow
                                  ? 'text-[#725522]'
                                  : 'text-[var(--color-sage)]'
                            }`}
                          >
                            {isOut
                              ? 'Out of stock'
                              : isLow
                                ? `Low stock · ${product.stockQuantity} left`
                                : `${product.stockQuantity} in stock`}
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between gap-4">
                          <h2 className="font-serif text-xl font-medium text-[var(--color-forest)] leading-snug">
                            {product.productName}
                          </h2>
                          <span className="text-base font-semibold tabular-nums text-[var(--color-ink)] shrink-0">
                            {formatCurrency(product.price)}
                          </span>
                        </div>

                        <p className="text-sm text-[var(--color-ink-muted)] line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>
                      </div>
                    </div>

                    <div className="px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface-cream)]/50 flex items-center justify-between">
                      <span className="text-xs text-[var(--color-ink-subtle)] tabular-nums">
                        Added {formatShortDate(product.createdAt)}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(product)}
                          className="btn-soft inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-xs font-medium text-[var(--color-forest)] hover:bg-[var(--color-cream)]"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setArchivePrompt(null);
                            setDeleteTarget(product);
                          }}
                          className="btn-soft inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-xs font-medium text-[#7D332B] hover:bg-[#F5E9E7]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                  </RevealBlock>
                );
              })}
            </div>
          )}
          </motion.div>
        ) : (
          /* Display Mode B: Editorial Table View */
          <motion.div
            key="table-view"
            initial={prefersReduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReduced ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.24, ease: EDITORIAL_EASE }}
          >
            <DataTable
              columns={tableColumns}
              data={products}
              rowKey={(p) => p._id}
              loading={loading}
              emptyTitle="No products found"
              emptyDescription="Adjust your search or category filter, or add a new item to your catalog."
              emptyAction={
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="btn-forest btn-shimmer inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[#1E3B2F] text-[#F5F0E6]"
                >
                  <Plus className="w-4 h-4" />
                  Add Product
                </button>
              }
            />
          </motion.div>
        )}
        </AnimatePresence>

        {/* Pagination */}
        {totalPages > 1 ? (
          <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-ink-subtle)] tabular-nums">
              Showing page {page} of {totalPages} ({total} total items)
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

      {/* Add / Edit Product Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add Product'}
        subtitle={
          editingProduct
            ? `Updating PRD-${formatShortId(editingProduct._id)}`
            : 'Add a new piece to your active studio catalog.'
        }
        maxWidth="xl"
      >
        <ProductForm
          initialData={editingProduct}
          categories={categories}
          onSubmit={handleFormSubmit}
          onCancel={() => setFormOpen(false)}
          submitting={submitting}
        />
      </Modal>

      {/* Delete / Archive Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          setDeleteTarget(null);
          setArchivePrompt(null);
        }}
        onConfirm={handleDeleteConfirm}
        onArchiveInstead={handleArchiveConfirm}
        title={archivePrompt ? 'Archive Product?' : 'Delete Product?'}
        description={
          deleteTarget
            ? `Are you sure you want to permanently remove "${deleteTarget.productName}" from your catalog? This action cannot be undone.`
            : ''
        }
        archivePrompt={archivePrompt}
        loading={deleteLoading}
      />
    </MainLayout>
  );
};
