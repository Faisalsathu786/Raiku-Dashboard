'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { StakingGrowthChart } from '@/components/dashboard/StakingGrowthChart';
import { PointsBreakdown } from '@/components/dashboard/PointsBreakdown';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { ExchangeRateCard } from '@/components/dashboard/ExchangeRateCard';
import { useStakingData } from '@/hooks/useStakingData';

const MOCK_CHART_DATA = [
  { label: 'Jul 1', staked: 12400, holders: 320 },
  { label: 'Jul 3', staked: 12800, holders: 340 },
  { label: 'Jul 5', staked: 13200, holders: 355 },
  { label: 'Jul 7', staked: 13500, holders: 370 },
  { label: 'Jul 9', staked: 13900, holders: 390 },
  { label: 'Jul 11', staked: 14300, holders: 410 },
  { label: 'Jul 13', staked: 14800, holders: 435 },
  { label: 'Jul 15', staked: 15200, holders: 450 },
  { label: 'Jul 17', staked: 15600, holders: 470 },
  { label: 'Jul 19', staked: 16000, holders: 490 },
  { label: 'Jul 21', staked: 16500, holders: 510 },
  { label: 'Jul 23', staked: 17000, holders: 535 },
  { label: 'Jul 25', staked: 17500, holders: 560 },
];

export default function DashboardPage() {
  const { stats, loading } = useStakingData();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <StatsGrid stats={stats} loading={loading} />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <StakingGrowthChart data={MOCK_CHART_DATA} />
          </div>
          <ExchangeRateCard rate={stats.exchangeRate} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <PointsBreakdown />
          <RecentActivity />
        </div>
      </div>
    </DashboardLayout>
  );
}
