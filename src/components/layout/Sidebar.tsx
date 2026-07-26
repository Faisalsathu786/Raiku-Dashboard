'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Trophy, BarChart3, Calculator, Wallet2, ChevronLeft } from 'lucide-react';
import clsx from 'clsx';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Portfolio', href: '/portfolio', icon: Wallet2 },
  { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Calculator', href: '/calculator', icon: Calculator },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobile?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ collapsed, onToggle, mobile, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  const sidebarContent = (
    <>
      <div
        className={clsx(
          'flex h-16 items-center border-b border-border',
          collapsed ? 'justify-center px-0' : 'gap-3 px-6'
        )}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden bg-black flex-shrink-0">
          <img src="/raiku-logo.jpg" alt="Raiku" className="h-full w-full object-cover" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="text-lg font-semibold text-text">Raiku</h1>
            <p className="text-xs text-text-muted">Points Dashboard</p>
          </div>
        )}
      </div>

      <nav className={clsx('mt-6', collapsed ? 'px-2' : 'px-3')}>
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center rounded-lg text-sm font-medium transition-colors mb-1',
                collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-text-muted hover:bg-surface-light hover:text-text'
              )}
              title={collapsed && !mobile ? item.label : undefined}
            >
              <Icon size={18} />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      <div className={clsx('absolute bottom-6 left-0 right-0', collapsed ? 'px-2' : 'px-6')}>
        {collapsed ? (
          <div className="flex justify-center">
            <img
              src="/crypto-coach.jpg"
              alt="Crypto coach"
              className="h-8 w-8 rounded-full object-cover ring-1 ring-border flex-shrink-0"
            />
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-surface-light p-3">
            <div className="flex items-center gap-3">
              <img
                src="/crypto-coach.jpg"
                alt="Crypto coach"
                className="h-9 w-9 rounded-full object-cover ring-1 ring-border flex-shrink-0"
              />
              <div>
                <p className="text-xs text-text-muted">Developed By</p>
                <p className="text-sm font-medium text-text">Crypto coach</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <aside
      className={clsx(
        'h-screen border-r border-border bg-surface transition-all duration-200 flex flex-col',
        collapsed ? 'w-16' : 'w-64',
        mobile ? 'relative' : 'fixed left-0 top-0'
      )}
    >

      {sidebarContent}

      {!mobile && (
        <button
          onClick={onToggle}
          className="absolute -right-3 top-1/2 z-50 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-text-muted hover:text-text hover:border-primary/40 transition-colors shadow-sm"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft
            size={14}
            className={clsx('transition-transform duration-200', collapsed ? 'rotate-180' : '')}
          />
        </button>
      )}
    </aside>
  );
}
