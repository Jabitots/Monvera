import React from 'react';
import { AlertTriangle, Archive } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onArchiveInstead?: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  archivePrompt?: string | null;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  onArchiveInstead,
  title,
  description,
  confirmLabel = 'Confirm Delete',
  loading = false,
  archivePrompt,
}) => {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="md">
      <div className="space-y-5">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-[#F5E9E7] text-[#7D332B] shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <p className="text-sm leading-relaxed text-[var(--color-ink-muted)]">
            {archivePrompt || description}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn-soft px-4 py-2 rounded-xl bg-white text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-cream)] whitespace-nowrap shrink-0"
          >
            Cancel
          </button>

          {archivePrompt && onArchiveInstead ? (
            <button
              type="button"
              onClick={onArchiveInstead}
              disabled={loading}
              className="btn-forest btn-shimmer inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[#1E3B2F] text-[#F5F0E6] hover:bg-[#152B22] disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Archive className="w-4 h-4" />
              {loading ? 'Archiving...' : 'Archive Record'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="btn-soft px-4 py-2 rounded-xl text-sm font-medium bg-[#7D332B] text-white hover:bg-[#642821] disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {loading ? 'Processing...' : confirmLabel}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
