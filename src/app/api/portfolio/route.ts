import { NextRequest, NextResponse } from 'next/server';

const RKUSOL_MINT = 'rkubjTrZYioRSeXwDnhwGQzvW3qkcin72JSxUt3WMVp';
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const APY = 4.25;
const POINTS_PER_SOL_PER_DAY = 1;
const MAX_SIGS_PER_ACCOUNT = 200;

let priceCache: { sol: number; rkusol: number; ts: number } | null = null;

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

async function getPrices() {
  if (priceCache && Date.now() - priceCache.ts < 30_000) return priceCache;
  const [solR, rkusolR] = await Promise.all([
    fetch(`https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112`)
      .then((r) => r.json())
      .catch(() => ({})),
    fetch(`https://api.jup.ag/price/v2?ids=${RKUSOL_MINT}`)
      .then((r) => r.json())
      .catch(() => ({})),
  ]);
  priceCache = {
    sol: parseFloat(solR?.data?.['So11111111111111111111111111111111111111112']?.price ?? '0'),
    rkusol: parseFloat(rkusolR?.data?.[RKUSOL_MINT]?.price ?? '0'),
    ts: Date.now(),
  };
  return priceCache;
}

async function getTokenAccounts(wallet: string) {
  const res = (await fetchRpc('getTokenAccountsByOwner', [
    wallet,
    { mint: RKUSOL_MINT },
    { encoding: 'jsonParsed' },
  ])) as { value?: any[] };

  return (res?.value ?? [])
    .filter((a: any) => {
      const amt = a?.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0;
      return amt > 0;
    })
    .map((a: any) => ({
      pubkey: a.pubkey,
      owner: a?.account?.data?.parsed?.info?.owner ?? wallet,
      balance: a?.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0,
    }));
}

interface TxEvent {
  signature: string;
  blockTime: number;
  type: 'stake' | 'unstake';
  amount: number;
}

async function getAllSignatures(tokenAccounts: { pubkey: string }[]) {
  const seen = new Set<string>();
  const all: { signature: string; pubkey: string }[] = [];

  for (const acc of tokenAccounts) {
    try {
      const sigs = (await fetchRpc('getSignaturesForAddress', [
        acc.pubkey,
        { limit: MAX_SIGS_PER_ACCOUNT },
      ])) as Array<{ signature: string }> | undefined;

      if (!sigs) continue;
      for (const s of sigs) {
        if (!seen.has(s.signature)) {
          seen.add(s.signature);
          all.push({ signature: s.signature, pubkey: acc.pubkey });
        }
      }
    } catch {
      continue;
    }
  }

  return all;
}

async function parseTransaction(signature: string): Promise<TxEvent | null> {
  try {
    const tx = (await fetchRpc('getTransaction', [
      signature,
      { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 },
    ])) as any;

    if (!tx?.meta) return null;

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

      return {
        signature,
        blockTime,
        type: diff > 0 ? 'stake' : 'unstake',
        amount: Math.abs(diff),
      };
    }

    return null;
  } catch {
    return null;
  }
}

async function parseTransactions(
  signatures: { signature: string }[]
): Promise<TxEvent[]> {
  const events: TxEvent[] = [];
  for (let i = 0; i < signatures.length; i++) {
    // Throttle: 80ms delay per tx to avoid RPC rate limits
    if (i > 0) await new Promise((r) => setTimeout(r, 80));
    const event = await parseTransaction(signatures[i].signature);
    if (event) events.push(event);
  }
  return events;
}

interface PortfolioActivity {
  signature: string;
  timestamp: string;
  type: 'stake' | 'unstake';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  daysSinceLastEvent: number;
  pointsEarned: number;
}

