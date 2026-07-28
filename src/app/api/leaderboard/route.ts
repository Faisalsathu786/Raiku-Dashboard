import { NextRequest, NextResponse } from 'next/server';

const RKUSOL_MINT = 'rkubjTrZYioRSeXwDnhwGQzvW3qkcin72JSxUt3WMVp';
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const POINTS_PER_SOL_PER_DAY = 1;
const CONCURRENCY = 5;
const PAGE_SIZE = 1000;
const MAX_PAGES = 3; // safety: stop after 3000 sigs per account
const RPC_TIMEOUT_MS = 6000;

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
        filters: [{ memcmp: { offset: 0, bytes: RKUSOL_MINT } }],
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

/** Fetch the TRUE oldest signature blockTime with pagination */
async function getOldestBlockTime(tokenAccountPubkey: string): Promise<number | null> {
  let beforeSig: string | undefined;
  let pages = 0;
  let oldestBlockTime: number | null = null;

  while (pages < MAX_PAGES) {
    pages++;
    const params: any = {
      limit: PAGE_SIZE,
    };
    if (beforeSig) params.before = beforeSig;

    try {
      const sigs = (await fetchRpc('getSignaturesForAddress', [
        tokenAccountPubkey,
        params,
      ])) as Array<{ signature: string; blockTime: number | null }> | undefined;

      if (!sigs || sigs.length === 0) {
        // No more sigs — oldestBlockTime from previous page is the real oldest
        break;
      }

      // Remember blockTime of the oldest sig in this batch
      const batchOldest = sigs[sigs.length - 1];
      if (batchOldest.blockTime != null) {
        oldestBlockTime = batchOldest.blockTime;
      }

      // If less than full page, we've reached the beginning
      if (sigs.length < PAGE_SIZE) {
        break;
      }

      // Full page — paginate deeper
      beforeSig = sigs[sigs.length - 1].signature;
    } catch {
      break; // RPC error — return what we have
    }
  }

  return oldestBlockTime;
}

/** Retry a promise up to N times on failure */
async function retry<T>(fn: () => Promise<T>, attempts: number): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 200));
    }
  }
  throw lastErr;
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
    allHolders.sort((a, b) => b.amount - a.amount);

    const topHolders = allHolders.slice(0, limit);
    const now = Date.now() / 1000;

    // Fetch true oldest blockTime for each holder with pagination + retry
    const btMap = new Map<string, number | null>();

    for (let i = 0; i < topHolders.length; i += CONCURRENCY) {
      const batch = topHolders.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(async (h) => {
          const bt = await retry(() => getOldestBlockTime(h.pubkey), 2);
          return { owner: h.owner, bt };
        })
      );
      for (const r of results) {
        if (r.status === 'fulfilled') {
          btMap.set(r.value.owner, r.value.bt);
        }
      }
    }

    // Compute entries
    let daysSinceLaunch = 26;
    const entries: HolderEntry[] = [];

    for (let i = 0; i < topHolders.length; i++) {
      const h = topHolders[i];
      const oldestBt = btMap.get(h.owner) ?? null;

      let daysHeld: number;
      if (oldestBt) {
        daysHeld = Math.max(1, Math.floor((now - oldestBt) / 86_400));
        if (oldestBt < (now - daysSinceLaunch * 86_400)) {
          daysSinceLaunch = Math.max(1, Math.floor((now - oldestBt) / 86_400));
        }
      } else {
        daysHeld = daysSinceLaunch;
      }

      entries.push({
        rank: 0,
        walletAddress: h.owner,
        solStaked: h.amount,
        estimatedPoints: Math.floor(h.amount * daysHeld * POINTS_PER_SOL_PER_DAY),
        daysHeld,
        firstStakedAt: oldestBt ? new Date(oldestBt * 1000).toISOString() : null,
      });
    }

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
