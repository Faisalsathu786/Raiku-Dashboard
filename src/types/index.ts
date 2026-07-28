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
  change24h?: number;
  daysHeld?: number | null;
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

export interface PortfolioActivity {
  signature: string;
  timestamp: string;
  type: 'stake' | 'unstake' | 'deposit' | 'withdraw';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  daysSinceLastEvent: number;
  pointsEarned: number;
  dappName?: string;
  dappAddress?: string;
}

export interface DappDeposit {
  dappName: string;
  dappAddress: string;
  amount: number;
  detectedAt: string;
}

export interface PortfolioPeriod {
  from: string;
  to: string | null;
  balance: number;
  days: number;
  points: number;
  // managedBalance includes in-wallet + deposited amounts
  managedBalance?: number;
}

export interface PortfolioData {
  walletAddress: string;
  currentBalance: number;
  depositedBalance: number;
  managedBalance: number;
  solValue: number;
  usdValue: number;
  totalPoints: number;
  pointsPerDay: number;
  estimatedRewards: number;
  apy: number;
  exchangeRate: number;
  daysSinceFirstStake: number;
  firstStakedAt: string | null;
  activity: PortfolioActivity[];
  periods: PortfolioPeriod[];
  tokenAccounts: Array<{ address: string; amount: number }>;
  dappDeposits: DappDeposit[];
}
