import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { Product } from '../types';
import { extractApiError, uploadApi } from '../services/api';
import { ProductImage } from './ProductImage';

interface ProductFormProps {
  initialData?: Product | null;
  categories: string[];
  onSubmit: (values: {
    productName: string;
    description: string;
    category: string;
    price: number;
    stockQuantity: number;
    image: string;
  }) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

const DEFAULT_CATEGORIES = [
  'Ceramics',
  'Textiles',
  'Apothecary',
  'Woodcraft',
  'Tableware',
  'Botanicals',
];

export const ProductForm: React.FC<ProductFormProps> = ({
  initialData,
  categories,
  onSubmit,
  onCancel,
  submitting = false,
}) => {
  const mergedCategories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...categories])
  ).sort();

  const [productName, setProductName] = useState(initialData?.productName || '');
  const [category, setCategory] = useState(
    initialData?.category || mergedCategories[0]
  );
  const [customCategory, setCustomCategory] = useState('');
  const [price, setPrice] = useState(
    initialData ? String(initialData.price) : ''
  );
  const [stockQuantity, setStockQuantity] = useState(
    initialData ? String(initialData.stockQuantity) : '10'
  );
  const [description, setDescription] = useState(initialData?.description || '');
  const [image, setImage] = useState(initialData?.image || '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const uploaded = await uploadApi.uploadImage(file);
      setImage(uploaded.url);
    } catch (err) {
      setError(extractApiError(err).message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalCategory =
      category === '__custom__' ? customCategory.trim() : category.trim();
    const numPrice = Number(price);
    const numStock = Number(stockQuantity);

    if (productName.trim().length < 2) {
      setError('Product name must be at least 2 characters.');
      return;
    }
    if (!finalCategory) {
      setError('Please select or enter a category.');
      return;
    }
    if (Number.isNaN(numPrice) || numPrice <= 0) {
      setError('Price must be greater than ₱0.00.');
      return;
    }
    if (
      Number.isNaN(numStock) ||
      !Number.isInteger(numStock) ||
      numStock < 0
    ) {
      setError('Stock quantity must be a whole number of 0 or greater.');
      return;
    }
    if (description.trim().length < 4) {
      setError('Please enter a concise product description.');
      return;
    }

    await onSubmit({
      productName: productName.trim(),
      category: finalCategory,
      price: Number(numPrice.toFixed(2)),
      stockQuantity: numStock,
      description: description.trim(),
      image: image.trim(),
    });
  };

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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-start">
        {/* Image Upload Preview */}
        <div className="space-y-2.5">
          <div className="aspect-[4/3] w-full rounded-xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-cream)]">
            <ProductImage
              src={image}
              alt={productName || 'Product preview'}
              className="w-full h-full"
            />
          </div>
          <label className="btn-soft flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-white)] text-xs font-medium text-[var(--color-forest)] hover:bg-[var(--color-cream)] cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>{uploading ? 'Uploading...' : 'Upload Photo'}</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading || submitting}
              className="sr-only"
            />
          </label>
        </div>

        {/* Core Product Details */}
        <div className="sm:col-span-2 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-ink-muted)] mb-1.5">
              Product Name
            </label>
            <input
              type="text"
              required
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g., Hand-Thrown Stoneware Carafe"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-white)] text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[#1E3B2F]/30 focus:border-[#1E3B2F]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-ink-muted)] mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-white)] text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[#1E3B2F]/30 focus:border-[#1E3B2F]"
              >
                {mergedCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="__custom__">+ Custom category</option>
              </select>
            </div>

            {category === '__custom__' ? (
              <div>
                <label className="block text-xs font-medium text-[var(--color-ink-muted)] mb-1.5">
                  New Category Name
                </label>
                <input
                  type="text"
                  required
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="e.g., Lighting"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-white)] text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[#1E3B2F]/30 focus:border-[#1E3B2F]"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-[var(--color-ink-muted)] mb-1.5">
                  Image URL (optional)
                </label>
                <input
                  type="text"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="/uploads/... or URL"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-white)] text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[#1E3B2F]/30 focus:border-[#1E3B2F]"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-ink-muted)] mb-1.5">
                Unit Price (PHP)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-white)] text-sm tabular-nums text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[#1E3B2F]/30 focus:border-[#1E3B2F]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-ink-muted)] mb-1.5">
                Available Stock
              </label>
              <input
                type="number"
                step="1"
                min="0"
                required
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-white)] text-sm tabular-nums text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[#1E3B2F]/30 focus:border-[#1E3B2F]"
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--color-ink-muted)] mb-1.5">
          Editorial Description
        </label>
        <textarea
          rows={3}
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Material provenance, craft finish, and sizing notes..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-white)] text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[#1E3B2F]/30 focus:border-[#1E3B2F]"
        />
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
          disabled={submitting || uploading}
          className="btn-forest btn-shimmer px-5 py-2.5 rounded-xl text-sm font-medium bg-[#1E3B2F] text-[#F5F0E6] hover:bg-[#152B22] disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          {submitting
            ? 'Saving...'
            : initialData
              ? 'Save Changes'
              : 'Add Product'}
        </button>
      </div>
    </form>
  );
};
