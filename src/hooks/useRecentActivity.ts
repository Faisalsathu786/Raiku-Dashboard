'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ActivityEvent {
  signature: string;
  tokenAccount: string;
  walletAddress: string;
  type: 'stake' | 'unstake';
  amount: number;
  timestamp: string;
  blockTime: number;
}

export function useRecentActivity() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch('/api/activity');
      const json = await res.json();
      if (json.activity) {
        setEvents(json.activity);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, 30_000);
    return () => clearInterval(interval);
  }, [fetchActivity]);

  return { events, loading };
}
