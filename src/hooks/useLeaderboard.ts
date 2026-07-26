'use client';

import { useState, useEffect, useCallback } from 'react';
import type { LeaderboardEntry, LeaderboardFilters } from '@/types';

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total: number;
}

export function useLeaderboard(initialFilters?: Partial<LeaderboardFilters>) {
  const [filters, setFilters] = useState<LeaderboardFilters>({
    sortBy: 'sol',
    timeRange: 'all',
    limit: 50,
    ...initialFilters,
  });
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: String(filters.limit),
        sortBy: filters.sortBy,
      });
      const res = await fetch(`/api/leaderboard?${params}`);
      const data = (await res.json()) as LeaderboardResponse;
      setEntries(data.entries ?? []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 30_000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  const updateFilters = useCallback(
    (patch: Partial<LeaderboardFilters>) => {
      setFilters((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  return { entries, filters, updateFilters, loading };
}
