import React, { useState } from 'react';
import { Customer } from '../types';

interface CustomerFormProps {
  initialData?: Customer | null;
  onSubmit: (values: {
    fullName: string;
    email: string;
    contactNumber: string;
    address: string;
  }) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  submitting = false,
}) => {
  const [fullName, setFullName] = useState(initialData?.fullName || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [contactNumber, setContactNumber] = useState(
    initialData?.contactNumber || ''
  );
  const [address, setAddress] = useState(initialData?.address || '');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (fullName.trim().length < 2) {
      setError('Full name must be at least 2 characters.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (contactNumber.trim().length < 5) {
      setError('Contact number must be at least 5 characters.');
      return;
    }
    if (address.trim().length < 5) {
      setError('Please enter a complete street address.');
      return;
    }

    await onSubmit({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      contactNumber: contactNumber.trim(),
      address: address.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <div
          role="alert"
          className="px-4 py-3 rounded-xl bg-[#FDF8F7] border border-[#D9B6B1] text-xs font-medium text-[#7D332B] animate-shake-error"
        >
          {error}
        </div>
      ) : null}

      <div>
        <label className="block text-xs font-medium text-[var(--color-ink-muted)] mb-1.5">
          Full Name
        </label>
        <input
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g., Sofia Alvarez"
          className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-white)] text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[#1E3B2F]/30 focus:border-[#1E3B2F]"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[var(--color-ink-muted)] mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="sofia@atelier.example"
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-white)] text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[#1E3B2F]/30 focus:border-[#1E3B2F]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--color-ink-muted)] mb-1.5">
            Contact Number
          </label>
          <input
            type="text"
            required
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
            placeholder="+1 (415) 555-0192"
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-white)] text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[#1E3B2F]/30 focus:border-[#1E3B2F]"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--color-ink-muted)] mb-1.5">
          Complete Address
        </label>
        <textarea
          rows={3}
          required
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Street address, suite, city, state, postal code"
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
          disabled={submitting}
          className="btn-forest btn-shimmer px-5 py-2.5 rounded-xl text-sm font-medium bg-[#1E3B2F] text-[#F5F0E6] hover:bg-[#152B22] disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          {submitting
            ? 'Saving...'
            : initialData
              ? 'Save Changes'
              : 'Register Customer'}
        </button>
      </div>
    </form>
  );
};
