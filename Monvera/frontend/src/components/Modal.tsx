import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { EDITORIAL_EASE } from './MotionPrimitives';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidth?: 'md' | 'lg' | 'xl' | '2xl';
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  maxWidth = 'lg',
  children,
}) => {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const widthClass =
    maxWidth === 'md'
      ? 'max-w-md'
      : maxWidth === 'xl'
        ? 'max-w-2xl'
        : maxWidth === '2xl'
          ? 'max-w-3xl'
          : 'max-w-lg';

  return (
    <AnimatePresence>
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: EDITORIAL_EASE }}
            onClick={onClose}
            className="fixed inset-0 bg-[#18251E]/40 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.26, ease: EDITORIAL_EASE }}
            className={`relative z-10 w-full ${widthClass} max-h-[90vh] flex flex-col rounded-2xl bg-[var(--color-surface-cream)] border border-[var(--color-border-strong)] shadow-[0_24px_60px_rgba(30,59,47,0.24)] overflow-hidden`}
          >
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[var(--color-border)] bg-[var(--color-surface-white)]">
              <div>
                <h2
                  id="modal-title"
                  className="font-serif text-xl sm:text-2xl font-medium text-[var(--color-forest)]"
                >
                  {title}
                </h2>
                {subtitle ? (
                  <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                    {subtitle}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="btn-soft p-2 rounded-xl bg-[var(--color-surface-cream)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-cream)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
};
