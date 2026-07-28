import { NextRequest, NextResponse } from 'next/server';

const RKUSOL_MINT = 'rkubjTrZYioRSeXwDnhwGQzvW3qkcin72JSxUt3WMVp';
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const POINTS_PER_SOL_PER_DAY = 1;
const CONCURRENCY = 6;
const RPC_TIMEOUT_MS = 5000;

async function fetchRpc(method: string, params: unknown[]) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
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

async function getProgramAccounts(): Promise<Array<{ pubkey: string; owner: string; amount: number }>> {
  try {
    const res = await fetchRpc('getProgramAccounts', [
      'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      {
        encoding: 'jsonParsed',
        filters: [
          { dataSize: 165 },
          { memcmp: { offset: 0, bytes: RKUSOL_MINT } },
        ],
      },
    ]);
    const accounts = (res as any[]) ?? [];
    const holders: Array<{ pubkey: string; owner: string; amount: number }> = [];
    for (const acc of accounts) {
      const info = acc?.account?.data?.parsed?.info;
      if (!info) continue;
      const amount = info?.tokenAmount?.uiAmount ?? 0;
      const owner = info?.owner ?? '';
      if (owner && amount > 0) {
        holders.push({ pubkey: acc.pubkey, owner, amount });
      }
    }
    return holders;
  } catch {
    return [];
  }
}

interface HolderEntry {
  rank: number;
  walletAddress: string;
  solStaked: number;
  estimatedPoints: number;
  daysHeld: number;
  firstStakedAt: string | null;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const limit = Math.min(parseInt(params.get('limit') || '50', 10), 100);
  const sortBy = params.get('sortBy') || 'sol';

  try {
    const allHolders = await getProgramAccounts();

    // Sort by balance descending
    allHolders.sort((a, b) => b.amount - a.amount);

    // Compute daysSinceLaunch from the oldest holder
    let daysSinceLaunch = 26;
    const now = Date.now() / 1000;

    // Fetch oldest blockTime for top N holders using the ACTUAL token account pubkey
    const topHolders = allHolders.slice(0, limit);

    // Fetch sigs in parallel batches with concurrency
    const sigResults = new Map<string, number | null>();

    for (let i = 0; i < topHolders.length; i += CONCURRENCY) {
      const batch = topHolders.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.allSettled(
        batch.map(async (h) => {
          try {
            const sigs = (await fetchRpc('getSignaturesForAddress', [
              h.pubkey,
              { limit: 1000 },
            ])) as Array<{ blockTime: number | null }> | undefined;
            if (!sigs || sigs.length === 0) return { owner: h.owner, bt: null };
            const oldest = sigs[sigs.length - 1];
            return { owner: h.owner, bt: oldest.blockTime ?? null };
          } catch {
            return { owner: h.owner, bt: null };
          }
        })
      );
      for (const r of batchResults) {
        if (r.status === 'fulfilled') {
          sigResults.set(r.value.owner, r.value.bt);
        }
      }
    }

    // Compute entries
    const entries: HolderEntry[] = [];

    for (let i = 0; i < topHolders.length; i++) {
      const h = topHolders[i];
      const oldestBt = sigResults.get(h.owner) ?? null;

      let daysHeld: number;
      if (oldestBt) {
        daysHeld = Math.max(1, Math.floor((now - oldestBt) / 86_400));
        // Track earliest for daysSinceLaunch
        if (oldestBt < (daysSinceLaunch === 26 ? Infinity : now - daysSinceLaunch * 86_400)) {
          daysSinceLaunch = Math.max(1, Math.floor((now - oldestBt) / 86_400));
        }
      } else {
        // Fallback: estimate from launch date
        daysHeld = daysSinceLaunch;
      }

      const points = Math.floor(h.amount * daysHeld * POINTS_PER_SOL_PER_DAY);

      entries.push({
        rank: 0,
        walletAddress: h.owner,
        solStaked: h.amount,
        estimatedPoints: points,
        daysHeld,
        firstStakedAt: oldestBt ? new Date(oldestBt * 1000).toISOString() : null,
      });
    }

    // Sort and assign ranks
    const sortKey = sortBy === 'points' ? 'estimatedPoints' as const : 'solStaked' as const;
    entries.sort((a, b) => b[sortKey] - a[sortKey]);
    entries.forEach((e, i) => { e.rank = i + 1; });

    return NextResponse.json({
      entries,
      total: allHolders.length,
      daysSinceLaunch,
      computedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ entries: [], total: 0, error: message }, { status: 200 });
  }
}
