'use client';

import { Layers, Users, TrendingUp, RefreshCw } from 'lucide-react';
import { StatsCard } from './StatsCard';
import { DashboardStats } from '@/types';
import { formatNumber, formatPercent, formatSol } from '@/utils/format';

interface StatsGridProps {
  stats: DashboardStats;
  loading?: boolean;
}

export function StatsGrid({ stats, loading }: StatsGridProps) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border border-border bg-surface"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatsCard
        label="Total SOL Staked"
        value={stats.totalStaked > 0 ? formatSol(stats.totalStaked) : '--'}
        change={2.4}
        icon={<Layers size={20} />}
      />
      <StatsCard
        label="Holders"
        value={stats.holderCount > 0 ? formatNumber(stats.holderCount, 0) : '--'}
        change={5.1}
        icon={<Users size={20} />}
      />
      <StatsCard
        label="APY"
        value={stats.apy > 0 ? formatPercent(stats.apy) : '--'}
        change={-0.3}
        icon={<TrendingUp size={20} />}
      />
      <StatsCard
        label="Exchange Rate"
        value={
          stats.exchangeRate > 0
            ? `1 rkuSOL = ${stats.exchangeRate.toFixed(4)} SOL`
            : '--'
        }
        icon={<RefreshCw size={20} />}
      />
    </div>
  );
}
