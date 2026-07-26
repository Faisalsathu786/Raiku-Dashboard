'use client';

import { useRouter } from 'next/navigation';
import { LeaderboardEntry } from '@/types';
import { shortenAddress, formatNumber, formatPoints } from '@/utils/format';
import { Trophy, Medal, ExternalLink } from 'lucide-react';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  loading?: boolean;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return <Trophy size={18} className="text-yellow-400" />;
  if (rank === 2)
    return <Medal size={18} className="text-slate-300" />;
  if (rank === 3)
    return <Medal size={18} className="text-amber-600" />;
  return (
    <span className="w-7 text-center text-sm font-mono text-text-muted">
      {rank}
    </span>
  );
}

export function LeaderboardTable({ entries, loading }: LeaderboardTableProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-lg bg-surface-light"
            />
          ))}
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex h-40 items-center justify-center text-sm text-text-muted">
          No holder data available
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-text-muted">
              <th className="py-3 pl-5 font-medium w-12">#</th>
              <th className="py-3 font-medium">Wallet</th>
              <th className="py-3 font-medium text-right">SOL Staked</th>
              <th className="py-3 font-medium text-right">Est. Days</th>
              <th className="py-3 font-medium text-right">Est. Points</th>
              <th className="py-3 pr-5 font-medium text-right">Details</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.rank}
                className="border-b border-border/50 last:border-0 hover:bg-surface-light/50 transition-colors"
              >
                <td className="py-3 pl-5">
                  <RankBadge rank={entry.rank} />
                </td>
                <td className="py-3 font-mono text-text">
                  {shortenAddress(entry.walletAddress)}
                </td>
                <td className="py-3 text-right text-text tabular-nums">
                  {formatNumber(entry.solStaked)} SOL
                </td>
                <td className="py-3 text-right text-text tabular-nums">
                  {entry.daysHeld != null
                    ? `${formatNumber(entry.daysHeld)}d`
                    : '-'}
                </td>
                <td className="py-3 text-right text-accent-light tabular-nums font-medium">
                  {formatPoints(entry.estimatedPoints)}
                </td>
                <td className="py-3 pr-5 text-right">
                  <button
                    onClick={() =>
                      router.push(
                        `/portfolio?wallet=${entry.walletAddress}`
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                  >
                    <ExternalLink size={12} />
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
