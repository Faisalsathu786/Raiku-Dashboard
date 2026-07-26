'use client';

import clsx from 'clsx';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { ReactNode } from 'react';

interface StatsCardProps {
  label: string;
  value: string;
  change?: number;
  icon: ReactNode;
  className?: string;
}

export function StatsCard({ label, value, change, icon, className }: StatsCardProps) {
  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-xl border border-border bg-surface p-5 transition-shadow hover:shadow-lg hover:shadow-primary/5',
        className
      )}
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-primary via-accent to-transparent" />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-bold text-text">{value}</p>
          {change !== undefined && (
            <div className="mt-1.5 flex items-center gap-1">
              {change >= 0 ? (
                <TrendingUp size={14} className="text-success" />
              ) : (
                <TrendingDown size={14} className="text-danger" />
              )}
              <span
                className={clsx(
                  'text-xs font-medium',
                  change >= 0 ? 'text-success' : 'text-danger'
                )}
              >
                {change >= 0 ? '+' : ''}
                {change.toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
      </div>
    </div>
  );
}
