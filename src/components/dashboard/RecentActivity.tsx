'use client';

import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { shortenAddress, formatNumber } from '@/utils/format';
import clsx from 'clsx';

const RECENT_ACTIONS: Array<{
  address: string;
  amount: number;
  type: 'stake' | 'unstake';
}> = [
  { address: 'FcTYERGTnymbL1BDdXow9Z1RqZ1rE8AYbjs79d8hmGKq', amount: 71211.39, type: 'stake' },
  { address: 'HrcoELSsegq3F2JtFv34g9Meu44mA4jaywiwoNV4fnCd', amount: 28804.41, type: 'stake' },
  { address: '6CsD9U2EUSZpfQbQxVPUvdxZ9gwDdkEu2wUZt1JXfyRv', amount: 20826.75, type: 'stake' },
  { address: 'AYhux5gJzu3ePp7HpuFJG1mNKkLL5Q6q5HgCvYmGCGvW', amount: 653.71, type: 'stake' },
  { address: '4YpatyXDfNsNfn32r7xSZALcwFh77F7JNWM2PSNfekDd', amount: 555.56, type: 'stake' },
  { address: '6GPu2patJNMpPtCMc7jeaPhs4X95ig68K3tY44qetz5z', amount: 404.15, type: 'stake' },
  { address: 'FwkLodYCbF7SqWxq5oQEtth7TjsmfoUCEme4BUBYvqCX', amount: 162.33, type: 'stake' },
  { address: 'EatQ6Lu9fqGbDKdK6cfAqBv7LxJ7gRjcmiZ8bbsMjQ3t', amount: 156.25, type: 'unstake' },
  { address: '28eiZ4fAyg7boz6dZ2wcQqjMFdSNnQ2P7nAXRGjzoz6d', amount: 122.49, type: 'stake' },
  { address: 'G3E5TyR5CX5TuRm2xYJfYRjByLCPNATFgTfgPDSfnRm9', amount: 100.73, type: 'unstake' },
];

export function RecentActivity() {
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <h3 className="text-sm font-semibold text-text">Recent Activity</h3>
      <p className="text-xs text-text-muted mt-1">
        Largest rkuSOL holders and staking positions
      </p>

      <div className="mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-text-muted">
                <th className="pb-3 font-medium">Wallet</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium text-right">Amount</th>
                <th className="pb-3 font-medium text-right">Share</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_ACTIONS.slice(0, 8).map((item, i) => {
                const isStake = item.type === 'stake';
                const share = ((item.amount / RECENT_ACTIONS.reduce((s, a) => s + a.amount, 0)) * 100).toFixed(1);

                return (
                  <tr
                    key={i}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-2.5 font-mono text-text">
                      {shortenAddress(item.address)}
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
                      {formatNumber(item.amount)} SOL
                    </td>
                    <td className="py-2.5 text-right text-text-muted tabular-nums">
                      {share}%
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
