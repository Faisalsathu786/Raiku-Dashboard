import { NextRequest, NextResponse } from 'next/server';

const RKUSOL_MINT = 'rkubjTrZYioRSeXwDnhwGQzvW3qkcin72JSxUt3WMVp';
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

const POINTS_PER_SOL_PER_DAY = 1;

interface HolderEntry {
  walletAddress: string;
  solStaked: number;
  estimatedPoints: number;
  rank: number;
}

async function fetchTopHolders(limit: number): Promise<HolderEntry[]> {
  const res = await fetch(SOLANA_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getProgramAccounts',
      params: [
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        {
          encoding: 'jsonParsed',
          filters: [
            {
              memcmp: {
                offset: 0,
                bytes: RKUSOL_MINT,
              },
            },
          ],
        },
      ],
    }),
    next: { revalidate: 60 },
  });

  const data = await res.json();
  const accounts = data?.result ?? [];

  const holders: Array<{ address: string; amount: number }> = [];

  for (const acc of accounts) {
    const parsed = acc?.account?.data?.parsed;
    const info = parsed?.info;
    if (!info) continue;
    const amount = info?.tokenAmount?.uiAmount ?? 0;
    const owner = info?.owner ?? '';
    if (owner && amount > 0) {
      holders.push({ address: owner, amount });
    }
  }

  holders.sort((a, b) => b.amount - a.amount);
  return holders.slice(0, limit).map((h, i) => ({
    rank: i + 1,
    walletAddress: h.address,
    solStaked: h.amount,
    estimatedPoints: Math.floor(h.amount * POINTS_PER_SOL_PER_DAY * 30),
  }));
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
  const sortBy = searchParams.get('sortBy') || 'sol';

  try {
    const entries = await fetchTopHolders(limit);

    if (sortBy === 'points') {
      entries.sort((a, b) => b.estimatedPoints - a.estimatedPoints);
      entries.forEach((e, i) => {
        e.rank = i + 1;
      });
    }

    return NextResponse.json({ entries, total: entries.length });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch leaderboard';
    return NextResponse.json(
      { entries: [], total: 0, error: message },
      { status: 200 }
    );
  }
}
