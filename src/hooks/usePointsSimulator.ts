'use client';

import { useState, useMemo } from 'react';

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
  const [input, setInput] = useState<SimulatorInput>({
    amount: 10,
    duration: 30,
    apy: 7.5,
  });

  const result = useMemo<SimulatorResult>(() => {
    const solPrice = 180;
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
  }, [input]);

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
