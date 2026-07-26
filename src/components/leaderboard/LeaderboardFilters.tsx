'use client';

import { LeaderboardFilters } from '@/types';

interface LeaderboardFiltersProps {
  filters: LeaderboardFilters;
  onChange: (patch: Partial<LeaderboardFilters>) => void;
}

export function LeaderboardFiltersPanel({
  filters,
  onChange,
}: LeaderboardFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-xs text-text-muted">Sort by</label>
        <select
          value={filters.sortBy}
          onChange={(e) =>
            onChange({ sortBy: e.target.value as 'sol' | 'points' })
          }
          className="h-8 rounded-lg border border-border bg-surface px-2.5 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="sol">SOL Staked</option>
          <option value="points">Points</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-text-muted">Period</label>
        <select
          value={filters.timeRange}
          onChange={(e) =>
            onChange({
              timeRange: e.target.value as 'all' | 'month' | 'week',
            })
          }
          className="h-8 rounded-lg border border-border bg-surface px-2.5 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="all">All Time</option>
          <option value="month">30 Days</option>
          <option value="week">7 Days</option>
        </select>
      </div>
    </div>
  );
}
