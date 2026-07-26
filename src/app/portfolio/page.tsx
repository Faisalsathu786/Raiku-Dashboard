'use client';

import { Suspense, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PortfolioCard } from '@/components/portfolio/PortfolioCard';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useWalletConnect } from '@/hooks/useWalletConnect';
import { shortenAddress } from '@/utils/format';
import { Wallet2, LogOut, Search } from 'lucide-react';

function PortfolioContent() {
  const searchParams = useSearchParams();
  const targetWallet = searchParams.get('wallet');
  const { publicKey, connected, walletName, connect, disconnect } = useWalletConnect();
  const [manualAddress, setManualAddress] = useState('');

  const effectiveWallet = targetWallet ?? (connected ? publicKey ?? null : null);
  const { data, loading, error } = usePortfolio(effectiveWallet);

  const handleManualLookup = useCallback(() => {
    if (manualAddress.trim().length >= 32) {
      window.history.pushState({}, '', `/portfolio?wallet=${manualAddress.trim()}`);
      // force re-render by reloading
      window.location.href = `/portfolio?wallet=${manualAddress.trim()}`;
    }
  }, [manualAddress]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-text">Portfolio</h3>
          <p className="text-xs text-text-muted mt-1">
            {targetWallet
              ? `Viewing wallet: ${shortenAddress(targetWallet)}`
              : connected
                ? `Connected: ${shortenAddress(publicKey!)} ${walletName ? `(${walletName})` : ''}`
                : 'Connect wallet or enter address to view rkuSOL portfolio'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!targetWallet && connected ? (
            <button
              onClick={disconnect}
              className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 transition-colors"
            >
              <LogOut size={14} />
              Disconnect
            </button>
          ) : !targetWallet ? (
            <button
              onClick={connect}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors"
            >
              <Wallet2 size={14} />
              Connect Wallet
            </button>
          ) : (
            <a
              href="/portfolio"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-light transition-colors"
            >
              View My Portfolio
            </a>
          )}
        </div>
      </div>

      {!connected && !targetWallet && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-text-muted mb-2">
            Or enter a Solana wallet address to view its rkuSOL portfolio:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              placeholder="Paste Solana wallet address..."
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
              onKeyDown={(e) => e.key === 'Enter' && handleManualLookup()}
            />
            <button
              onClick={handleManualLookup}
              className="inline-flex items-center gap-1.5 rounded-lg bg-surface-light px-3 py-2 text-xs font-medium text-text hover:bg-primary/10 hover:text-primary transition-colors"
              disabled={manualAddress.trim().length < 32}
            >
              <Search size={14} />
              Lookup
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="rounded-xl border border-border bg-surface p-12">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-text-muted">Fetching portfolio data...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {!loading && !error && !data && !targetWallet && !connected && (
        <div className="rounded-xl border border-border bg-surface p-12">
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-text-muted">
              Connect your wallet or enter an address to get started
            </p>
          </div>
        </div>
      )}

      {data && data.rkusolBalance <= 0 && (
        <div className="rounded-xl border border-border bg-surface p-12">
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-text-muted">
              No rkuSOL found in this wallet
            </p>
            <p className="text-xs text-text-muted">
              {targetWallet
                ? shortenAddress(targetWallet)
                : shortenAddress(publicKey!)}
            </p>
          </div>
        </div>
      )}

      {data && data.rkusolBalance > 0 && <PortfolioCard data={data} />}
    </div>
  );
}

export default function PortfolioPage() {
  return (
    <DashboardLayout>
      <Suspense
        fallback={
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="rounded-xl border border-border bg-surface p-12">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            </div>
          </div>
        }
      >
        <PortfolioContent />
      </Suspense>
    </DashboardLayout>
  );
}
