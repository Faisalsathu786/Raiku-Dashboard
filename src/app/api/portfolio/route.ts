import { NextRequest, NextResponse } from 'next/server';

const RKUSOL_MINT = 'rkubjTrZYioRSeXwDnhwGQzvW3qkcin72JSxUt3WMVp';
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const APY = 4.25;
const POINTS_PER_SOL_PER_DAY = 1;

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

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet');
  if (!wallet) {
    return NextResponse.json({ error: 'wallet address is required' }, { status: 400 });
  }

  try {
    const accounts = (await fetchRpc('getTokenAccountsByOwner', [
      wallet,
      { mint: RKUSOL_MINT },
      { encoding: 'jsonParsed' },
    ])) as { value?: any[] };

    const tokenAccounts = (accounts?.value ?? [])
      .map((acc: any) => {
        const info = acc?.account?.data?.parsed?.info;
        if (!info) return null;
        return {
          address: acc.pubkey ?? info.owner ?? '',
          amount: info.tokenAmount?.uiAmount ?? 0,
          owner: info.owner ?? '',
        };
      })
      .filter((a: any) => a && a.amount > 0);

    const tokenAccountPubkeys = tokenAccounts.map((a: any) => a.address);
    const totalBalance = tokenAccounts.reduce((sum: number, a: any) => sum + a.amount, 0);

    if (totalBalance <= 0) {
      return NextResponse.json({
        walletAddress: wallet,
        rkusolBalance: 0,
        solValue: 0,
        usdValue: 0,
        daysHeld: 0,
        estimatedPoints: 0,
        estimatedRewards: 0,
        apy: APY,
        exchangeRate: 1,
        firstStakedAt: null,
        tokenAccounts: [],
      });
    }

    let earliestBlockTime: number | null = null;

    for (const pubkey of tokenAccountPubkeys) {
      try {
        const sigs = (await fetchRpc('getSignaturesForAddress', [
          pubkey,
          { limit: 1000 },
        ])) as Array<{ signature: string }> | undefined;

        if (!sigs || sigs.length === 0) continue;

        const oldestSig = sigs[sigs.length - 1].signature;
        const tx = (await fetchRpc('getTransaction', [
          oldestSig,
          { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 },
        ])) as { blockTime?: number } | undefined;

        if (tx?.blockTime) {
          if (earliestBlockTime === null || tx.blockTime < earliestBlockTime) {
            earliestBlockTime = tx.blockTime;
          }
        }
      } catch {
        continue;
      }
    }

    const now = Date.now();
    const daysHeld = earliestBlockTime
      ? Math.floor((now - earliestBlockTime * 1000) / 86_400_000)
      : 0;

    const [solPriceRes, rkuSOLPriceRes] = await Promise.all([
      fetch(`https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112`).then(r => r.json()).catch(() => ({})),
      fetch(`https://api.jup.ag/price/v2?ids=${RKUSOL_MINT}`).then(r => r.json()).catch(() => ({})),
    ]);

    const rkuSOLPrice = parseFloat(rkuSOLPriceRes?.data?.[RKUSOL_MINT]?.price ?? '0');
    const solPrice = parseFloat(solPriceRes?.data?.['So11111111111111111111111111111111111111112']?.price ?? '0');
    const exchangeRate = solPrice > 0 ? rkuSOLPrice / solPrice : 1.0082;
    const solValue = totalBalance * exchangeRate;
    const usdValue = solValue * solPrice;

    const estimatedPoints = Math.floor(totalBalance * daysHeld * POINTS_PER_SOL_PER_DAY);
    const estimatedRewards = totalBalance * (APY / 100) * (daysHeld / 365);

    return NextResponse.json({
      walletAddress: wallet,
      rkusolBalance: totalBalance,
      solValue,
      usdValue,
      daysHeld,
      estimatedPoints,
      estimatedRewards,
      apy: APY,
      exchangeRate,
      firstStakedAt: earliestBlockTime ? new Date(earliestBlockTime * 1000).toISOString() : null,
      tokenAccounts: tokenAccounts.map((a: any) => ({
        address: a.owner,
        amount: a.amount,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch portfolio';
    return NextResponse.json({ error: message, walletAddress: wallet }, { status: 500 });
  }
}
