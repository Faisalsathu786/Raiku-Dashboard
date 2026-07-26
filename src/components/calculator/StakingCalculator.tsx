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
    updateApy,
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

            <div>
              <label className="text-xs font-medium text-text-muted">
                APY (%)
              </label>
              <div className="mt-1.5">
                <select
                  value={input.apy}
                  onChange={(e) => updateApy(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value={7.5}>rkuSOL Staking (7.5%)</option>
                  <option value={5.2}>Native SOL Staking (5.2%)</option>
                  <option value={9.8}>rkuSOL + Kamino (9.8%)</option>
                  <option value={12.3}>rkuSOL + Meteora (12.3%)</option>
                </select>
              </div>
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
              <p className="text-xs text-text-muted">USD Value (at ~${result.solPrice}/SOL)</p>
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
