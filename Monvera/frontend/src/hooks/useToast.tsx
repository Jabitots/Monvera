import React, { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { EDITORIAL_EASE } from '../components/MotionPrimitives';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  notify: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, type, message }]);
      window.setTimeout(() => {
        dismiss(id);
      }, 4500);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div
        aria-live="polite"
        className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100%-2.5rem)] pointer-events-none"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const icon =
              toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-[#1E3B2F] shrink-0" />
              ) : toast.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-[#7D332B] shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-[#4D5B52] shrink-0" />
              );

            const surface =
              toast.type === 'error'
                ? 'bg-[#FDF8F7] border-[#D9B6B1] text-[#7D332B]'
                : 'bg-[#FAF8F3] border-[#1E3B2F]/25 text-[#18251E]';

            return (
              <motion.div
                key={toast.id}
                role="status"
                initial={{ opacity: 0, x: 40, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 32, scale: 0.96 }}
                transition={{ duration: 0.28, ease: EDITORIAL_EASE }}
                className={`pointer-events-auto relative overflow-hidden flex items-start gap-3 px-4 py-3 rounded-xl border shadow-[0_6px_18px_rgba(30,59,47,0.16)] ${surface}`}
              >
                <div className="mt-0.5">{icon}</div>
                <p className="text-sm font-medium leading-snug flex-1">
                  {toast.message}
                </p>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  aria-label="Dismiss notification"
                  className="text-[#76837A] hover:text-[#18251E] p-0.5 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <motion.span
                  aria-hidden="true"
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: 4.5, ease: 'linear' }}
                  className="absolute bottom-0 left-0 right-0 h-[2px] origin-left bg-[#1E3B2F]/35"
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};
