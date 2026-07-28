import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';

const RKUSOL_MINT = 'rkubjTrZYioRSeXwDnhwGQzvW3qkcin72JSxUt3WMVp';
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const POINTS_PER_SOL_PER_DAY = 1;
const CONCURRENCY = 8;

async function fetchRpc(method: string, params: unknown[]) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(SOLANA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: controller.signal,
      next: { revalidate: 10 },
    });
    return (await res.json())?.result;
  } finally { clearTimeout(timeout); }
}

// ── Method A: getProgramAccounts (fast, finds 900+ holders, balance is generally correct) ──
async function discoverAll(): Promise<Array<{ pubkey: string; owner: string; amount: number }>> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetchRpc('getProgramAccounts', [
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        { encoding: 'jsonParsed', filters: [{ memcmp: { offset: 0, bytes: RKUSOL_MINT } }] },
      ]);
      const list: Array<{ pubkey: string; owner: string; amount: number }> = [];
      for (const acc of (res as any[]) ?? []) {
        const info = acc?.account?.data?.parsed?.info;
        if (!info) continue;
        const amt = info?.tokenAmount?.uiAmount ?? 0;
        const owner = info?.owner ?? '';
        if (owner && amt > 0) list.push({ pubkey: acc.pubkey, owner, amount: amt });
      }
      if (list.length >= 400 || attempt >= 3) return list;
      await new Promise((r) => setTimeout(r, 500));
    } catch {
      if (attempt >= 3) return [];
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return [];
}

// ── Method B: getTokenLargestAccounts (authoritative top 20) ──
async function getLargest(): Promise<Array<{ pubkey: string; owner: string; amount: number }>> {
  const results: Array<{ pubkey: string; owner: string; amount: number }> = [];
  try {
    const top = (await fetchRpc('getTokenLargestAccounts', [RKUSOL_MINT])) as
      Array<{ address: string; uiAmount: number }> | undefined;
    if (!top) return results;

    for (let i = 0; i < top.length; i += CONCURRENCY) {
      const batch = top.slice(i, i + CONCURRENCY);
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
  } catch { /* partial */ }
  return results;
}

// ── Quickly verify a single balance ──
async function verifyOne(pubkey: string): Promise<number | null> {
  try {
    const res = await fetchRpc('getTokenAccountBalance', [pubkey]);
    return res?.value?.uiAmount ?? null;
  } catch { return null; }
}

// ── Paginated oldest blockTime ──
async function getOldestBlockTime(pubkey: string): Promise<number | null> {
  let beforeSig: string | undefined;
  let oldest: number | null = null;
  for (let p = 0; p < 3; p++) {
    const params: any = { limit: 1000 };
    if (beforeSig) params.before = beforeSig;
    try {
      const sigs = (await fetchRpc('getSignaturesForAddress', [pubkey, params])) as
        Array<{ signature: string; blockTime: number | null }> | undefined;
      if (!sigs || sigs.length === 0) break;
      const batchOldest = sigs[sigs.length - 1];
      if (batchOldest.blockTime != null) oldest = batchOldest.blockTime;
      if (sigs.length < 1000) break;
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
    // ── Phase 1: Gather candidates from both methods ──
    const [allPgm, largest] = await Promise.all([discoverAll(), getLargest()]);

    // Build map: owner → { pubkey, amount }
    // Priority: largest accounts override program accounts
    const holderMap = new Map<string, { pubkey: string; amount: number }>();

    // Insert from program accounts first (these provide the broadest coverage)
    for (const h of allPgm) {
      if (!holderMap.has(h.owner) || h.amount > (holderMap.get(h.owner)?.amount ?? 0)) {
        holderMap.set(h.owner, { pubkey: h.pubkey, amount: h.amount });
      }
    }

    // Override with getTokenLargestAccounts data (authoritative amounts)
    for (const l of largest) {
      const existing = holderMap.get(l.owner);
      // If this largest account has a HIGHER balance than what we found, update
      if (!existing || l.amount > existing.amount) {
        holderMap.set(l.owner, { pubkey: l.pubkey, amount: l.amount });
      }
    }

    // Build sorted list by balance descending
    const allHolders: Array<{ owner: string; pubkey: string; amount: number }> = [];
    for (const [owner, info] of holderMap) {
      allHolders.push({ owner, pubkey: info.pubkey, amount: info.amount });
    }
    allHolders.sort((a, b) => b.amount - a.amount);

    // ── Phase 2: Verify top N holders (re-check balance for accuracy) ──
    const verifyCount = Math.min(limit + 20, allHolders.length);
    const verified = new Map<string, number>();
    const verifyTargets = allHolders.slice(0, verifyCount);

    for (let i = 0; i < verifyTargets.length; i += CONCURRENCY) {
      const batch = verifyTargets.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(async (h) => {
          const bal = await verifyOne(h.pubkey);
          return { owner: h.owner, balance: bal ?? h.amount };
        })
      );
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value.balance > 0) {
          verified.set(r.value.owner, r.value.balance);
        }
      }
    }

    // If some top holders failed verification, keep their program-accounts balance as fallback
    for (const h of verifyTargets) {
      if (!verified.has(h.owner)) {
        // Also try deriving ATA and checking that
        try {
          const wallet = new PublicKey(h.owner);
          const mint = new PublicKey(RKUSOL_MINT);
          const tokenProg = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
          const ataProg = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
          const [ata] = PublicKey.findProgramAddressSync(
            [wallet.toBuffer(), tokenProg.toBuffer(), mint.toBuffer()], ataProg
          );
          if (ata.toBase58() !== h.pubkey) {
            const altBal = await verifyOne(ata.toBase58());
            if (altBal != null && altBal > 0) {
              verified.set(h.owner, altBal);
              continue;
            }
          }
        } catch { /* skip */ }
        // Fallback: use original amount from getProgramAccounts
        if (h.amount > 0) verified.set(h.owner, h.amount);
      }
    }

    if (verified.size === 0) {
      return NextResponse.json({ entries: [], total: 0, error: 'No holders found' }, { status: 200 });
    }

    // ── Phase 3: Build final list with verified balances ──
    const now = Date.now() / 1000;
    const finalHolders: Array<{ owner: string; pubkey: string; amount: number }> = [];

    for (const h of allHolders) {
      const bal = verified.get(h.owner);
      if (bal != null && bal > 0) {
        finalHolders.push({ ...h, amount: bal });
      }
    }
    finalHolders.sort((a, b) => b.amount - a.amount);
    const topFinal = finalHolders.slice(0, limit);

    // ── Phase 4: Get oldest blockTime ──
    const btMap = new Map<string, number | null>();
    for (let i = 0; i < topFinal.length; i += CONCURRENCY) {
      const batch = topFinal.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(async (h) => {
          try {
            const bt = await getOldestBlockTime(h.pubkey);
            return { owner: h.owner, bt };
          } catch { return { owner: h.owner, bt: null }; }
        })
      );
      for (const r of results) {
        if (r.status === 'fulfilled') btMap.set(r.value.owner, r.value.bt);
      }
    }

    // ── Phase 5: Entries ──
    const entries: HolderEntry[] = [];
    let daysSinceLaunch = 26;

    for (const h of topFinal) {
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
      total: finalHolders.length,
      daysSinceLaunch,
      computedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ entries: [], total: 0, error: message }, { status: 200 });
  }
}
