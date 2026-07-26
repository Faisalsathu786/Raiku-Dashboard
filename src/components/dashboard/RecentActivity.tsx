'use client';

import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { getRecentStakers } from '@/utils/api';
import { shortenAddress, formatNumber } from '@/utils/format';
import clsx from 'clsx';

interface Activity {
  address: string;
  amount: number;
  type: 'stake' | 'unstake';
  time: string;
}

function generateMockActivity(): Activity[] {
  const stakers = getRecentStakers();
  const activities: Activity[] = [];
  const now = Date.now();

  stakers.forEach((s, i) => {
    activities.push({
      address: s.address,
      amount: s.amount,
      type: i < 6 ? 'stake' : 'unstake',
      time: new Date(now - i * 3600000 * Math.random() * 24).toISOString(),
    });
  });

  return activities.sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
  );
}

export function RecentActivity() {
  const activities = generateMockActivity();

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <h3 className="text-sm font-semibold text-text">Recent Activity</h3>
      <p className="text-xs text-text-muted mt-1">
        Latest staking and unstaking transactions
      </p>

      <div className="mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-text-muted">
                <th className="pb-3 font-medium">Wallet</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium text-right">Amount</th>
                <th className="pb-3 font-medium text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {activities.slice(0, 8).map((activity, i) => {
                const isStake = activity.type === 'stake';
                const timeAgo = getRelativeTime(activity.time);

                return (
                  <tr
                    key={i}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-2.5 font-mono text-text">
                      {shortenAddress(activity.address)}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={clsx(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                          isStake
                            ? 'bg-success/10 text-success'
                            : 'bg-danger/10 text-danger'
                        )}
                      >
                        {isStake ? (
                          <ArrowDownLeft size={12} />
                        ) : (
                          <ArrowUpRight size={12} />
                        )}
                        {isStake ? 'Stake' : 'Unstake'}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-text">
                      {formatNumber(activity.amount)} SOL
                    </td>
                    <td className="py-2.5 text-right text-text-muted">
                      {timeAgo}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function getRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
