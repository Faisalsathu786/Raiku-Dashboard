import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';

const RKUSOL_MINT = 'rkubjTrZYioRSeXwDnhwGQzvW3qkcin72JSxUt3WMVp';
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const POINTS_PER_SOL_PER_DAY = 1;
const CONCURRENCY = 5;

let mintDecimals: number | null = null;

const SOLANA_RPC_FETCH = 'https://api.mainnet-beta.solana.com';

async function fetchRpc(method: string, params: unknown[]) {
  const res = await fetch(SOLANA_RPC_FETCH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    next: { revalidate: 30 },
  });
  const data = await res.json();
  return data?.result;
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

function deriveAtaAddress(ownerPubkey: string): string | null {
  try {
    const walletPubkey = new PublicKey(ownerPubkey);
    const mintPubkey = new PublicKey(RKUSOL_MINT);
    const tokenProgramId = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    const ataProgramId = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
    const [ata] = PublicKey.findProgramAddressSync(
      [walletPubkey.toBuffer(), tokenProgramId.toBuffer(), mintPubkey.toBuffer()],
      ataProgramId
    );
    return ata.toBase58();
  } catch {
    return null;
  }
}

/** Fetch the oldest signature blockTime for a token account ATA */
async function getOldestBlockTime(ataAddress: string): Promise<number | null> {
  try {
    // Get all signatures (max 1000), last one = oldest
    const sigs = (await fetchRpc('getSignaturesForAddress', [
      ataAddress,
      { limit: 1000 },
    ])) as Array<{ signature: string; blockTime: number | null }> | undefined;

    if (!sigs || sigs.length === 0) return null;

    // Last element = oldest signature
    const oldest = sigs[sigs.length - 1];
    return oldest.blockTime ?? null;
  } catch {
    return null;
  }
}

/** Run async tasks with concurrency limit */
async function mapConcurrent<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map((item, bIdx) => fn(item, i + bIdx)));
    results.push(...batchResults);
  }
  return results;
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
  const searchParams = request.nextUrl.searchParams;
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
  const sortBy = searchParams.get('sortBy') || 'sol';

  try {
    const accounts = await getProgramAccounts();

    // Parse holders with balance > 0
    const rawHolders: Array<{ address: string; amount: number }> = [];
    for (const acc of accounts) {
      const parsed = acc?.account?.data?.parsed;
      const info = parsed?.info;
      if (!info) continue;
      const amount = info?.tokenAmount?.uiAmount ?? 0;
      const owner = info?.owner ?? '';
      if (owner && amount > 0) {
        rawHolders.push({ address: owner, amount });
      }
    }

    // Sort by balance descending, take top N
    rawHolders.sort((a, b) => b.amount - a.amount);
    const topHolders = rawHolders.slice(0, limit);

    // Derive ATA addresses
    const holderAtaPairs = topHolders.map((h) => ({
      address: h.address,
      amount: h.amount,
      ata: deriveAtaAddress(h.address),
    }));

    // Fetch oldest blockTime for each holder (concurrent)
    const blockTimes = await mapConcurrent(
      holderAtaPairs,
      async (h) => {
        if (!h.ata) return { address: h.address, oldestBlockTime: null };
        const bt = await getOldestBlockTime(h.ata);
        return { address: h.address, oldestBlockTime: bt };
      },
      CONCURRENCY
    );

    const blockTimeMap = new Map<string, number | null>();
    for (const bt of blockTimes) {
      blockTimeMap.set(bt.address, bt.oldestBlockTime);
    }

    const now = Date.now() / 1000;

    const entries: HolderEntry[] = holderAtaPairs.map((h, i) => {
      const oldestBt = blockTimeMap.get(h.address);
      const daysHeld = oldestBt
        ? Math.max(0, Math.floor((now - oldestBt) / 86_400))
        : 0;
      const points = Math.floor(h.amount * Math.max(1, daysHeld) * POINTS_PER_SOL_PER_DAY);
      return {
        rank: i + 1,
        walletAddress: h.address,
        solStaked: h.amount,
        estimatedPoints: points,
        daysHeld,
        firstStakedAt: oldestBt ? new Date(oldestBt * 1000).toISOString() : null,
      };
    });

    if (sortBy === 'points') {
      entries.sort((a, b) => b.estimatedPoints - a.estimatedPoints);
      entries.forEach((e, i) => { e.rank = i + 1; });
    }

    // Compute days since launch for overall context
    let daysSinceLaunch = 26;
    if (entries.length > 0) {
      const firstEntry = entries.reduce((earliest, e) =>
        e.firstStakedAt && (!earliest.firstStakedAt || e.firstStakedAt < earliest.firstStakedAt) ? e : earliest
      );
      if (firstEntry.firstStakedAt) {
        const launchTime = new Date(firstEntry.firstStakedAt).getTime();
        daysSinceLaunch = Math.max(26, Math.floor((Date.now() - launchTime) / 86_400_000));
      }
    }

    return NextResponse.json({
      entries,
      total: entries.length,
      daysSinceLaunch,
      computedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch leaderboard';
    return NextResponse.json(
      { entries: [], total: 0, error: message },
      { status: 200 }
    );
  }
}
