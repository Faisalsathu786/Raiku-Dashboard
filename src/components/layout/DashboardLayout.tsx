'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import clsx from 'clsx';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Overview',
  '/portfolio': 'Portfolio',
  '/leaderboard': 'Leaderboard',
  '/analytics': 'Analytics',
  '/calculator': 'Calculator',
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] || 'Overview';

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar-collapsed') === 'true';
    }
    return false;
  });

  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    // Close mobile sidebar on route change
    setMobileOpen(false);
  }, [pathname]);

  const sidebarWidth = collapsed ? 'w-16' : 'w-64';

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} mobile={false} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div
        className={clsx(
          'fixed left-0 top-0 z-50 h-full transition-transform duration-200 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Sidebar collapsed={false} onToggle={() => {}} mobile={true} />
      </div>

      <div
        className={clsx(
          'flex flex-1 flex-col transition-all duration-200',
          collapsed ? 'lg:ml-16' : 'lg:ml-64'
        )}
      >
        <Header
          title={title}
          onMenuClick={() => setMobileOpen(!mobileOpen)}
          mobileMenuOpen={mobileOpen}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
