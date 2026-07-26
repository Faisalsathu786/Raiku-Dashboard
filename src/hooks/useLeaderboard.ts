'use client';

import { useState, useMemo, useCallback } from 'react';
import { LeaderboardEntry, LeaderboardFilters } from '@/types';

const MOCK_ADDRESSES = [
  '8xT7cKp2mN4vB6jL9sD1fH3wQ5tR8yU0',
  '3mK9nB5vC7xZ1pQ4rT6yU8iO0aL2sD4',
  'DRp2sT5vW8yB1nM4kL7jH0gF3dS6aZ9',
  '5yF1gH3jK5lZ7xC9vB0nM2qW4eR6tY8',
  'nN6rT9yU2iO4pA6sD8fG0hJ2kL4zX6',
  '9jR3tE6wY9iL2pA5sD8fG1hJ4kZ7xC',
  '2vT8bY1nM4kL7jH0gF3dS6aZ9xC5vB',
  'wQ5eR8tY1uI3oP6aS9dF2gH5jK8lZ0',
  'pL4kZ7xC9vB2nM5qW8eR1tY4uI7oP0',
  'sD3fG6hJ9kL2zX5cV8bN1mQ4wE7rT0',
];

function generateLeaderboard(
  filters: LeaderboardFilters
): LeaderboardEntry[] {
  return MOCK_ADDRESSES.map((addr, i) => {
    const baseStaked = Math.floor(Math.random() * 100_000) + 500;
    const multiplier = filters.timeRange === 'week' ? 7 : filters.timeRange === 'month' ? 30 : 1;
    return {
      rank: i + 1,
      walletAddress: addr,
      solStaked: baseStaked,
      estimatedPoints: baseStaked * multiplier + Math.floor(Math.random() * 1000),
      change24h: (Math.random() - 0.4) * 20,
    };
  }).sort((a, b) => {
    if (filters.sortBy === 'sol') return b.solStaked - a.solStaked;
    return b.estimatedPoints - a.estimatedPoints;
  });
}

export function useLeaderboard(initialFilters?: Partial<LeaderboardFilters>) {
  const [filters, setFilters] = useState<LeaderboardFilters>({
    sortBy: 'sol',
    timeRange: 'all',
    limit: 10,
    ...initialFilters,
  });

  const entries = useMemo(() => generateLeaderboard(filters), [filters]);

  const updateFilters = useCallback(
    (patch: Partial<LeaderboardFilters>) => {
      setFilters((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  return { entries, filters, updateFilters };
}
