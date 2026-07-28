import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';

const RKUSOL_MINT = 'rkubjTrZYioRSeXwDnhwGQzvW3qkcin72JSxUt3WMVp';
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const POINTS_PER_SOL_PER_DAY = 1;
const CONCURRENCY = 5;
const PAGE_SIZE = 1000;
const MAX_PAGES = 3;
const RPC_TIMEOUT_MS = 8000;
const MIN_EXPECTED_HOLDERS = 800;

let _mintDecimals: number | null = null;

async function fetchRpc(method: string, params: unknown[]) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
  try {
    const res = await fetch(SOLANA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: controller.signal,
      next: { revalidate: 10 },
    });
    const data = await res.json();
    return data?.result;
  } finally {
    clearTimeout(timeout);
  }
}

/** Get token account pubkey for a wallet (derived ATA) */
function deriveAta(owner: string): string | null {
  try {
    const wallet = new PublicKey(owner);
    const mint = new PublicKey(RKUSOL_MINT);
    const tokenProg = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    const ataProg = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
    const [ata] = PublicKey.findProgramAddressSync(
      [wallet.toBuffer(), tokenProg.toBuffer(), mint.toBuffer()],
      ataProg
    );
    return ata.toBase58();
  } catch { return null; }
}

// ── Holder discovery via getProgramAccounts + fallback ──

async function discoverHolders(): Promise<Array<{ pubkey: string; owner: string }>> {
  // Retry up to 3 times, requiring MIN_EXPECTED_HOLDERS
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetchRpc('getProgramAccounts', [
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        {
          encoding: 'jsonParsed',
          filters: [{ memcmp: { offset: 0, bytes: RKUSOL_MINT } }],
        },
      ]);
      const accounts = (res as any[]) ?? [];
      const discovered: Array<{ pubkey: string; owner: string }> = [];
      for (const acc of accounts) {
        const info = acc?.account?.data?.parsed?.info;
        if (!info) continue;
        const uiAmt = info?.tokenAmount?.uiAmount ?? 0;
        const owner = info?.owner ?? '';
        if (owner && uiAmt > 0) {
          discovered.push({ pubkey: acc.pubkey, owner });
        }
      }
      if (discovered.length >= MIN_EXPECTED_HOLDERS || attempt >= 3) {
        return discovered;
      }
      // Too few — wait and retry
      await new Promise((r) => setTimeout(r, 500));
    } catch {
      if (attempt >= 3) return [];
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return [];
}

/** Also try getTokenLargestAccounts for authoritative top holders */
async function getLargestAccounts(): Promise<Map<string, { pubkey: string; amount: number }>> {
  const map = new Map<string, { pubkey: string; amount: number }>();
  try {
    const res = (await fetchRpc('getTokenLargestAccounts', [RKUSOL_MINT])) as
      Array<{ address: string; amount: string; decimals: number; uiAmount: number | null }> | undefined;
    if (!res) return map;
    for (const entry of res) {
      if (entry.uiAmount && entry.uiAmount > 0) {
        // We only have token account, need to find owner
        map.set(entry.address, { pubkey: entry.address, amount: entry.uiAmount });
      }
    }
  } catch { /* ignore */ }
  return map;
}

/** Get the actual owner of a token account */
async function getTokenAccountOwner(tokenAccount: string): Promise<string | null> {
  try {
    const info = await fetchRpc('getAccountInfo', [tokenAccount, { encoding: 'jsonParsed' }]);
    return info?.data?.parsed?.info?.owner ?? null;
  } catch { return null; }
}

/** Verify balance with a direct getTokenAccountBalance call */
async function verifyBalance(tokenAccountPubkey: string): Promise<number | null> {
  try {
    const res = await fetchRpc('getTokenAccountBalance', [tokenAccountPubkey]);
    return res?.value?.uiAmount ?? null;
  } catch { return null; }
}

