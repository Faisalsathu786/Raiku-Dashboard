import { StakingData } from '@/types';

const SANCTUM_API = 'https://api.sanctum.so/v1';
const RKUSOL_MINT = 'rkubjTrZYioRSeXwDnhwGQzvW3qkcin72JSxUt3WMVp';

export async function fetchStakingData(): Promise<StakingData> {
  try {
    const res = await fetch(`${SANCTUM_API}/lst/${RKUSOL_MINT}`);
    if (!res.ok) throw new Error(`Sanctum API error: ${res.status}`);
    const data = await res.json();
    return {
      totalSolStaked: data.total_sol_staked ?? data.totalSolValue ?? 0,
      totalRkusolSupply: data.supply ?? data.total_supply ?? 0,
      exchangeRate: data.exchange_rate ?? data.solValue ?? 1,
      apy: data.apy ?? data.apy_24h ?? 0,
      holders: data.holders ?? data.holder_count ?? 0,
    };
  } catch {
    return {
      totalSolStaked: 0,
      totalRkusolSupply: 0,
      exchangeRate: 1,
      apy: 0,
      holders: 0,
    };
  }
}

export async function fetchRkusolPrice(): Promise<number> {
  try {
    const res = await fetch(
      `https://public-api.birdeye.com/defi/price?address=${RKUSOL_MINT}`,
      {
        headers: {
          'X-API-KEY': process.env.NEXT_PUBLIC_BIRDEYE_API_KEY || '',
          Accept: 'application/json',
        },
      }
    );
    if (!res.ok) throw new Error(`Birdeye API error: ${res.status}`);
    const data = await res.json();
    return data?.data?.value ?? 0;
  } catch {
    return 0;
  }
}

export async function fetchTotalSupply(): Promise<number> {
  try {
    const payload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'getTokenSupply',
      params: [RKUSOL_MINT],
    };
    const res = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    const raw = data?.result?.value?.uiAmount;
    return typeof raw === 'number' ? raw : 0;
  } catch {
    return 0;
  }
}

export function calculatePoints(
  stakedAmount: number,
  daysStaked: number
): number {
  return stakedAmount * daysStaked;
}

export function getRecentStakers(): { address: string; amount: number }[] {
  return [
    { address: '8xT7...b2kL', amount: 1250.5 },
    { address: '3mK9...x7Wp', amount: 843.2 },
    { address: 'DRp2...9nQt', amount: 2100.0 },
    { address: '5yF1...c4Vh', amount: 567.8 },
    { address: 'nN6r...h2Jd', amount: 3400.15 },
    { address: 'aL4k...8mZs', amount: 175.6 },
    { address: '9jR3...w5Yf', amount: 6890.0 },
    { address: '2vT8...p1Xc', amount: 432.9 },
  ];
}
