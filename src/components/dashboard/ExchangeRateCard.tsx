'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

interface ExchangeRateCardProps {
  rate: number;
  change24h?: number;
}

export function ExchangeRateCard({ rate, change24h = 0.12 }: ExchangeRateCardProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <h3 className="text-sm font-semibold text-text">Exchange Rate</h3>
      <p className="text-xs text-text-muted mt-1">rkuSOL to SOL conversion</p>

      <div className="mt-4 space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold text-text">
              1 rkuSOL
            </p>
            <p className="mt-0.5 text-sm text-text-muted">
              = {rate > 0 ? rate.toFixed(4) : '--'} SOL
            </p>
          </div>
          {change24h !== undefined && (
            <div className="flex items-center gap-1 rounded-full bg-surface-light px-2.5 py-1">
              {change24h >= 0 ? (
                <TrendingUp size={14} className="text-success" />
              ) : (
                <TrendingDown size={14} className="text-danger" />
              )}
              <span
                className={`text-xs font-medium ${
                  change24h >= 0 ? 'text-success' : 'text-danger'
                }`}
              >
                {change24h >= 0 ? '+' : ''}
                {change24h.toFixed(3)}%
              </span>
            </div>
          )}
        </div>

        <div className="h-px bg-border" />

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-surface-light p-3">
            <p className="text-xs text-text-muted">10 rkuSOL</p>
            <p className="mt-0.5 text-sm font-semibold text-text">
              {(rate * 10).toFixed(4)} SOL
            </p>
          </div>
          <div className="rounded-lg bg-surface-light p-3">
            <p className="text-xs text-text-muted">100 rkuSOL</p>
            <p className="mt-0.5 text-sm font-semibold text-text">
              {(rate * 100).toFixed(4)} SOL
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
