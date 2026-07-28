import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';

const RKUSOL_MINT = 'rkubjTrZYioRSeXwDnhwGQzvW3qkcin72JSxUt3WMVp';
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const POINTS_PER_SOL_PER_DAY = 1;
const CONCURRENCY = 10;
const PAGE_SIZE = 1000;
const MAX_PAGES = 3;
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
      next: { revalidate: 10 },
    });
    const data = await res.json();
    return data?.result;
  } finally {
    clearTimeout(timeout);
  }
}

function deriveAta(owner: string): string | null {
  try {
    const wallet = new PublicKey(owner);
    const mint = new PublicKey(RKUSOL_MINT);
    const tokenProg = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    const ataProg = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
    const [ata] = PublicKey.findProgramAddressSync(
      [wallet.toBuffer(), tokenProg.toBuffer(), mint.toBuffer()], ataProg
    );
    return ata.toBase58();
  } catch { return null; }
}

// ── Step 1: Get all token accounts from getProgramAccounts ──

async function discoverAllAccounts(): Promise<Array<{ pubkey: string; owner: string }>> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetchRpc('getProgramAccounts', [
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        { encoding: 'jsonParsed', filters: [{ memcmp: { offset: 0, bytes: RKUSOL_MINT } }] },
      ]);
      const accounts = (res as any[]) ?? [];
      const result: Array<{ pubkey: string; owner: string }> = [];
      for (const acc of accounts) {
        const info = acc?.account?.data?.parsed?.info;
        if (!info) continue;
        const uiAmt = info?.tokenAmount?.uiAmount ?? 0;
        const owner = info?.owner ?? '';
        if (owner && uiAmt > 0) result.push({ pubkey: acc.pubkey, owner });
      }
      if (result.length >= 400 || attempt >= 3) return result;
      await new Promise((r) => setTimeout(r, 500));
    } catch {
      if (attempt >= 3) return [];
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return [];
}

// ── Step 2: Get authoritative top 20 from getTokenLargestAccounts ──

async function getLargestWithOwners(): Promise<Array<{ pubkey: string; owner: string; amount: number }>> {
  const results: Array<{ pubkey: string; owner: string; amount: number }> = [];
  try {
    const res = (await fetchRpc('getTokenLargestAccounts', [RKUSOL_MINT])) as
      Array<{ address: string; uiAmount: number }> | undefined;
    if (!res) return results;

    for (let i = 0; i < res.length; i += CONCURRENCY) {
      const batch = res.slice(i, i + CONCURRENCY);
      const owners = await Promise.allSettled(
        batch.map(async (entry) => {
          if (!entry.uiAmount || entry.uiAmount <= 0) return null;
          const acct = await fetchRpc('getAccountInfo', [entry.address, { encoding: 'jsonParsed' }]);
          const owner: string | null = acct?.data?.parsed?.info?.owner ?? null;
          return owner ? { pubkey: entry.address, owner, amount: entry.uiAmount } : null;
        })
      );
      for (const r of owners) {
        if (r.status === 'fulfilled' && r.value) results.push(r.value);
      }
    }
  } catch { /* partial ok */ }
  return results;
}

// ── Step 3: Quick verify a single balance ──

async function verifyBalance(pubkey: string): Promise<number | null> {
  try {
    const res = await fetchRpc('getTokenAccountBalance', [pubkey]);
    return res?.value?.uiAmount ?? null;
  } catch { return null; }
}

// ── Step 4: Oldest blockTime (paginated) ──

