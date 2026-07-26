'use client';

import { useState, useMemo, useEffect } from 'react';

interface SimulatorInput {
  amount: number;
  duration: number;
  apy: number;
}

interface SimulatorResult {
  estimatedPoints: number;
  solRewards: number;
  usdValue: number;
  solPrice: number;
  totalReturn: number;
  apy: number;
}

export function usePointsSimulator() {
  const [solPrice, setSolPrice] = useState(75.28);
  const [apy, setApy] = useState(4.25);
  const [input, setInput] = useState<SimulatorInput>({
    amount: 10,
    duration: 30,
    apy: 4.25,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/staking');
        const data = await res.json();
        if (data.apy) {
          setApy(data.apy);
          setInput((prev) => ({ ...prev, apy: data.apy }));
        }
        if (data.solPriceUsd) {
          setSolPrice(data.solPriceUsd);
        }
      } catch {
        // keep defaults
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, []);

  const result = useMemo<SimulatorResult>(() => {
    const pointsPerDayPerSol = 1;
    const estimatedPoints = input.amount * input.duration * pointsPerDayPerSol;
    const annualRate = apy / 100;
    const solRewards = input.amount * annualRate * (input.duration / 365);
    const totalReturn = input.amount + solRewards;
    const usdValue = totalReturn * solPrice;

    return {
      estimatedPoints,
      solRewards,
      usdValue,
      solPrice,
      totalReturn,
      apy,
    };
  }, [input, apy, solPrice]);

  const updateAmount = (amount: number) =>
    setInput((prev) => ({ ...prev, amount: Math.max(0, amount) }));
  const updateDuration = (duration: number) =>
    setInput((prev) => ({ ...prev, duration: Math.max(1, duration) }));

  return {
    input,
    result,
    updateAmount,
    updateDuration,
  };
}
