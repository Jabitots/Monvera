import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { LayoutGrid, Package, ReceiptText, Users } from 'lucide-react';
import { EDITORIAL_EASE } from './MotionPrimitives';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/orders', label: 'Orders', icon: ReceiptText },
  { to: '/customers', label: 'Customers', icon: Users },
];

export const Navigation: React.FC = () => {
  const location = useLocation();

  const isRouteActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  return (
    <>
      {/* Desktop: Compact Floating Forest-Green Vertical Rail */}
      <aside
        aria-label="Primary Navigation"
        className="hidden lg:flex fixed left-5 top-6 bottom-6 w-[68px] z-40 flex-col items-center justify-between py-6 px-2 rounded-2xl bg-[#1E3B2F] text-[#F5F0E6] shadow-[0_14px_34px_rgba(24,37,30,0.18)] border border-white/10"
      >
        {/* Top Brand Monogram */}
        <NavLink
          to="/"
          aria-label="Monvera Home"
          className="btn-soft group relative flex items-center justify-center w-10 h-10 rounded-xl bg-[#C8B48A]/15 border border-[#C8B48A]/35 text-[#F5F0E6] hover:bg-[#C8B48A]/25"
        >
          <span className="font-serif text-base font-semibold tracking-tight text-[#F5F0E6]">
            M
          </span>
          <span
            role="tooltip"
            className="pointer-events-none absolute left-[62px] px-3 py-1.5 rounded-lg bg-[#18251E] text-[#F5F0E6] text-xs font-medium whitespace-nowrap opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0 transition-all duration-200 shadow-md border border-[#C8B48A]/25"
          >
            Monvera
          </span>
        </NavLink>

        {/* Exactly Four Navigation Destinations with Sliding Active Indicator */}
        <nav className="flex flex-col items-center gap-3 w-full">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isRouteActive(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                aria-label={item.label}
                className={`group relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[2px] active:translate-y-[1px] active:scale-[0.98] ${
                  active
                    ? 'text-[#18251E]'
                    : 'text-[#F5F0E6]/75 hover:text-[#F5F0E6] hover:bg-white/10 hover:shadow-[0_6px_16px_rgba(21,43,34,0.35)]'
                }`}
              >
                {active ? (
                  <motion.span
                    layoutId="nav-active-desktop"
                    transition={{ duration: 0.35, ease: EDITORIAL_EASE }}
                    aria-hidden="true"
                    className="absolute inset-0 rounded-xl bg-[#C8B48A] shadow-[0_4px_12px_rgba(24,37,30,0.28)]"
                  />
                ) : null}
                <Icon
                  className="relative z-10 w-[19px] h-[19px]"
                  strokeWidth={1.75}
                />
                <span
                  role="tooltip"
                  className="pointer-events-none absolute left-[60px] px-3 py-1.5 rounded-lg bg-[#18251E] text-[#F5F0E6] text-xs font-medium whitespace-nowrap opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0 transition-all duration-200 shadow-md border border-[#C8B48A]/25"
                >
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>

        {/* Subtle Architectural Mark at Base */}
        <div
          aria-hidden="true"
          className="w-6 h-[1px] bg-[#C8B48A]/35 rounded-full"
        />
      </aside>

      {/* Mobile & Tablet: Compact Floating Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-3 left-3 right-3 z-40 h-14 px-2 rounded-2xl bg-[#1E3B2F] text-[#F5F0E6] shadow-[0_10px_28px_rgba(24,37,30,0.24)] border border-white/10 flex items-center justify-around"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isRouteActive(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-all duration-200 hover:-translate-y-[1px] active:scale-[0.98] ${
                active
                  ? 'text-[#18251E]'
                  : 'text-[#F5F0E6]/80 hover:text-[#F5F0E6]'
              }`}
            >
              {active ? (
                <motion.span
                  layoutId="nav-active-mobile"
                  transition={{ duration: 0.32, ease: EDITORIAL_EASE }}
                  aria-hidden="true"
                  className="absolute inset-0 rounded-xl bg-[#C8B48A] shadow-[0_3px_10px_rgba(24,37,30,0.25)]"
                />
              ) : null}
              <Icon className="relative z-10 w-4 h-4 shrink-0" strokeWidth={1.8} />
              <span className="relative z-10 hidden sm:inline">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
};
