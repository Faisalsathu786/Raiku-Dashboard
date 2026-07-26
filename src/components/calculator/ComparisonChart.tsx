'use client';

import { BarChart } from '@/components/charts/BarChart';
import { formatUsd } from '@/utils/format';

interface ComparisonChartProps {
  amount: number;
  duration: number;
  solPrice: number;
}

interface StrategyData {
  label: string;
  value: number;
  apy: number;
  color: string;
}

export function ComparisonChart({
  amount,
  duration,
  solPrice,
}: ComparisonChartProps) {
  const strategies: StrategyData[] = [
    {
      label: 'Native SOL',
      value: amount * (1 + (0.052 * duration) / 365) * solPrice,
      apy: 5.2,
      color: '#94a3b8',
    },
    {
      label: 'rkuSOL',
      value: amount * (1 + (0.075 * duration) / 365) * solPrice,
      apy: 7.5,
      color: '#6366f1',
    },
    {
      label: 'rkuSOL + Kamino',
      value: amount * (1 + (0.098 * duration) / 365) * solPrice,
      apy: 9.8,
      color: '#8b5cf6',
    },
    {
      label: 'rkuSOL + Meteora',
      value: amount * (1 + (0.123 * duration) / 365) * solPrice,
      apy: 12.3,
      color: '#a78bfa',
    },
  ];

  const chartData = strategies.map((s) => ({
    label: s.label,
    value: Math.round(s.value * 100) / 100,
  }));

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <h3 className="text-sm font-semibold text-text">Yield Comparison</h3>
      <p className="text-xs text-text-muted mt-1">
        Projected returns by strategy ({amount} SOL, {duration} days)
      </p>

      <div className="mt-6">
        <BarChart
          data={chartData}
          dataKey="value"
          xKey="label"
          color="#6366f1"
          height={280}
          tooltipFormatter={(v) => formatUsd(v)}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {strategies.map((s) => (
          <div
            key={s.label}
            className="rounded-lg bg-surface-light p-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-xs text-text-muted">{s.label}</span>
            </div>
            <p className="text-sm font-semibold text-text">
              {s.apy.toFixed(1)}% APY
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
