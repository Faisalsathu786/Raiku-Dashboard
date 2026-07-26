'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StakingCalculator } from '@/components/calculator/StakingCalculator';

export default function CalculatorPage() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h3 className="text-base font-semibold text-text">
            Rewards Calculator
          </h3>
          <p className="text-xs text-text-muted mt-1">
            Simulate rkuSOL staking returns and estimate your points
          </p>
        </div>
        <StakingCalculator />
      </div>
    </DashboardLayout>
  );
}
