'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { BarChart } from '@/components/charts/BarChart';
import { formatNumber, formatUsd, formatPoints } from '@/utils/format';

interface AnalyticsData {
  tvl: { current: number; supply: number; price: number };
  volume: { recent: number; recentSolValue: number };
  apy: { current: number; exchangeRate: number };
  holders: number;
  pointsDistribution: Array<{ label: string; value: number }>;
  computedAt: string;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics');
      const d = (await res.json()) as AnalyticsData & { error?: string };
      if (!d.error) setData(d);
    } catch {
      // keep stale data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const distributionData = data?.pointsDistribution ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Key metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="TVL"
            value={data ? formatUsd(data.tvl.current) : '-'}
            sub={data ? `${formatNumber(data.tvl.supply)} rkuSOL · $${data.tvl.price}` : ''}
            color="primary"
            loading={loading}
          />
          <MetricCard
            label="Holders"
            value={data ? formatNumber(data.holders) : '-'}
            sub="Active wallets with rkuSOL balance"
            color="accent"
            loading={loading}
          />
          <MetricCard
            label="APY"
            value={data ? `${data.apy.current}%` : '-'}
            sub={data ? `Rate: ${data.apy.exchangeRate} SOL/rkuSOL` : ''}
            color="green"
            loading={loading}
          />
          <MetricCard
            label="Recent Volume"
            value={data ? `${formatNumber(data.volume.recent)} rkuSOL` : '-'}
            sub={data ? `~${formatNumber(data.volume.recentSolValue)} SOL` : ''}
            color="purple"
            loading={loading}
          />
        </div>

        {/* Points Distribution */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-sm font-semibold text-text">Points Distribution</h3>
              <p className="text-xs text-text-muted mt-1">
                Wallets bucketed by estimated points · refreshed every 30s
              </p>
            </div>
            {data?.computedAt && (
              <span className="text-xs text-text-muted font-mono">
                Updated: {new Date(data.computedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="mt-4">
            {loading ? (
              <div className="h-64 animate-pulse rounded-lg bg-surface-light" />
            ) : distributionData.length > 0 ? (
              <BarChart
                data={distributionData}
                dataKey="value"
                xKey="label"
                color="#a78bfa"
                tooltipFormatter={(v) => `${v} wallets`}
                height={280}
              />
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-text-muted">
                No distribution data available
              </div>
            )}
          </div>
        </div>

        {/* Summary stats */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <h3 className="text-sm font-semibold text-text mb-3">Network Summary</h3>
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <div className="flex justify-between rounded-lg bg-surface-light px-4 py-3">
              <span className="text-text-muted">Total Supply</span>
              <span className="text-text font-medium tabular-nums">
                {data ? formatNumber(data.tvl.supply) : '-'} rkuSOL
              </span>
            </div>
            <div className="flex justify-between rounded-lg bg-surface-light px-4 py-3">
              <span className="text-text-muted">rkuSOL Price</span>
              <span className="text-text font-medium tabular-nums">
                {data ? `$${data.tvl.price}` : '-'}
              </span>
            </div>
            <div className="flex justify-between rounded-lg bg-surface-light px-4 py-3">
              <span className="text-text-muted">Exchange Rate</span>
              <span className="text-text font-medium tabular-nums">
                {data ? data.apy.exchangeRate.toFixed(4) : '-'} SOL
              </span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function MetricCard({
  label,
  value,
  sub,
  color,
  loading,
}: {
  label: string;
  value: string;
  sub: string;
  color: 'primary' | 'accent' | 'green' | 'purple';
  loading: boolean;
}) {
  const colors = {
    primary: 'bg-primary/10 text-primary',
    accent: 'bg-accent/10 text-accent',
    green: 'bg-success/10 text-success',
    purple: 'bg-accent-light/10 text-accent-light',
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      {loading ? (
        <div className="space-y-2">
          <div className="h-3 w-16 animate-pulse rounded bg-surface-light" />
          <div className="h-7 w-28 animate-pulse rounded bg-surface-light" />
        </div>
      ) : (
        <>
          <p className="text-xs text-text-muted">{label}</p>
          <p className="mt-1 text-xl font-bold text-text">{value}</p>
          <p className="text-xs text-text-muted mt-0.5">{sub}</p>
        </>
      )}
    </div>
  );
}
