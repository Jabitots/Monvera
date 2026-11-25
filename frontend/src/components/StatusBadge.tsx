import React from 'react';
import { OrderStatus } from '../types';

interface StatusBadgeProps {
  status: OrderStatus;
}

const STATUS_STYLES: Record<OrderStatus, string> = {
  Pending:
    'bg-[var(--color-status-pending-bg)] text-[var(--color-status-pending-fg)] border-[#C8B48A]/45',
  Processing:
    'bg-[var(--color-status-processing-bg)] text-[var(--color-status-processing-fg)] border-[#7F8C6A]/35',
  Completed:
    'bg-[var(--color-status-completed-bg)] text-[var(--color-status-completed-fg)] border-[#1E3B2F]/25',
  Cancelled:
    'bg-[var(--color-status-cancelled-bg)] text-[var(--color-status-cancelled-fg)] border-[#7D332B]/25',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border whitespace-nowrap shrink-0 ${
        STATUS_STYLES[status] || STATUS_STYLES.Pending
      }`}
    >
      {status}
    </span>
  );
};
