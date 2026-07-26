'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PortfolioData } from '@/types';

export function usePortfolio(walletAddress: string | null) {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolio = useCallback(async () => {
    if (!walletAddress) {
      setData(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/portfolio?wallet=${walletAddress}`);
      const json = await res.json();
      if (json.error) {
        setError(json.error);
        setData(null);
      } else {
        setData(json);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch portfolio');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchPortfolio();
    const interval = setInterval(fetchPortfolio, 30_000);
    return () => clearInterval(interval);
  }, [fetchPortfolio]);

  return { data, loading, error, refresh: fetchPortfolio };
}
