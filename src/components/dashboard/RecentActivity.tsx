'use client';

import { ArrowDownLeft, ArrowUpRight, ExternalLink } from 'lucide-react';
import { shortenAddress, formatNumber } from '@/utils/format';
import clsx from 'clsx';
import { useRecentActivity, type ActivityEvent } from '@/hooks/useRecentActivity';

export function RecentActivity() {
  const { events, loading } = useRecentActivity();

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <h3 className="text-sm font-semibold text-text">Recent Activity</h3>
      <p className="text-xs text-text-muted mt-1">
        Live rkuSOL transactions from the Solana network
        {events.length > 0 && (
          <span className="ml-1 text-text-muted">
            (updates every 30s)
          </span>
        )}
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
                <th className="pb-3 font-medium text-right">Tx</th>
              </tr>
            </thead>
            <tbody>
              {loading && events.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-text-muted">
                    Loading activity...
                  </td>
                </tr>
              )}

              {!loading && events.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-text-muted">
                    No recent activity found
                  </td>
                </tr>
              )}

              {events.map((item, i) => {
                const isStake = item.type === 'stake';
                const time = formatTimestamp(item.timestamp);

                return (
                  <tr
                    key={item.signature + item.walletAddress}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-2.5 font-mono text-text text-xs">
                      {shortenAddress(item.walletAddress)}
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
                    <td className="py-2.5 text-right text-text tabular-nums">
                      {formatNumber(item.amount)}
                    </td>
                    <td className="py-2.5 text-right text-text-muted tabular-nums text-xs">
                      {time}
                    </td>
                    <td className="py-2.5 text-right">
                      <a
                        href={`https://solscan.io/tx/${item.signature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex text-text-muted hover:text-primary transition-colors"
                        title="View on Solscan"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {events.length > 0 && (
        <p className="mt-3 text-xs text-text-muted">
          Showing {events.length} most recent transactions
        </p>
      )}
    </div>
  );
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60_000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
