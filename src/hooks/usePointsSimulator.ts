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

const CUSTOM_APY = 7.5;

export function usePointsSimulator() {
  const [solPrice, setSolPrice] = useState(180);
  const [input, setInput] = useState<SimulatorInput>({
    amount: 10,
    duration: 30,
    apy: CUSTOM_APY,
  });

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch('/api/staking');
        const data = await res.json();
        if (data.solPriceUsd) {
          setSolPrice(data.solPriceUsd);
        }
      } catch {
        // keep default
      }
    };
    fetchPrice();
    const interval = setInterval(fetchPrice, 60_000);
    return () => clearInterval(interval);
  }, []);

  const result = useMemo<SimulatorResult>(() => {
    const pointsPerDayPerSol = 1;
    const estimatedPoints = input.amount * input.duration * pointsPerDayPerSol;
    const annualRate = input.apy / 100;
    const solRewards = input.amount * annualRate * (input.duration / 365);
    const totalReturn = input.amount + solRewards;
    const usdValue = totalReturn * solPrice;

    return {
      estimatedPoints,
      solRewards,
      usdValue,
      solPrice,
      totalReturn,
      apy: input.apy,
    };
  }, [input, solPrice]);

  const updateAmount = (amount: number) =>
    setInput((prev) => ({ ...prev, amount: Math.max(0, amount) }));
  const updateDuration = (duration: number) =>
    setInput((prev) => ({ ...prev, duration: Math.max(1, duration) }));
  const updateApy = (apy: number) =>
    setInput((prev) => ({ ...prev, apy }));

  return {
    input,
    result,
    updateAmount,
    updateDuration,
    updateApy,
  };
}