interface PortfolioPeriod {
  from: string;
  to: string | null;
  balance: number;
  days: number;
  points: number;
}

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet');
  if (!wallet) {
    return NextResponse.json({ error: 'wallet address is required' }, { status: 400 });
  }

  try {
    const [tokenAccounts, prices] = await Promise.all([
      getTokenAccounts(wallet),
      getPrices(),
    ]);

    const exchangeRate = prices.sol > 0 ? prices.rkusol / prices.sol : 1.0082;
    const currentBalance = tokenAccounts.reduce((s, a) => s + a.balance, 0);

    // Get all signatures for all token accounts
    const allSigs = await getAllSignatures(tokenAccounts);

    if (allSigs.length === 0) {
      return NextResponse.json({
        walletAddress: wallet,
        currentBalance,
        solValue: currentBalance * exchangeRate,
        usdValue: currentBalance * exchangeRate * prices.sol,
        totalPoints: 0,
        estimatedRewards: 0,
        apy: APY,
        exchangeRate,
        daysSinceFirstStake: 0,
        activity: [] as PortfolioActivity[],
        periods: [] as PortfolioPeriod[],
        tokenAccounts: tokenAccounts.map((a) => ({
          address: a.pubkey,
          amount: a.balance,
        })),
      });
    }

    // Parse transactions to find rkuSOL events
    const events = await parseTransactions(allSigs);

    // Sort oldest first
    events.sort((a, b) => a.blockTime - b.blockTime);

    // Build timeline with running balance
    let balance = 0;
    let lastTimestamp = events.length > 0 ? events[0].blockTime * 1000 : Date.now();
    let totalPoints = 0;
    const activity: PortfolioActivity[] = [];
    const periods: PortfolioPeriod[] = [];

    for (const evt of events) {
      const eventTime = evt.blockTime * 1000;
      const days = (eventTime - lastTimestamp) / 86_400_000;
      const periodPoints = days > 0 && balance > 0 ? Math.floor(balance * days * POINTS_PER_SOL_PER_DAY) : 0;

      if (days > 0 && balance > 0) {
        totalPoints += periodPoints;
        periods.push({
          from: new Date(lastTimestamp).toISOString(),
          to: new Date(eventTime).toISOString(),
          balance,
          days: Math.round(days * 10) / 10,
          points: periodPoints,
        });
      }

      const balanceBefore = balance;
      balance += evt.type === 'stake' ? evt.amount : -evt.amount;
      balance = Math.max(0, Math.round(balance * 1e6) / 1e6);

      activity.push({
        signature: evt.signature,
        timestamp: new Date(eventTime).toISOString(),
        type: evt.type,
        amount: evt.amount,
        balanceBefore,
        balanceAfter: balance,
        daysSinceLastEvent: Math.round(days * 10) / 10,
        pointsEarned: periodPoints,
      });

      lastTimestamp = eventTime;
    }

    // Final period (from last event to now)
    const finalDays = (Date.now() - lastTimestamp) / 86_400_000;
    const finalPoints = balance > 0 ? Math.floor(balance * finalDays * POINTS_PER_SOL_PER_DAY) : 0;
    totalPoints += finalPoints;

    if (balance > 0 && finalDays > 0) {
      periods.push({
        from: new Date(lastTimestamp).toISOString(),
        to: null,
        balance,
        days: Math.round(finalDays * 10) / 10,
        points: finalPoints,
      });
    }

    const firstStakeTime = events.length > 0 ? events[0].blockTime : 0;
    const daysSinceFirstStake = firstStakeTime > 0
      ? Math.floor((Date.now() - firstStakeTime * 1000) / 86_400_000)
      : 0;
    const estimatedRewards = totalPoints * (APY / 100) * (POINTS_PER_SOL_PER_DAY / 365);

    return NextResponse.json({
      walletAddress: wallet,
      currentBalance,
      solValue: currentBalance * exchangeRate,
      usdValue: currentBalance * exchangeRate * prices.sol,
      totalPoints,
      estimatedRewards,
      apy: APY,
      exchangeRate,
      daysSinceFirstStake,
      firstStakedAt: firstStakeTime > 0 ? new Date(firstStakeTime * 1000).toISOString() : null,
      activity,
      periods,
      tokenAccounts: tokenAccounts.map((a) => ({
        address: a.pubkey,
        amount: a.balance,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch portfolio';
    return NextResponse.json(
      { error: message, walletAddress: wallet },
      { status: 200 }
    );
  }
}
