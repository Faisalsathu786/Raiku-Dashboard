'use client';

import { useEffect, useState } from 'react';
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
  const [rkusolApy, setRkusolApy] = useState(4.25);

  useEffect(() => {
    const fetchApy = async () => {
      try {
        const res = await fetch('/api/staking');
        const data = await res.json();
        if (data.apy) setRkusolApy(data.apy);
      } catch {
        // keep default
      }
    };
    fetchApy();
    const interval = setInterval(fetchApy, 60_000);
    return () => clearInterval(interval);
  }, []);

  const strategies: StrategyData[] = [
    {
      label: 'Native SOL Staking',
      value: amount * (1 + (0.052 * duration) / 365) * solPrice,
      apy: 5.2,
      color: '#94a3b8',
    },
    {
      label: 'rkuSOL Staking',
      value: amount * (1 + (rkusolApy / 100 * duration) / 365) * solPrice,
      apy: rkusolApy,
      color: '#6366f1',
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

      <div className="mt-4 grid grid-cols-2 gap-3">
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
