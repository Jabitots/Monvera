import React from 'react';
import { motion } from 'motion/react';
import { EDITORIAL_EASE } from './MotionPrimitives';

export interface ColumnDef<T> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  className?: string;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  onRowClick?: (row: T) => void;
  selectedRowKey?: string | null;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'Adjust your filters or add a new entry to populate this ledger.',
  emptyAction,
  onRowClick,
  selectedRowKey,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="bg-[var(--color-surface-white)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(30,59,47,0.04)]">
        <div className="divide-y divide-[var(--color-border)]">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-4 px-6 py-4"
            >
              <div className="h-4 skeleton-shimmer rounded w-1/4" />
              <div className="h-4 skeleton-shimmer rounded w-1/5" />
              <div className="h-4 skeleton-shimmer rounded w-1/6" />
              <div className="h-4 skeleton-shimmer rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EDITORIAL_EASE }}
        className="bg-[var(--color-surface-white)] border border-[var(--color-border)] rounded-2xl px-8 py-14 text-center shadow-[0_2px_10px_rgba(30,59,47,0.04)]"
      >
        <h3 className="font-serif text-xl text-[var(--color-forest)]">
          {emptyTitle}
        </h3>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)] max-w-md mx-auto">
          {emptyDescription}
        </p>
        {emptyAction ? <div className="mt-6">{emptyAction}</div> : null}
      </motion.div>
    );
  }

  return (
    <div className="bg-[var(--color-surface-white)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(30,59,47,0.05)]">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-cream)]/70">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-5 py-3.5 text-[11px] font-semibold tracking-wider uppercase text-[var(--color-ink-subtle)] whitespace-nowrap ${
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                  } ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {data.map((row, idx) => {
              const id = rowKey(row);
              const isSelected = selectedRowKey === id;
              return (
                <motion.tr
                  key={id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.32,
                    delay: Math.min(idx * 0.04, 0.32),
                    ease: EDITORIAL_EASE,
                  }}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`transition-colors duration-200 ${
                    onRowClick ? 'cursor-pointer' : ''
                  } ${
                    isSelected
                      ? 'bg-[#F3ECE0]/85'
                      : 'hover:bg-[var(--color-surface-cream)]/85'
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-5 py-3.5 text-sm text-[var(--color-ink)] ${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                      } ${col.className || ''}`}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
