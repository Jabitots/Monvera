import React from 'react';
import { LogOut } from 'lucide-react';
import { formatHeaderDate } from '../utils/formatters';
import { useAuth } from '../hooks/useAuth';

interface HeaderProps {
  pageTitle: string;
  breadcrumb: string;
  metaInfo?: string;
}

export const Header: React.FC<HeaderProps> = ({
  pageTitle,
  breadcrumb,
  metaInfo,
}) => {
  const { user, logout } = useAuth();
  const todayFormatted = formatHeaderDate();

  const initials = user?.initials || 'JB';
  const displayName = user?.email
    ? user.email.split('@')[0]
    : user?.fullName || 'jb';
  const roleLabel = user?.role || 'Proprietor';

  return (
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 mb-8 border-b border-[var(--color-border)]">
      {/* Left: Contextual breadcrumb and current module title */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs text-[var(--color-ink-subtle)] tracking-wide">
          <span>Monvera</span>
          <span aria-hidden="true">/</span>
          <span className="text-[var(--color-ink-muted)] font-medium">
            {breadcrumb}
          </span>
          {metaInfo ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{metaInfo}</span>
            </>
          ) : null}
        </div>
        <p className="mt-1 text-sm font-medium text-[var(--color-forest)] truncate">
          {pageTitle}
        </p>
      </div>

      {/* Right: Date, Profile Indicator (JB monogram, no photo), and Sign out */}
      <div className="flex items-center gap-4 sm:gap-5 shrink-0">
        <span className="hidden md:inline text-xs text-[var(--color-ink-muted)] tabular-nums whitespace-nowrap">
          {todayFormatted}
        </span>

        <div className="h-4 w-[1px] bg-[var(--color-border-strong)] hidden md:block" />

        <div className="flex items-center gap-2.5">
          <div
            aria-hidden="true"
            className="w-8 h-8 rounded-full bg-[#1E3B2F] text-[#F5F0E6] border border-[#C8B48A]/40 flex items-center justify-center font-serif text-xs font-medium tracking-wide shrink-0"
          >
            {initials}
          </div>
          <div className="leading-tight">
            <p className="text-xs font-semibold text-[var(--color-ink)] whitespace-nowrap">
              {displayName}
            </p>
            <p className="text-[11px] text-[var(--color-ink-subtle)] whitespace-nowrap">
              {roleLabel}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          aria-label="Sign out"
          title="Sign out"
          className="btn-soft inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-white)] text-xs font-medium text-[var(--color-ink-muted)] hover:text-[#7D332B] hover:border-[#D9B6B1] hover:bg-[#FDF8F7] whitespace-nowrap shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
};
