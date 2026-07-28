import { NextResponse } from 'next/server';

const RKUSOL_MINT = 'rkubjTrZYioRSeXwDnhwGQzvW3qkcin72JSxUt3WMVp';
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const POINTS_PER_SOL_PER_DAY = 1;
const CONCURRENCY = 5;

let priceCache: { sol: number; rkusol: number; ts: number } | null = null;

async function fetchRpc(method: string, params: unknown[]) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(SOLANA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: controller.signal,
      next: { revalidate: 15 },
    });
    const data = await res.json();
    return data?.result;
  } finally {
    clearTimeout(timeout);
  }
}

async function getPrices() {
  if (priceCache && Date.now() - priceCache.ts < 30_000) return priceCache;
  const [solR, rkusolR] = await Promise.all([
    fetch('https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112')
      .then((r) => r.json()).catch(() => ({})),
    fetch(`https://api.jup.ag/price/v2?ids=${RKUSOL_MINT}`)
      .then((r) => r.json()).catch(() => ({})),
  ]);
  priceCache = {
    sol: parseFloat(solR?.data?.['So11111111111111111111111111111111111111112']?.price ?? '75.28'),
    rkusol: parseFloat(rkusolR?.data?.[RKUSOL_MINT]?.price ?? '75.9'),
    ts: Date.now(),
  };
  return priceCache;
}

async function getTokenSupply(): Promise<number> {
  const result = (await fetchRpc('getTokenSupply', [RKUSOL_MINT])) as
    { value?: { uiAmount?: number } } | undefined;
  return result?.value?.uiAmount ?? 126519;
}

async function getProgramAccounts() {
  const res = await fetchRpc('getProgramAccounts', [
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    { encoding: 'jsonParsed', filters: [{ memcmp: { offset: 0, bytes: RKUSOL_MINT } }] },
  ]);
  return (res as any[]) ?? [];
}

async function getRecentVolume(): Promise<number> {
  try {
    const sigs = (await fetchRpc('getSignaturesForAddress', [
      RKUSOL_MINT,
      { limit: 50 },
    ])) as Array<{ signature: string }> | undefined;

    if (!sigs || sigs.length === 0) return 0;

    let totalVolume = 0;

    const fetchBatches = async (batch: Array<{ signature: string }>) => {
      const results = await Promise.allSettled(
        batch.map(async (sig) => {
          try {
            const tx = (await fetchRpc('getTransaction', [
              sig.signature,
              { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 },
            ])) as any;
            if (!tx?.meta) return 0;

            const pre = tx.meta.preTokenBalances ?? [];
            const post = tx.meta.postTokenBalances ?? [];
            let vol = 0;
            for (const bal of [...pre, ...post]) {
              if (bal.mint === RKUSOL_MINT) {
                vol += Math.abs(bal?.uiTokenAmount?.uiAmount ?? 0);
              }
            }
            return vol / 2; // /2 for pre+post counting
          } catch {
            return 0;
          }
        })
      );
      return results.reduce((sum, r) => sum + (r.status === 'fulfilled' ? r.value : 0), 0);
    };

    for (let i = 0; i < sigs.length; i += CONCURRENCY) {
      totalVolume += await fetchBatches(sigs.slice(i, i + CONCURRENCY));
    }

    return Math.round(totalVolume * 100) / 100;
  } catch {
    return 0;
  }
}

// Get points distribution by bucketing leaderboard entries
async function getPointsDistribution(): Promise<Array<{ label: string; value: number }>> {
  try {
    const accounts = await getProgramAccounts();
    const holders: Array<{ amount: number }> = [];
    for (const acc of accounts) {
      const amount = acc?.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0;
      if (amount > 0) holders.push({ amount });
    }

    // Estimate points for bucketing (using 26 days as rough average)
    const brackets: Array<{ label: string; min: number; max: number; value: number }> = [
      { label: '0-100', min: 0, max: 100, value: 0 },
      { label: '100-500', min: 100, max: 500, value: 0 },
      { label: '500-1K', min: 500, max: 1000, value: 0 },
      { label: '1K-5K', min: 1000, max: 5000, value: 0 },
      { label: '5K-10K', min: 5000, max: 10000, value: 0 },
      { label: '10K-50K', min: 10000, max: 50000, value: 0 },
      { label: '50K+', min: 50000, max: Infinity, value: 0 },
    ];

    for (const h of holders) {
      const pts = Math.floor(h.amount * 26 * POINTS_PER_SOL_PER_DAY);
      for (const bracket of brackets) {
        if (pts >= bracket.min && pts < bracket.max) {
          bracket.value++;
          break;
        }
      }
      // Handle 50K+ edge case
      if (pts >= 50000) {
        brackets[brackets.length - 1].value++;
        brackets[5].value--; // remove from 10K-50K since we double-counted
      }
    }

    return brackets.map(({ label, value }) => ({ label, value }));
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const [prices, supply, volume, distribution, accounts] = await Promise.all([
      getPrices(),
      getTokenSupply(),
      getRecentVolume(),
      getPointsDistribution(),
      getProgramAccounts(),
    ]);

    const rkuSOLPriceUsd = prices.rkusol;
    const solPriceUsd = prices.sol;
    const exchangeRate = solPriceUsd > 0 ? rkuSOLPriceUsd / solPriceUsd : 1.0088;
    const totalSolStaked = supply * exchangeRate;
    const tvlUsd = supply * rkuSOLPriceUsd;

    // Holder count
    let holderCount = 0;
    for (const acc of accounts) {
      const amount = acc?.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0;
      if (amount > 0) holderCount++;
    }

    return NextResponse.json({
      tvl: {
        current: Math.round(tvlUsd * 100) / 100,
        supply,
        price: rkuSOLPriceUsd,
      },
      volume: {
        recent: volume,
        recentSolValue: Math.round(volume * exchangeRate * 100) / 100,
      },
      apy: {
        current: 4.25,
        exchangeRate: Math.round(exchangeRate * 100000) / 100000,
      },
      holders: holderCount,
      pointsDistribution: distribution,
      computedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 200 });
  }
}
