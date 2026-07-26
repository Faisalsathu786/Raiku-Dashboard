export function formatNumber(n: number, decimals = 2): string {
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(decimals) + 'B';
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(decimals) + 'M';
  if (abs >= 1_000) return (n / 1_000).toFixed(decimals) + 'K';
  return n.toFixed(decimals);
}

export function formatUsd(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatSol(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) + ' SOL';
}

export function formatPercent(n: number): string {
  return n.toFixed(2) + '%';
}

export function shortenAddress(address: string): string {
  if (address.length <= 12) return address;
  return address.slice(0, 6) + '...' + address.slice(-4);
}

export function formatPoints(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M pts';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K pts';
  return Math.floor(n).toLocaleString() + ' pts';
}
