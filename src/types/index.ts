export interface StakingData {
  totalSolStaked: number;
  totalRkusolSupply: number;
  exchangeRate: number;
  apy: number;
  holders: number;
}

export interface PointsData {
  walletAddress: string;
  estimatedPoints: number;
  solStaked: number;
  rkusolBalance: number;
  usdValue: number;
}

export interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  solStaked: number;
  estimatedPoints: number;
  change24h: number;
}

export interface StakingHistoryPoint {
  timestamp: string;
  totalSolStaked: number;
  holderCount: number;
  apy: number;
}

export interface DashboardStats {
  totalStaked: number;
  holderCount: number;
  apy: number;
  exchangeRate: number;
  pointsPerDayPerSol: number;
}

export interface LeaderboardFilters {
  sortBy: 'sol' | 'points';
  timeRange: 'all' | 'month' | 'week';
  limit: number;
}
