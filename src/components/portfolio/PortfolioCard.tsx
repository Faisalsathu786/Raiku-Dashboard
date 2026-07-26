'use client';

import { shortenAddress, formatNumber, formatUsd, formatPoints } from '@/utils/format';
import { Calendar, Coins, TrendingUp, Wallet2, Clock } from 'lucide-react';

interface PortfolioData {
  walletAddress: string;
  rkusolBalance: number;
  solValue: number;
  usdValue: number;
  daysHeld: number;
  estimatedPoints: number;
  estimatedRewards: number;
  apy: number;
  exchangeRate: number;
  firstStakedAt: string | null;
  tokenAccounts: Array<{ address: string; amount: number }>;
}

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
              {data.daysHeld > 0
                ? `Holding for ${data.daysHeld} days (since ${firstDate})`
                : 'No rkuSOL holdings detected'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <StatCard
          icon={<Coins size={18} />}
          label="rkuSOL Balance"
          value={formatNumber(data.rkusolBalance)}
          sub={`${formatNumber(data.solValue)} SOL`}
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
          label="Days Held"
          value={formatNumber(data.daysHeld)}
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

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-6">
          <h3 className="text-sm font-semibold text-text">Estimated Points</h3>
          <p className="text-xs text-text-muted mt-1">
            {data.daysHeld} days at {data.rkusolBalance.toLocaleString()} rkuSOL
          </p>
          <div className="mt-4">
            <p className="text-3xl font-bold text-accent">
              {formatPoints(data.estimatedPoints)}
            </p>
            <p className="text-xs text-text-muted mt-1">
              Formula: rkuSOL balance x days held x 1 point/day/SOL
            </p>
            <div className="mt-3 text-xs text-text-muted space-y-0.5">
              <p>{formatNumber(data.rkusolBalance)} rkuSOL x {data.daysHeld} days = {formatPoints(data.estimatedPoints)} pts</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <h3 className="text-sm font-semibold text-text">Estimated Rewards</h3>
          <p className="text-xs text-text-muted mt-1">
            Based on {data.apy}% APY over {data.daysHeld} days
          </p>
          <div className="mt-4">
            <p className="text-3xl font-bold text-success">
              {formatNumber(data.estimatedRewards)} rkuSOL
            </p>
            <p className="text-xs text-text-muted mt-1">
              ~{formatUsd(data.estimatedRewards * 75.9)} at current price
            </p>
            <div className="mt-3 text-xs text-text-muted space-y-0.5">
              <p>{formatNumber(data.rkusolBalance)} rkuSOL x {data.apy}% x ({data.daysHeld}/365) = {data.estimatedRewards.toFixed(4)} rkuSOL</p>
            </div>
          </div>
        </div>
      </div>

      {data.tokenAccounts.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-6">
          <h3 className="text-sm font-semibold text-text">Token Accounts</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-text-muted">
                  <th className="pb-3 font-medium">Account</th>
                  <th className="pb-3 font-medium text-right">rkuSOL Balance</th>
                </tr>
              </thead>
              <tbody>
                {data.tokenAccounts.map((acc, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 font-mono text-text">
                      {shortenAddress(acc.address)}
                    </td>
                    <td className="py-2.5 text-right text-text tabular-nums">
                      {formatNumber(acc.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
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
