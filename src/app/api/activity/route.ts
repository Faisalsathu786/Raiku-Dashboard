import { NextResponse } from 'next/server';

const RKUSOL_MINT = 'rkubjTrZYioRSeXwDnhwGQzvW3qkcin72JSxUt3WMVp';
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const LIMIT = 30;
const TX_DELAY_MS = 120;

async function fetchRpc(method: string, params: unknown[]) {
  const res = await fetch(SOLANA_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    next: { revalidate: 30 },
  });
  const data = await res.json();
  return data?.result;
}

// cache of token account -> owner, persists between requests
const ownerCache = new Map<string, string>();

async function getOwner(tokenAccount: string): Promise<string> {
  if (ownerCache.has(tokenAccount)) return ownerCache.get(tokenAccount)!;
  try {
    const info = (await fetchRpc('getAccountInfo', [
      tokenAccount,
      { encoding: 'jsonParsed' },
    ])) as any;
    const owner = info?.value?.data?.parsed?.info?.owner ?? tokenAccount;
    ownerCache.set(tokenAccount, owner);
    return owner;
  } catch {
    ownerCache.set(tokenAccount, tokenAccount);
    return tokenAccount;
  }
}

interface RkusolEvent {
  signature: string;
  tokenAccount: string;
  walletAddress: string;
  type: 'stake' | 'unstake';
  amount: number;
  timestamp: string;
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

    const rawEvents: Array<{
      signature: string;
      tokenAccount: string;
      type: 'stake' | 'unstake';
      amount: number;
      blockTime: number;
    }> = [];

    for (let i = 0; i < sigs.length; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, TX_DELAY_MS));

      try {
        const tx = (await fetchRpc('getTransaction', [
          sigs[i].signature,
          {
            encoding: 'jsonParsed',
            maxSupportedTransactionVersion: 0,
          },
        ])) as any;

        if (!tx?.meta) continue;

        const pre = tx.meta.preTokenBalances ?? [];
        const post = tx.meta.postTokenBalances ?? [];
        const blockTime = tx.blockTime ?? 0;

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

          // The account at this index is the token account
          const accountKey: string =
            tx.transaction?.message?.accountKeys?.[postBal.accountIndex] ??
            tx.transaction?.message?.instructions?.[0]?.accounts?.[postBal.accountIndex] ??
            '';

          rawEvents.push({
            signature: sigs[i].signature,
            tokenAccount: accountKey,
            type: diff > 0 ? 'stake' : 'unstake',
            amount: Math.abs(diff),
            blockTime,
          });
        }

        // Also check pre-only entries (burned all, so post has no entry)
        for (const preBal of pre) {
          if (preBal.mint !== RKUSOL_MINT) continue;
          const postBal = post.find(
            (p: any) => p.accountIndex === preBal.accountIndex
          );
          if (postBal) continue; // already handled above

          const preAmt = preBal.uiTokenAmount?.uiAmount ?? 0;
          if (preAmt <= 0) continue;

          const accountKey: string =
            tx.transaction?.message?.accountKeys?.[preBal.accountIndex] ?? '';

          rawEvents.push({
            signature: sigs[i].signature,
            tokenAccount: accountKey,
            type: 'unstake',
            amount: preAmt,
            blockTime,
          });
        }
      } catch {
        continue;
      }
    }

    // Deduplicate by signature (same tx can have multiple events for different accounts)
    const seen = new Set<string>();
    const deduped = rawEvents.filter((e) => {
      const key = e.signature + e.tokenAccount;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Batch resolve owners for unique token accounts
    const uniqueTokenAccounts = [...new Set(deduped.map((e) => e.tokenAccount))];
    for (const addr of uniqueTokenAccounts) {
      await getOwner(addr);
    }

    // Build final events
    const events: RkusolEvent[] = deduped
      .map((e) => ({
        ...e,
        walletAddress: ownerCache.get(e.tokenAccount) ?? e.tokenAccount,
        timestamp: new Date(e.blockTime * 1000).toISOString(),
      }))
      .sort((a, b) => b.blockTime - a.blockTime) // newest first
      .slice(0, 20);

    return NextResponse.json({ activity: events, total: events.length });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch activity';
    return NextResponse.json({ activity: [], total: 0, error: message });
  }
}
