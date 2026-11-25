import React from 'react';
import { Header } from '../components/Header';

interface MainLayoutProps {
  pageTitle: string;
  breadcrumb: string;
  metaInfo?: string;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  pageTitle,
  breadcrumb,
  metaInfo,
  children,
}) => {
  return (
    <div className="relative min-h-screen bg-[var(--color-cream)] text-[var(--color-ink)] overflow-x-hidden">
      {/* Subtle ambient palette-tinted background shapes */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -top-32 right-[8%] w-96 h-96 rounded-full bg-[#C8B48A]/12 blur-3xl animate-ambient-drift"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed bottom-[-120px] left-[18%] w-80 h-80 rounded-full bg-[#7F8C6A]/10 blur-3xl animate-ambient-drift"
        style={{ animationDelay: '-11s' }}
      />

      <main className="relative z-10 lg:pl-[112px] pb-24 lg:pb-14">
        <div className="max-w-[1360px] mx-auto px-5 sm:px-8 lg:px-10 pt-6 sm:pt-8">
          <Header
            pageTitle={pageTitle}
            breadcrumb={breadcrumb}
            metaInfo={metaInfo}
          />
          {children}
        </div>
      </main>
    </div>
  );
};
