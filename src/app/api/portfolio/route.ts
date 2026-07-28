import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';

const RKUSOL_MINT = 'rkubjTrZYioRSeXwDnhwGQzvW3qkcin72JSxUt3WMVp';
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const APY = 4.25;
const POINTS_PER_SOL_PER_DAY = 1;
const MAX_SIGS_PER_ACCOUNT = 200;

// Known dApp program IDs in the rkuSOL ecosystem
const DAPP_PROGRAMS: Record<string, string> = {
  'KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD': 'Kamino',
  '1oopBoJG58DgkUVKkEzKgyG9dvRmpgeEm1AVjoHkF78': 'Loopscale',
  'ExponentnaRg3CQbW6dqQNZKXp7gtZ9DGMp1cwC4HAS7': 'Exponent',
  'credmCBpoT3j3t2EitFnQbCkJSCm3ixjYuJjMbaCWiD': 'Sanctum',
};

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

function deriveAtaAddress(wallet: string): string | null {
  try {
    const walletPubkey = new PublicKey(wallet);
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

async function getTokenAccount(wallet: string): Promise<{ address: string; balance: number } | null> {
  // First try direct method
  const res = (await fetchRpc('getTokenAccountsByOwner', [
    wallet,
    { mint: RKUSOL_MINT },
    { encoding: 'jsonParsed' },
  ])) as { value?: any[] };

  const accounts = res?.value ?? [];
  if (accounts.length > 0) {
    const best = accounts[0];
    const balance = best?.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0;
    return { address: best.pubkey, balance };
  }

  // No token account found via API. Derive ATA and check directly.
  const ataAddr = deriveAtaAddress(wallet);
  if (!ataAddr) return null;

  try {
    const info = await fetchRpc('getAccountInfo', [ataAddr, { encoding: 'jsonParsed' }]);
    if (!info) return null;

    // Parse token account data
    const parsed = info?.data?.parsed;
    if (parsed?.program === 'spl-token' && parsed?.info?.mint === RKUSOL_MINT) {
      const balance = parsed?.info?.tokenAmount?.uiAmount ?? 0;
      return { address: ataAddr, balance };
    }

    // Raw data fallback
    if (info?.data && typeof info.data === 'string' && info.data.length > 0) {
      return { address: ataAddr, balance: 0 };
    }
  } catch {
    return null;
  }

  return null;
}

interface TxEvent {
  signature: string;
  blockTime: number;
  type: 'stake' | 'unstake' | 'deposit-dapp' | 'withdraw-dapp';
  amount: number;
  dappName?: string;
  dappAddress?: string;
}

async function getAllSignatures(ataAddress: string) {
  const seen = new Set<string>();
  const all: { signature: string }[] = [];

  try {
    const sigs = (await fetchRpc('getSignaturesForAddress', [
      ataAddress,
      { limit: MAX_SIGS_PER_ACCOUNT },
    ])) as Array<{ signature: string }> | undefined;

    if (!sigs) return [];

    for (const s of sigs) {
      if (!seen.has(s.signature)) {
        seen.add(s.signature);
        all.push({ signature: s.signature });
      }
    }
  } catch {
    // ATA might not exist
  }

  return all;
}

// Get the program IDs from transaction instructions to detect dApp deposits
function detectDappPrograms(tx: any): Set<string> {
  const programs = new Set<string>();
  try {
    const instructions = tx?.transaction?.message?.instructions ?? [];
    const innerInstructions = tx?.meta?.innerInstructions ?? [];

    for (const ix of instructions) {
      const programId = tx?.transaction?.message?.accountKeys?.[ix.programIdIndex ?? ix.programIdIndex ?? 0] ?? '';
      if (typeof programId === 'string') programs.add(programId);
    }

    for (const inner of innerInstructions) {
      for (const ix of (inner.instructions ?? [])) {
        const programId = tx?.transaction?.message?.accountKeys?.[ix.programIdIndex ?? 0] ?? '';
        if (typeof programId === 'string') programs.add(programId);
      }
    }
  } catch {}
  return programs;
}

function findRkusolBalanceChanges(
  tx: any,
  walletAddress: string,
  ataAddress: string
): { walletBefore: number; walletAfter: number; otherReceivers: Array<{ owner: string; amount: number }> } {
  const pre = tx?.meta?.preTokenBalances ?? [];
  const post = tx?.meta?.postTokenBalances ?? [];
  const accountKeys = tx?.transaction?.message?.accountKeys ?? [];

  // Find wallet's ATA in the account keys
  const ataIndex = accountKeys.findIndex(
    (k: string) => k === ataAddress || k === walletAddress
  );

  let walletBefore = 0;
  let walletAfter = 0;

  for (const bal of pre) {
    if (bal.mint === RKUSOL_MINT && (bal.accountIndex === ataIndex || accountKeys[bal.accountIndex] === ataAddress)) {
      walletBefore = bal?.uiTokenAmount?.uiAmount ?? 0;
    }
  }

  for (const bal of post) {
    if (bal.mint === RKUSOL_MINT && (bal.accountIndex === ataIndex || accountKeys[bal.accountIndex] === ataAddress)) {
      walletAfter = bal?.uiTokenAmount?.uiAmount ?? 0;
    }
  }

  // If we didn't find via index match, try matching by owner = wallet
  if (walletBefore === 0 && walletAfter === 0) {
    for (const bal of pre) {
      if (bal.mint === RKUSOL_MINT && bal.owner === walletAddress) {
        walletBefore = bal?.uiTokenAmount?.uiAmount ?? 0;
      }
    }
    for (const bal of post) {
      if (bal.mint === RKUSOL_MINT && bal.owner === walletAddress) {
        walletAfter = bal?.uiTokenAmount?.uiAmount ?? 0;
      }
    }
  }

  // Find other receivers of rkuSOL in the same tx
  const otherReceivers: Array<{ owner: string; amount: number }> = [];
  const preMap = new Map<string, number>();
  
  for (const bal of pre) {
    if (bal.mint === RKUSOL_MINT) {
      const owner = bal.owner ?? '';
      const amt = bal?.uiTokenAmount?.uiAmount ?? 0;
      preMap.set(owner, amt);
    }
  }

  for (const bal of post) {
    if (bal.mint === RKUSOL_MINT) {
      const owner = bal.owner ?? '';
      const preAmt = preMap.get(owner) ?? 0;
      const postAmt = bal?.uiTokenAmount?.uiAmount ?? 0;
      const change = postAmt - preAmt;
      
      if (change > 0.0001 && owner !== walletAddress) {
        otherReceivers.push({ owner, amount: change });
      }
    }
  }

  return { walletBefore, walletAfter, otherReceivers };
}

async function parseTransaction(
  signature: string,
  walletAddress: string,
  ataAddress: string
): Promise<TxEvent | null> {
  try {
    const tx = (await fetchRpc('getTransaction', [
      signature,
      { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 },
    ])) as any;

    if (!tx?.meta) return null;

    const { walletBefore, walletAfter, otherReceivers } = findRkusolBalanceChanges(
      tx, walletAddress, ataAddress
    );

    const diff = walletAfter - walletBefore;
    if (Math.abs(diff) < 0.0001) return null;

    const blockTime = tx.blockTime ?? 0;
    const dappPrograms = detectDappPrograms(tx);
    
    // Find if a known partnered dApp was involved in this transaction
    let knownDAppName: string | null = null;
    let knownDAppAddr: string | null = null;

    for (const progId of dappPrograms) {
      if (DAPP_PROGRAMS[progId]) {
        knownDAppName = DAPP_PROGRAMS[progId];
        knownDAppAddr = progId;
        break;
      }
    }

    if (!knownDAppName) {
      for (const receiver of otherReceivers) {
        if (DAPP_PROGRAMS[receiver.owner]) {
          knownDAppName = DAPP_PROGRAMS[receiver.owner];
          knownDAppAddr = receiver.owner;
          break;
        }
      }
    }

    if (diff > 0) {
      // Balance increased - rkuSOL came to wallet
      if (knownDAppName && knownDAppAddr) {
        // Came BACK from a partnered dApp
        return { signature, blockTime, type: 'withdraw-dapp', amount: diff,
          dappName: knownDAppName, dappAddress: knownDAppAddr };
      }
      // Fresh stake from Raiku
      return { signature, blockTime, type: 'stake', amount: diff };
    }

    // Balance decreased - rkuSOL left wallet
    if (knownDAppName && knownDAppAddr) {
      // Went TO a partnered dApp
      return { signature, blockTime, type: 'deposit-dapp', amount: Math.abs(diff),
        dappName: knownDAppName, dappAddress: knownDAppAddr };
    }

    // No partnered dApp involved - this is an unstake
    return { signature, blockTime, type: 'unstake', amount: Math.abs(diff) };
  } catch {
    return null;
  }
}

async function parseTransactions(
  signatures: { signature: string }[],
  walletAddress: string,
  ataAddress: string
): Promise<TxEvent[]> {
  const events: TxEvent[] = [];
  for (let i = 0; i < signatures.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 80));
    const event = await parseTransaction(signatures[i].signature, walletAddress, ataAddress);
    if (event) events.push(event);
  }
  return events;
}

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet');
  if (!wallet) {
    return NextResponse.json({ error: 'wallet address is required' }, { status: 400 });
  }

  try {
    const [tokenAccount, prices] = await Promise.all([
      getTokenAccount(wallet),
      getPrices(),
    ]);

    const exchangeRate = prices.sol > 0 ? prices.rkusol / prices.sol : 1.0082;
    const currentBalance = tokenAccount?.balance ?? 0;
    const ataAddress = tokenAccount?.address ?? deriveAtaAddress(wallet);

    if (!ataAddress) {
      return NextResponse.json({
        walletAddress: wallet,
        currentBalance: 0,
        depositedBalance: 0,
        managedBalance: 0,
        solValue: 0,
        usdValue: 0,
        totalPoints: 0,
        estimatedRewards: 0,
        apy: APY,
        exchangeRate,
        daysSinceFirstStake: 0,
        activity: [],
        periods: [],
        tokenAccounts: [],
        dappDeposits: [],
      });
    }

    const allSigs = await getAllSignatures(ataAddress);

    if (allSigs.length === 0 && currentBalance === 0) {
      return NextResponse.json({
        walletAddress: wallet,
        currentBalance: 0,
        depositedBalance: 0,
        managedBalance: 0,
        solValue: 0,
        usdValue: 0,
        totalPoints: 0,
        estimatedRewards: 0,
        apy: APY,
        exchangeRate,
        daysSinceFirstStake: 0,
        activity: [],
        periods: [],
        tokenAccounts: tokenAccount ? [{ address: ataAddress, amount: 0 }] : [],
        dappDeposits: [],
      });
    }

    // Parse transactions to find rkuSOL events
    const events = await parseTransactions(allSigs, wallet, ataAddress);

    // Sort oldest first
    events.sort((a, b) => a.blockTime - b.blockTime);

    // Build timeline with managed balance
    // managedBalance = in-wallet balance + amounts deposited in dApps
    let inWalletBalance = 0;
    const depositedMap = new Map<string, { dappName: string; dappAddress: string; amount: number }>();

    let lastTimestamp = events.length > 0 ? events[0].blockTime * 1000 : Date.now();
    let totalPoints = 0;

    const activity: any[] = [];
    const periods: any[] = [];
    const dappDeposits: any[] = [];

    // Track dApp deposit history for re-deposit detection
    const dappDepositTracker = new Map<string, number>();

    for (const evt of events) {
      const eventTime = evt.blockTime * 1000;
      const days = (eventTime - lastTimestamp) / 86_400_000;

      const managedBalance = inWalletBalance + getDepositedTotal(depositedMap);

      if (days > 0 && managedBalance > 0) {
        totalPoints += Math.floor(managedBalance * days * POINTS_PER_SOL_PER_DAY);
        periods.push({
          from: new Date(lastTimestamp).toISOString(),
          to: new Date(eventTime).toISOString(),
          balance: inWalletBalance,
          managedBalance,
          days: Math.round(days * 10) / 10,
          points: Math.floor(managedBalance * days * POINTS_PER_SOL_PER_DAY),
        });
      }

      const balanceBefore = inWalletBalance;

      if (evt.type === 'stake') {
        // Fresh rkuSOL received from Raiku
        inWalletBalance += evt.amount;
      } else if (evt.type === 'unstake') {
        // rkuSOL left to non-partnered address = unstake
        inWalletBalance -= evt.amount;
      } else if (evt.type === 'deposit-dapp' && evt.dappName) {
        // rkuSOL went TO a partnered dApp
        inWalletBalance -= evt.amount;
        const key = evt.dappAddress || evt.dappName;
        const existing = depositedMap.get(key);
        if (existing) {
          existing.amount += evt.amount;
        } else {
          depositedMap.set(key, {
            dappName: evt.dappName,
            dappAddress: evt.dappAddress || key,
            amount: evt.amount,
          });
        }
      } else if (evt.type === 'withdraw-dapp' && evt.dappName) {
        // rkuSOL came BACK from a partnered dApp to wallet
        inWalletBalance += evt.amount;
        const key = evt.dappAddress || evt.dappName;
        const existing = depositedMap.get(key);
        if (existing) {
          existing.amount -= evt.amount;
          if (existing.amount <= 0) depositedMap.delete(key);
        }
      }

      inWalletBalance = Math.max(0, Math.round(inWalletBalance * 1e6) / 1e6);
      const managedAfter = inWalletBalance + getDepositedTotal(depositedMap);

      const displayType: 'stake' | 'deposit' | 'withdraw' | 'unstake' =
        evt.type === 'stake' ? 'stake' :
        evt.type === 'deposit-dapp' ? 'deposit' :
        evt.type === 'withdraw-dapp' ? 'withdraw' :
        'unstake';

      activity.push({
        signature: evt.signature,
        timestamp: new Date(eventTime).toISOString(),
        type: displayType,
        amount: evt.amount,
        balanceBefore,
        balanceAfter: inWalletBalance,
        daysSinceLastEvent: Math.round(days * 10) / 10,
        pointsEarned: days > 0 && managedBalance > 0
          ? Math.floor(managedBalance * days * POINTS_PER_SOL_PER_DAY)
          : 0,
        ...(evt.dappName ? { dappName: evt.dappName } : {}),
        ...(evt.dappAddress ? { dappAddress: evt.dappAddress } : {}),
      });

      lastTimestamp = eventTime;
    }

    // Final period
    const finalDays = (Date.now() - lastTimestamp) / 86_400_000;
    const finalManagedBalance = inWalletBalance + getDepositedTotal(depositedMap);

    if (finalManagedBalance > 0 && finalDays > 0) {
      const finalPoints = Math.floor(finalManagedBalance * finalDays * POINTS_PER_SOL_PER_DAY);
      totalPoints += finalPoints;
      periods.push({
        from: new Date(lastTimestamp).toISOString(),
        to: null,
        balance: inWalletBalance,
        managedBalance: finalManagedBalance,
        days: Math.round(finalDays * 10) / 10,
        points: finalPoints,
      });
    }

    // Build dappDeposits array
    for (const [, deposit] of depositedMap) {
      dappDeposits.push({
        dappName: deposit.dappName,
        dappAddress: deposit.dappAddress,
        amount: deposit.amount,
        detectedAt: new Date().toISOString(),
      });
    }

    const depositedBalance = getDepositedTotal(depositedMap);
    const managedBalance = currentBalance + depositedBalance;
    const firstStakeTime = events.length > 0 ? events[0].blockTime : 0;
    const daysSinceFirstStake = firstStakeTime > 0
      ? Math.floor((Date.now() - firstStakeTime * 1000) / 86_400_000)
      : 0;
    const estimatedRewards = totalPoints * (APY / 100) * (POINTS_PER_SOL_PER_DAY / 365);

    return NextResponse.json({
      walletAddress: wallet,
      currentBalance,
      depositedBalance,
      managedBalance,
      solValue: managedBalance * exchangeRate,
      usdValue: managedBalance * exchangeRate * prices.sol,
      totalPoints,
      estimatedRewards,
      apy: APY,
      exchangeRate,
      daysSinceFirstStake,
      firstStakedAt: firstStakeTime > 0 ? new Date(firstStakeTime * 1000).toISOString() : null,
      pointsPerDay: Math.floor(managedBalance * POINTS_PER_SOL_PER_DAY),
      activity,
      periods,
      tokenAccounts: tokenAccount ? [{ address: ataAddress, amount: currentBalance }] : [],
      dappDeposits,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch portfolio';
    return NextResponse.json(
      { error: message, walletAddress: wallet },
      { status: 200 }
    );
  }
}

function getDepositedTotal(
  map: Map<string, { dappName: string; dappAddress: string; amount: number }>
): number {
  let total = 0;
  for (const [, v] of map) total += v.amount;
  return Math.round(total * 1e6) / 1e6;
}
