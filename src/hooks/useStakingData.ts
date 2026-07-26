'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardStats } from '@/types';
import { fetchStakingData } from '@/utils/api';
import { DEFAULT_STATS } from '@/utils/constants';

export function useStakingData() {
  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchStakingData();
      setStats({
        totalStaked: data.totalSolStaked,
        holderCount: data.holders,
        apy: data.apy,
        exchangeRate: data.exchangeRate,
        pointsPerDayPerSol: 1,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch staking data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { stats, loading, error, refresh };
}
