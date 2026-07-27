'use client';

import { shortenAddress, formatNumber, formatUsd, formatPoints } from '@/utils/format';
import {
  Calendar,
  Coins,
  TrendingUp,
  Wallet2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Building2,
} from 'lucide-react';
import type { PortfolioData } from '@/types';

interface PortfolioCardProps {
  data: PortfolioData;
}

export function PortfolioCard({ data }: PortfolioCardProps) {
  const firstDate = data.firstStakedAt
    ? new Date(data.firstStakedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Unknown';

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Wallet2 size={22} className="text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text">
              {shortenAddress(data.walletAddress)}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {data.daysSinceFirstStake > 0
                ? `Holding for ${data.daysSinceFirstStake} days (since ${firstDate})`
                : 'No rkuSOL holdings detected'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <StatCard
          icon={<Coins size={18} />}
          label="Total rkuSOL Managed"
          value={formatNumber(data.managedBalance)}
          sub={`In wallet: ${formatNumber(data.currentBalance)}`}
          color="primary"
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="USD Value"
          value={formatUsd(data.usdValue)}
          sub={`Rate: ${data.exchangeRate.toFixed(4)} SOL/rkuSOL`}
          color="accent"
        />
        <StatCard
          icon={<Calendar size={18} />}
          label="Days Since First Stake"
          value={formatNumber(data.daysSinceFirstStake)}
          sub={`First staked: ${firstDate}`}
          color="green"
        />
        <StatCard
          icon={<Clock size={18} />}
          label="APY"
          value={`${data.apy}%`}
          sub="Annual percentage yield"
          color="purple"
        />
      </div>

      {/* dApp Deposits Section */}
      {data.dappDeposits.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={16} className="text-yellow-400" />
            <h3 className="text-sm font-semibold text-text">
              rkuSOL Deposited in dApps ({formatNumber(data.depositedBalance)} rkuSOL)
            </h3>
          </div>
          <p className="text-xs text-text-muted mb-4">
            Your rkuSOL is working in these protocols - points are still earning on the full balance.
          </p>
          <div className="space-y-2">
            {data.dappDeposits.map((dep, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-surface-light px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400/10 text-yellow-400 text-xs font-bold">
                    {dep.dappName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text">{dep.dappName}</p>
                    <a
                      href={`https://solscan.io/account/${dep.dappAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-text-muted hover:text-primary transition-colors"
                    >
                      View protocol
                    </a>
                  </div>
                </div>
                <span className="text-sm font-semibold text-yellow-400 tabular-nums">
                  {formatNumber(dep.amount)} rkuSOL
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-6">
          <h3 className="text-sm font-semibold text-text">Total Points (Time-Weighted)</h3>
          <p className="text-xs text-text-muted mt-1">
            Points calculated on your full managed balance (wallet + deposits)
          </p>
          <div className="mt-4">
            <p className="text-3xl font-bold text-accent">
              {formatPoints(data.totalPoints)}
            </p>
            <p className="text-xs text-text-muted mt-1">
              Points are never lost - they lock in for each period you hold
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <h3 className="text-sm font-semibold text-text">Estimated Rewards</h3>
          <p className="text-xs text-text-muted mt-1">
            Based on {data.apy}% APY
          </p>
          <div className="mt-4">
            <p className="text-3xl font-bold text-success">
              {formatNumber(data.estimatedRewards)} rkuSOL
            </p>
            <p className="text-xs text-text-muted mt-1">
              ~{formatUsd(data.estimatedRewards * data.exchangeRate * (data.solValue > 0 ? data.usdValue / data.solValue : 75.9))}
            </p>
          </div>
        </div>
      </div>

      <ActivityTimeline
        activity={data.activity}
        periods={data.periods}
        totalPoints={data.totalPoints}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: 'primary' | 'accent' | 'green' | 'purple';
}) {
  const colorMap = {
    primary: 'text-primary',
    accent: 'text-accent',
    green: 'text-success',
    purple: 'text-accent-light',
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className={`mb-3 ${colorMap[color]}`}>{icon}</div>
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold text-text">{value}</p>
      <p className="text-xs text-text-muted mt-0.5">{sub}</p>
    </div>
  );
}

function ActivityTimeline({
  activity,
  periods,
  totalPoints,
}: {
  activity: PortfolioData['activity'];
  periods: PortfolioData['periods'];
  totalPoints: number;
}) {
  if (activity.length === 0 && periods.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-surface p-6">
        <h3 className="text-sm font-semibold text-text mb-4">Activity & Points Breakdown</h3>

        {periods.length === 0 && (
          <p className="text-xs text-text-muted">No holding periods to display</p>
        )}

        {periods.length > 0 && (
          <div className="mb-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-text-muted">
                  <th className="pb-3 font-medium">Period</th>
                  <th className="pb-3 font-medium text-right">Balance</th>
                  <th className="pb-3 font-medium text-right">Managed</th>
                  <th className="pb-3 font-medium text-right">Days</th>
                  <th className="pb-3 font-medium text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p, i) => {
                  const fromDate = new Date(p.from).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  });
                  const toDate = p.to
                    ? new Date(p.to).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Now';

                  return (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="py-3 text-text text-xs">
                        <span className="font-medium">{fromDate}</span>
                        <span className="text-text-muted mx-1">to</span>
                        <span className="font-medium">{toDate}</span>
                      </td>
                      <td className="py-3 text-right text-text tabular-nums">
                        {formatNumber(p.balance)} rkuSOL
                      </td>
                      <td className="py-3 text-right text-yellow-400 tabular-nums">
                        {p.managedBalance != null ? formatNumber(p.managedBalance) : formatNumber(p.balance)} rkuSOL
                      </td>
                      <td className="py-3 text-right text-text-muted tabular-nums">
                        {p.days}d
                      </td>
                      <td className="py-3 text-right text-accent tabular-nums font-medium">
                        {formatPoints(p.points)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-border">
                  <td colSpan={4} className="py-3 text-right text-sm font-semibold text-text">
                    Total Points
                  </td>
                  <td className="py-3 text-right text-sm font-bold text-accent tabular-nums">
                    {formatPoints(totalPoints)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <h3 className="text-sm font-semibold text-text mb-4">Transaction History</h3>

        {activity.length === 0 && (
          <p className="text-xs text-text-muted">No rkuSOL transactions found</p>
        )}

        <div className="space-y-1">
          {activity.map((evt, i) => {
            const date = new Date(evt.timestamp).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
            const time = new Date(evt.timestamp).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            });

            const isStake = evt.type === 'stake';
            const isDeposit = evt.type === 'deposit';
            const isWithdraw = evt.type === 'withdraw';
            const isPositive = isStake || isWithdraw;

            const iconBgColor = isStake
              ? 'bg-success/10 text-success'
              : isDeposit
              ? 'bg-yellow-400/10 text-yellow-400'
              : isWithdraw
              ? 'bg-primary/10 text-primary'
              : 'bg-danger/10 text-danger';

            const IconComponent = isStake ? ArrowUpRight : isDeposit ? Building2 : isWithdraw ? ArrowDownRight : ArrowDownRight;

            return (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-surface-light transition-colors"
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0 ${iconBgColor}`}
                >
                  <IconComponent size={14} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text">
                      {isStake ? 'Staked' : isDeposit ? `Deposit to ${evt.dappName || 'dApp'}` : isWithdraw ? `Withdrew from ${evt.dappName || 'dApp'}` : 'Unstaked'}
                    </span>
                    <span className="text-sm font-semibold text-text tabular-nums">
                      {formatNumber(evt.amount)} rkuSOL
                    </span>
                    <span className="text-xs text-text-muted">
                      {date} {time}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-muted mt-0.5">
                    <span>
                      Balance: {formatNumber(evt.balanceBefore)} {isPositive ? '>' : '<'}{' '}
                      {formatNumber(evt.balanceAfter)} rkuSOL
                    </span>
                    {evt.daysSinceLastEvent > 0 && (
                      <span>
                        Held for {evt.daysSinceLastEvent}d
                      </span>
                    )}
                    {evt.pointsEarned > 0 && (
                      <span className="text-accent font-medium">
                        +{formatPoints(evt.pointsEarned)} pts
                      </span>
                    )}
                  </div>
                </div>

                <a
                  href={`https://solscan.io/tx/${evt.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 text-text-muted hover:text-primary transition-colors"
                  title="View on Solscan"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
