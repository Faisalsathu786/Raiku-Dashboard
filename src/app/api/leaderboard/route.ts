import { NextRequest, NextResponse } from 'next/server';

const RKUSOL_MINT = 'rkubjTrZYioRSeXwDnhwGQzvW3qkcin72JSxUt3WMVp';
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const POINTS_PER_SOL_PER_DAY = 1;

let cachedDaysSinceLaunch: number | null = null;

async function getDaysSinceLaunch(): Promise<number> {
  if (cachedDaysSinceLaunch !== null) return cachedDaysSinceLaunch;

  try {
    const tokenAccounts = await getProgramAccounts();
    if (tokenAccounts.length > 0) {
      const firstAccountPubkey = tokenAccounts[0].pubkey;
      const sigs = (await fetchRpc('getSignaturesForAddress', [
        firstAccountPubkey,
        { limit: 1000 },
      ])) as Array<{ signature: string }> | undefined;

      if (sigs && sigs.length > 0) {
        const oldestSig = sigs[sigs.length - 1].signature;
        const tx = (await fetchRpc('getTransaction', [
          oldestSig,
          { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 },
        ])) as { blockTime?: number } | undefined;

        if (tx?.blockTime) {
          cachedDaysSinceLaunch = Math.floor(
            (Date.now() - tx.blockTime * 1000) / 86_400_000
          );
          return cachedDaysSinceLaunch ?? 26;
        }
      }
    }
  } catch {
    // fall through to default
  }

  cachedDaysSinceLaunch = 26;
  return cachedDaysSinceLaunch;
}

async function getProgramAccounts() {
  const res = await fetchRpc('getProgramAccounts', [
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    {
      encoding: 'jsonParsed',
      filters: [{ memcmp: { offset: 0, bytes: RKUSOL_MINT } }],
    },
  ]);
  return (res as any[]) ?? [];
}

async function fetchRpc(method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(SOLANA_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    next: { revalidate: 30 },
  });
  const data = await res.json();
  return data?.result;
}

interface HolderEntry {
  rank: number;
  walletAddress: string;
  solStaked: number;
  estimatedPoints: number;
  daysHeld: number;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
  const sortBy = searchParams.get('sortBy') || 'sol';

  try {
    const [daysSinceLaunch, accounts] = await Promise.all([
      getDaysSinceLaunch(),
      getProgramAccounts(),
    ]);

    const holders: Array<{ address: string; amount: number }> = [];
    for (const acc of accounts) {
      const parsed = acc?.account?.data?.parsed;
      const info = parsed?.info;
      if (!info) continue;
      const amount = info?.tokenAmount?.uiAmount ?? 0;
      const owner = info?.owner ?? '';
      if (owner && amount > 0) {
        holders.push({ address: owner, amount });
      }
    }

    holders.sort((a, b) => b.amount - a.amount);
    const topHolders = holders.slice(0, limit);

    const entries: HolderEntry[] = topHolders.map((h, i) => {
      const points = Math.floor(h.amount * daysSinceLaunch * POINTS_PER_SOL_PER_DAY);
      return {
        rank: i + 1,
        walletAddress: h.address,
        solStaked: h.amount,
        estimatedPoints: points,
        daysHeld: daysSinceLaunch,
      };
    });

    if (sortBy === 'points') {
      entries.sort((a, b) => b.estimatedPoints - a.estimatedPoints);
      entries.forEach((e, i) => {
        e.rank = i + 1;
      });
    }

    return NextResponse.json({
      entries,
      total: entries.length,
      daysSinceLaunch,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch leaderboard';
    return NextResponse.json(
      { entries: [], total: 0, error: message },
      { status: 200 }
    );
  }
}
