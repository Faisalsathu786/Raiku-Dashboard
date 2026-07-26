export const RKUSOL_TOKEN_ADDRESS =
  'rkubjTrZYioRSeXwDnhwGQzvW3qkcin72JSxUt3WMVp';

export const SANCTUM_API_BASE = 'https://api.sanctum.so/v1';

export const BIRDEYE_API_BASE = 'https://public-api.birdeye.com';

export const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

export const POINTS_PER_SOL_PER_DAY = 1;

export const DEFAULT_STATS: {
  totalStaked: number;
  holderCount: number;
  apy: number;
  exchangeRate: number;
  pointsPerDayPerSol: number;
} = {
  totalStaked: 0,
  holderCount: 0,
  apy: 0,
  exchangeRate: 1,
  pointsPerDayPerSol: POINTS_PER_SOL_PER_DAY,
};

export const STAKING_HISTORY_DAYS = 30;

export const LEADERBOARD_DEFAULT_LIMIT = 50;

export const POINTS_BREAKDOWN = [
  { name: 'Staking Rewards', value: 58, color: '#6366f1' },
  { name: 'MEV Rewards', value: 22, color: '#8b5cf6' },
  { name: 'AOT/JIT Fees', value: 20, color: '#a78bfa' },
];

export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: 'LayoutDashboard' },
  { label: 'Leaderboard', href: '/leaderboard', icon: 'Trophy' },
  { label: 'Analytics', href: '/analytics', icon: 'BarChart3' },
  { label: 'Calculator', href: '/calculator', icon: 'Calculator' },
] as const;
