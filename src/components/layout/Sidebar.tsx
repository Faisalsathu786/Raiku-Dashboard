'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Trophy, BarChart3, Calculator, Wallet2 } from 'lucide-react';
import clsx from 'clsx';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Portfolio', href: '/portfolio', icon: Wallet2 },
  { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Calculator', href: '/calculator', icon: Calculator },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-surface">
      <div className="flex h-16 items-center gap-3 px-6 border-b border-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
          <span className="text-sm font-bold text-white">R</span>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-text">rkuSOL</h1>
          <p className="text-xs text-text-muted">Points Dashboard</p>
        </div>
      </div>

      <nav className="mt-6 px-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 mb-1 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-text-muted hover:bg-surface-light hover:text-text'
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-6 left-0 right-0 px-6">
        <div className="rounded-lg border border-border bg-surface-light p-4">
          <p className="text-xs text-text-muted">Powered by</p>
          <p className="text-sm font-medium text-text">Raiku Ecosystem</p>
        </div>
      </div>
    </aside>
  );
}