/** Paginated oldest blockTime */
async function getOldestBlockTime(pubkey: string): Promise<number | null> {
  let beforeSig: string | undefined;
  let pages = 0;
  let oldest: number | null = null;
  while (pages < MAX_PAGES) {
    pages++;
    const params: any = { limit: PAGE_SIZE };
    if (beforeSig) params.before = beforeSig;
    try {
      const sigs = (await fetchRpc('getSignaturesForAddress', [
        pubkey, params,
      ])) as Array<{ signature: string; blockTime: number | null }> | undefined;
      if (!sigs || sigs.length === 0) break;
      const batchOldest = sigs[sigs.length - 1];
      if (batchOldest.blockTime != null) oldest = batchOldest.blockTime;
      if (sigs.length < PAGE_SIZE) break;
      beforeSig = sigs[sigs.length - 1].signature;
    } catch { break; }
  }
  return oldest;
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
    // Step 1: Discover all holders (getProgramAccounts — may have stale balances)
    const discovered = await discoverHolders();

    // Step 2: Also fetch getTokenLargestAccounts for authoritative top holders
    const largestMap = await getLargestAccounts();

    // Step 3: Build a deduplicated list — prefer token accounts from getProgramAccounts
    // but cross-reference with largestMap for completeness
    const seenTokens = new Set<string>();
    const allEntries: Array<{ pubkey: string; owner: string }> = [];

    // First: add from largest accounts (need to resolve owner)
    for (const [tokenAcc, entry] of largestMap) {
      if (seenTokens.has(tokenAcc)) continue;
      seenTokens.add(tokenAcc);
      // Resolve owner — getAccountInfo or look up from discovered
      const existing = discovered.find((d) => d.pubkey === tokenAcc);
      const owner = existing?.owner || (await getTokenAccountOwner(tokenAcc));
      if (owner) {
        allEntries.push({ pubkey: tokenAcc, owner });
      }
    }

    // Second: add any accounts from discovered that aren't in largest
    for (const d of discovered) {
      if (seenTokens.has(d.pubkey)) continue;
      seenTokens.add(d.pubkey);
      allEntries.push({ pubkey: d.pubkey, owner: d.owner });
    }

    if (allEntries.length === 0) {
      return NextResponse.json({ entries: [], total: 0, error: 'No holders found' }, { status: 200 });
    }

    // Step 4: Verify balance for ALL discovered holders via live getTokenAccountBalance
    // This is the KEY fix — getProgramAccounts balance is unreliable
    const verifiedBalances = new Map<string, number>();
    for (let i = 0; i < allEntries.length; i += CONCURRENCY) {
      const batch = allEntries.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(async (h) => {
          const balance = await verifyBalance(h.pubkey);
          return { pubkey: h.pubkey, owner: h.owner, balance };
        })
      );
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value.balance != null && r.value.balance > 0) {
          verifiedBalances.set(r.value.owner, r.value.balance);
        }
      }
    }

    // Build holder list from verified balances only
    const now = Date.now() / 1000;
    const holderList: Array<{ owner: string; pubkey: string; amount: number }> = [];
    for (const h of allEntries) {
      const balance = verifiedBalances.get(h.owner);
      if (balance != null && balance > 0) {
        holderList.push({ owner: h.owner, pubkey: h.pubkey, amount: balance });
      }
    }

    // Sort by balance descending, take top N
    holderList.sort((a, b) => b.amount - a.amount);
    const topHolders = holderList.slice(0, limit);

    // Step 5: Get oldest blockTime for days calculation
    const btMap = new Map<string, number | null>();
    for (let i = 0; i < topHolders.length; i += CONCURRENCY) {
      const batch = topHolders.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(async (h) => {
          let bt: number | null = null;
          try {
            bt = await getOldestBlockTime(h.pubkey);
          } catch { /* use null fallback */ }
          return { owner: h.owner, bt };
        })
      );
      for (const r of results) {
        if (r.status === 'fulfilled') {
          btMap.set(r.value.owner, r.value.bt);
        }
      }
    }

    // Step 6: Compute entries
    const entries: HolderEntry[] = [];
    let daysSinceLaunch = 26;

    for (let i = 0; i < topHolders.length; i++) {
      const h = topHolders[i];
      const oldestBt = btMap.get(h.owner) ?? null;

      let daysHeld: number;
      if (oldestBt) {
        daysHeld = Math.max(1, Math.floor((now - oldestBt) / 86_400));
        const launchTime = now - daysSinceLaunch * 86_400;
        if (oldestBt < launchTime) {
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

    // Sort and rank
    const sortKey = sortBy === 'points' ? 'estimatedPoints' as const : 'solStaked' as const;
    entries.sort((a, b) => b[sortKey] - a[sortKey]);
    entries.forEach((e, i) => { e.rank = i + 1; });

    return NextResponse.json({
      entries,
      total: holderList.length,
      daysSinceLaunch,
      computedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ entries: [], total: 0, error: message }, { status: 200 });
  }
}
