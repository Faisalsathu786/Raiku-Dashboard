'use client';

import { useState, useEffect, useCallback } from 'react';

interface StakingApiResponse {
  totalSolStaked: number;
  totalRkusolSupply: number;
  exchangeRate: number;
  apy: number;
  holders: number;
  rkuSOLPriceUsd: number;
  solPriceUsd: number;
  volumeUsd24h: number;
  liquidityUsd: number;
}

const DEFAULT_STATS = {
  totalStaked: 0,
  holderCount: 0,
  apy: 0,
  exchangeRate: 1,
  pointsPerDayPerSol: 1,
};

export function useStakingData() {
  const [raw, setRaw] = useState<StakingApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/staking');
      const data = (await res.json()) as StakingApiResponse & {
        error?: string;
      };
      if (data.error) {
        setError(data.error);
      }
      setRaw(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch staking data'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const stats = raw
    ? {
        totalStaked: raw.totalSolStaked,
        holderCount: raw.holders,
        apy: raw.apy,
        exchangeRate: raw.exchangeRate,
        pointsPerDayPerSol: 1,
      }
    : DEFAULT_STATS;

  return { stats, raw, loading, error, refresh };
}
