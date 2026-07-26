'use client';

import { AreaChart } from '@/components/charts/AreaChart';
import { formatNumber } from '@/utils/format';

interface StakingGrowthChartProps {
  data: Array<{ label: string; staked: number; holders: number }>;
}

export function StakingGrowthChart({ data }: StakingGrowthChartProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-text">Staking Growth</h3>
          <p className="text-xs text-text-muted mt-1">
            Total SOL staked over time
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
            SOL Staked
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-accent" />
            Holders
          </div>
        </div>
      </div>

      <AreaChart
        data={data}
        dataKey="staked"
        xKey="label"
        color="#6366f1"
        gradientId="stakingGradient"
        tooltipFormatter={(v) => formatNumber(v) + ' SOL'}
      />
    </div>
  );
}