async function getOldestBlockTime(pubkey: string): Promise<number | null> {
  let beforeSig: string | undefined;
  let pages = 0;
  let oldest: number | null = null;
  while (pages < MAX_PAGES) {
    pages++;
    const params: any = { limit: PAGE_SIZE };
    if (beforeSig) params.before = beforeSig;
    try {
      const sigs = (await fetchRpc('getSignaturesForAddress', [pubkey, params])) as
        Array<{ signature: string; blockTime: number | null }> | undefined;
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
    // ── Phase 1: Gather candidates ──

    // Method A: getProgramAccounts (broad but balance may be stale)
    const discovered = await discoverAllAccounts();
    // Method B: getTokenLargestAccounts (authoritative top 20)
    const largest = await getLargestWithOwners();

    // Merge: largest accounts override/join discovered
    // Build a map: wallet_address → token_pubkey from largest first (authoritative balance later)
    const walletToToken = new Map<string, string>();
    const seenPubkeys = new Set<string>();

    // Insert largest first so they take priority
    for (const l of largest) {
      walletToToken.set(l.owner, l.pubkey);
      seenPubkeys.add(l.pubkey);
    }

    // Add remaining from discovered
    for (const d of discovered) {
      if (!seenPubkeys.has(d.pubkey)) {
        if (!walletToToken.has(d.owner)) {
          walletToToken.set(d.owner, d.pubkey);
        }
        seenPubkeys.add(d.pubkey);
      }
    }

    // ── Phase 2: Verify balances (quick, top priority holders first) ──

    // Process in priority order: largest-accounts first, then by program-accounts order
    const priorityList: Array<{ owner: string; pubkey: string; priority: 'high' | 'normal' }> = [];
    for (const l of largest) {
      priorityList.push({ owner: l.owner, pubkey: l.pubkey, priority: 'high' });
    }
    for (const [owner, pubkey] of walletToToken) {
      if (!priorityList.some((p) => p.owner === owner)) {
        priorityList.push({ owner, pubkey, priority: 'normal' });
      }
    }

    // Verify balances — process high priority first
    const verified = new Map<string, number>();

    for (let i = 0; i < priorityList.length; i += CONCURRENCY) {
      const batch = priorityList.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(async (h) => {
          const bal = await verifyBalance(h.pubkey);
          return { owner: h.owner, balance: bal };
        })
      );
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value.balance != null && r.value.balance > 0) {
          verified.set(r.value.owner, r.value.balance);
        }
      }
      // If we've processed 200+ total accounts and found enough, stop early
      if (i + CONCURRENCY >= 200 && verified.size >= limit + 20) break;
    }

    if (verified.size === 0) {
      return NextResponse.json({ entries: [], total: 0, error: 'No verified holders' }, { status: 200 });
    }

    // ── Phase 3: Build sorted candidate list ──

    const candidates: Array<{ owner: string; pubkey: string; amount: number }> = [];
    for (const [owner, pubkey] of walletToToken) {
      const bal = verified.get(owner);
      if (bal != null && bal > 0) {
        candidates.push({ owner, pubkey, amount: bal });
      }
    }
    candidates.sort((a, b) => b.amount - a.amount);

    const topCandidates = candidates.slice(0, Math.max(limit, 30));
    const now = Date.now() / 1000;

    // ── Phase 4: Get oldest blockTime for days calculation ──

    const btMap = new Map<string, number | null>();
    for (let i = 0; i < topCandidates.length; i += CONCURRENCY) {
      const batch = topCandidates.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(async (h) => {
          let bt: number | null = null;
          try { bt = await getOldestBlockTime(h.pubkey); } catch { /* use null */ }
          return { owner: h.owner, bt };
        })
      );
      for (const r of results) {
        if (r.status === 'fulfilled') btMap.set(r.value.owner, r.value.bt);
      }
    }

    // ── Phase 5: Build final entries ──

    const entries: HolderEntry[] = [];
    let daysSinceLaunch = 26;

    for (const h of topCandidates) {
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

    const sortKey = sortBy === 'points' ? 'estimatedPoints' as const : 'solStaked' as const;
    entries.sort((a, b) => b[sortKey] - a[sortKey]);
    entries.forEach((e, i) => { e.rank = i + 1; });

    return NextResponse.json({
      entries,
      total: verified.size,
      daysSinceLaunch,
      computedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ entries: [], total: 0, error: message }, { status: 200 });
  }
}
