import { NextResponse } from 'next/server';

const RKUSOL_MINT = 'rkubjTrZYioRSeXwDnhwGQzvW3qkcin72JSxUt3WMVp';
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const LIMIT = 8;
const PARALLEL_BATCH = 4;

async function fetchRpc(method: string, params: unknown[]) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(SOLANA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: controller.signal,
      next: { revalidate: 30 },
    });
    const data = await res.json();
    return data?.result;
  } finally {
    clearTimeout(timeout);
  }
}

interface RawEvent {
  signature: string;
  tokenAccount: string;
  type: 'stake' | 'unstake';
  amount: number;
  blockTime: number;
}

export async function GET() {
  try {
    const sigs = (await fetchRpc('getSignaturesForAddress', [
      RKUSOL_MINT,
      { limit: LIMIT },
    ])) as Array<{ signature: string }> | undefined;

    if (!sigs || sigs.length === 0) {
      return NextResponse.json({ activity: [] });
    }

    const rawEvents: RawEvent[] = [];

    // Fetch transactions in parallel batches
    for (let i = 0; i < sigs.length; i += PARALLEL_BATCH) {
      const batch = sigs.slice(i, i + PARALLEL_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (sig) => {
          try {
            const tx = (await fetchRpc('getTransaction', [
              sig.signature,
              { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 },
            ])) as any;

            if (!tx?.meta) return [];

            const pre = tx.meta.preTokenBalances ?? [];
            const post = tx.meta.postTokenBalances ?? [];
            const blockTime = tx.blockTime ?? 0;
            const batchEvents: RawEvent[] = [];

            for (const postBal of post) {
              if (postBal.mint !== RKUSOL_MINT) continue;
              if (!postBal.uiTokenAmount) continue;

              const preBal = pre.find(
                (p: any) => p.accountIndex === postBal.accountIndex
              );
              const preAmt = preBal?.uiTokenAmount?.uiAmount ?? 0;
              const postAmt = postBal.uiTokenAmount.uiAmount ?? 0;
              const diff = postAmt - preAmt;
              if (Math.abs(diff) < 0.0001) continue;

              const accountKey: string =
                tx.transaction?.message?.accountKeys?.[postBal.accountIndex] ?? '';

              batchEvents.push({
                signature: sig.signature,
                tokenAccount: accountKey || '',
                type: diff > 0 ? 'stake' : 'unstake',
                amount: Math.abs(diff),
                blockTime,
              });
            }

            // pre-only entries (account emptied)
            for (const preBal of pre) {
              if (preBal.mint !== RKUSOL_MINT) continue;
              if (post.find((p: any) => p.accountIndex === preBal.accountIndex)) continue;
              const preAmt = preBal.uiTokenAmount?.uiAmount ?? 0;
              if (preAmt <= 0) continue;

              const accountKey: string =
                tx.transaction?.message?.accountKeys?.[preBal.accountIndex] ?? '';

              batchEvents.push({
                signature: sig.signature,
                tokenAccount: accountKey || '',
                type: 'unstake',
                amount: preAmt,
                blockTime,
              });
            }

            return batchEvents;
          } catch {
            return [];
          }
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          rawEvents.push(...result.value);
        }
      }
    }

    // Deduplicate
    const seen = new Set<string>();
    const deduped = rawEvents.filter((e) => {
      const key = e.signature + e.tokenAccount;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Resolve token accounts to wallet owners (parallel batch)
    const uniqueTokenAccounts = [...new Set(deduped.map((e) => e.tokenAccount))];
    const ownerResults = await Promise.allSettled(
      uniqueTokenAccounts.slice(0, 20).map(async (addr) => {
        try {
          const info = (await fetchRpc('getAccountInfo', [
            addr,
            { encoding: 'jsonParsed' },
          ])) as any;
          return {
            account: addr,
            owner: info?.value?.data?.parsed?.info?.owner ?? addr,
          };
        } catch {
          return { account: addr, owner: addr };
        }
      })
    );

    const ownerMap = new Map<string, string>();
    for (const r of ownerResults) {
      if (r.status === 'fulfilled') ownerMap.set(r.value.account, r.value.owner);
    }

    const events = deduped
      .map((e) => ({
        signature: e.signature,
        tokenAccount: e.tokenAccount,
        walletAddress: ownerMap.get(e.tokenAccount) || '',
        type: e.type,
        amount: e.amount,
        timestamp: new Date(e.blockTime * 1000).toISOString(),
        blockTime: e.blockTime,
      }))
      .sort((a, b) => b.blockTime - a.blockTime)
      .slice(0, 10);

    return NextResponse.json({ activity: events, total: events.length });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch activity';
    return NextResponse.json({ activity: [], total: 0, error: message });
  }
}
