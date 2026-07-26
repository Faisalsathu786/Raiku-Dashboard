'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AreaChart } from '@/components/charts/AreaChart';
import { BarChart } from '@/components/charts/BarChart';
import { formatNumber } from '@/utils/format';

const TVL_DATA = [
  { label: 'Jul 1', value: 2.4 },
  { label: 'Jul 3', value: 2.6 },
  { label: 'Jul 5', value: 2.8 },
  { label: 'Jul 7', value: 3.1 },
  { label: 'Jul 9', value: 3.3 },
  { label: 'Jul 11', value: 3.6 },
  { label: 'Jul 13', value: 3.9 },
  { label: 'Jul 15', value: 4.2 },
  { label: 'Jul 17', value: 4.5 },
  { label: 'Jul 19', value: 4.8 },
  { label: 'Jul 21', value: 5.1 },
  { label: 'Jul 23', value: 5.4 },
  { label: 'Jul 25', value: 5.8 },
];

const VOLUME_DATA = [
  { label: 'Mon', value: 124500 },
  { label: 'Tue', value: 189200 },
  { label: 'Wed', value: 156800 },
  { label: 'Thu', value: 203400 },
  { label: 'Fri', value: 178900 },
  { label: 'Sat', value: 98700 },
  { label: 'Sun', value: 112300 },
];

const APY_HISTORY = [
  { label: 'Jul 1', value: 7.8 },
  { label: 'Jul 3', value: 7.6 },
  { label: 'Jul 5', value: 7.9 },
  { label: 'Jul 7', value: 7.5 },
  { label: 'Jul 9', value: 7.7 },
  { label: 'Jul 11', value: 7.4 },
  { label: 'Jul 13', value: 7.8 },
  { label: 'Jul 15', value: 7.3 },
  { label: 'Jul 17', value: 7.6 },
  { label: 'Jul 19', value: 7.5 },
  { label: 'Jul 21', value: 7.3 },
  { label: 'Jul 23', value: 7.4 },
  { label: 'Jul 25', value: 7.5 },
];

const POINTS_DISTRIBUTION = [
  { label: '0-100', value: 340 },
  { label: '100-500', value: 220 },
  { label: '500-1K', value: 140 },
  { label: '1K-5K', value: 85 },
  { label: '5K-10K', value: 42 },
  { label: '10K-50K', value: 28 },
  { label: '50K+', value: 15 },
];

export default function AnalyticsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-6">
            <h3 className="text-sm font-semibold text-text">TVL Growth</h3>
            <p className="text-xs text-text-muted mt-1">
              Total value locked in rkuSOL (millions USD)
            </p>
            <div className="mt-4">
              <AreaChart
                data={TVL_DATA}
                dataKey="value"
                xKey="label"
                color="#6366f1"
                gradientId="tvlGradient"
                tooltipFormatter={(v) => `$${v}M`}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            <h3 className="text-sm font-semibold text-text">Weekly Volume</h3>
            <p className="text-xs text-text-muted mt-1">
              rkuSOL trading volume (USD)
            </p>
            <div className="mt-4">
              <BarChart
                data={VOLUME_DATA}
                dataKey="value"
                xKey="label"
                color="#8b5cf6"
                tooltipFormatter={(v) => `$${formatNumber(v)}`}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-6">
            <h3 className="text-sm font-semibold text-text">APY Trend</h3>
            <p className="text-xs text-text-muted mt-1">
              30-day rkuSOL annual percentage yield
            </p>
            <div className="mt-4">
              <AreaChart
                data={APY_HISTORY}
                dataKey="value"
                xKey="label"
                color="#22c55e"
                gradientId="apyGradient"
                tooltipFormatter={(v) => `${v}%`}
                height={250}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            <h3 className="text-sm font-semibold text-text">
              Points Distribution
            </h3>
            <p className="text-xs text-text-muted mt-1">
              Wallets by points bracket
            </p>
            <div className="mt-4">
              <BarChart
                data={POINTS_DISTRIBUTION}
                dataKey="value"
                xKey="label"
                color="#a78bfa"
                tooltipFormatter={(v) => `${v} wallets`}
                height={250}
              />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
