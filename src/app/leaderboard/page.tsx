'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { LeaderboardFiltersPanel } from '@/components/leaderboard/LeaderboardFilters';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useStakingData } from '@/hooks/useStakingData';
import { StatsGrid } from '@/components/dashboard/StatsGrid';

export default function LeaderboardPage() {
  const { entries, filters, updateFilters, loading } = useLeaderboard();
  const { stats, loading: statsLoading } = useStakingData();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <StatsGrid stats={stats} loading={statsLoading} />

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-text">
              Top Holders
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {loading
                ? 'Loading...'
                : `${entries.length} holders ranked by ${filters.sortBy === 'sol' ? 'rkuSOL staked' : 'estimated points'}, est. days based on token launch date`}
            </p>
          </div>
          <LeaderboardFiltersPanel
            filters={filters}
            onChange={updateFilters}
          />
        </div>

        <LeaderboardTable entries={entries} loading={loading} />
      </div>
    </DashboardLayout>
  );
}
