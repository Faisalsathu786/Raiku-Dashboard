'use client';

import { usePointsSimulator } from '@/hooks/usePointsSimulator';
import { formatNumber, formatUsd, formatPoints } from '@/utils/format';
import { ComparisonChart } from './ComparisonChart';
import { Sparkles } from 'lucide-react';

export function StakingCalculator() {
  const {
    input,
    result,
    updateAmount,
    updateDuration,
  } = usePointsSimulator();

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-6">
          <h3 className="text-sm font-semibold text-text">
            Staking Simulator
          </h3>
          <p className="text-xs text-text-muted mt-1">
            Estimate your rkuSOL rewards and points
          </p>

          <div className="mt-6 space-y-5">
            <div>
              <label className="text-xs font-medium text-text-muted">
                SOL Amount
              </label>
              <div className="mt-1.5 flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={1000}
                  value={input.amount}
                  onChange={(e) => updateAmount(Number(e.target.value))}
                  className="flex-1 h-1.5 rounded-full bg-surface-light accent-primary appearance-none cursor-pointer"
                />
                <input
                  type="number"
                  value={input.amount}
                  onChange={(e) => updateAmount(Number(e.target.value))}
                  className="w-20 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-text text-right focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-text-muted">
                Duration (days)
              </label>
              <div className="mt-1.5 flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={365}
                  value={input.duration}
                  onChange={(e) => updateDuration(Number(e.target.value))}
                  className="flex-1 h-1.5 rounded-full bg-surface-light accent-primary appearance-none cursor-pointer"
                />
                <input
                  type="number"
                  value={input.duration}
                  onChange={(e) => updateDuration(Number(e.target.value))}
                  className="w-20 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-text text-right focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div className="rounded-lg bg-surface-light p-3">
              <p className="text-xs text-text-muted">
                Current APY: <span className="text-text font-medium">{input.apy}%</span>
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                Rate sourced live from Sanctum
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <h3 className="text-sm font-semibold text-text">Results</h3>
          <p className="text-xs text-text-muted mt-1">
            Projected returns for {formatNumber(input.amount)} SOL over{' '}
            {input.duration} days
          </p>

          <div className="mt-6 space-y-4">
            <div className="rounded-lg bg-surface-light p-4">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-accent" />
                <span className="text-xs text-text-muted">
                  Estimated Points
                </span>
              </div>
              <p className="mt-1 text-2xl font-bold text-accent">
                {formatPoints(result.estimatedPoints)}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                {formatNumber(input.amount)} SOL x {input.duration} days = {formatPoints(result.estimatedPoints)} pts
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-surface-light p-3">
                <p className="text-xs text-text-muted">SOL Rewards</p>
                <p className="mt-1 text-lg font-semibold text-text">
                  {formatNumber(result.solRewards)} SOL
                </p>
              </div>
              <div className="rounded-lg bg-surface-light p-3">
                <p className="text-xs text-text-muted">Total Return</p>
                <p className="mt-1 text-lg font-semibold text-text">
                  {formatNumber(result.totalReturn)} SOL
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-surface-light p-3">
              <p className="text-xs text-text-muted">
                USD Value (at ${formatNumber(result.solPrice)}/SOL)
              </p>
              <p className="mt-1 text-lg font-semibold text-success">
                {formatUsd(result.usdValue)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <ComparisonChart
        amount={input.amount}
        duration={input.duration}
        solPrice={result.solPrice}
      />
    </div>
  );
}
