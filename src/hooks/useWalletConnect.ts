'use client';

import { useState, useEffect, useCallback } from 'react';

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      isBraveWallet?: boolean;
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      on: (event: string, cb: () => void) => void;
      off: (event: string, cb: () => void) => void;
    };
  }
}

export function useWalletConnect() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [walletName, setWalletName] = useState<string | null>(null);

  const detectWallet = useCallback((): string | null => {
    const solana = window.solana;
    if (!solana) return null;
    if (solana.isPhantom) return 'Phantom';
    if (solana.isBraveWallet) return 'Brave Wallet';
    return 'Solana Wallet';
  }, []);

  const connect = useCallback(async () => {
    const solana = window.solana;
    if (!solana) {
      window.open('https://phantom.app/', '_blank');
      return;
    }
    try {
      const { publicKey: pk } = await solana.connect();
      setPublicKey(pk.toString());
      setConnected(true);
      setWalletName(detectWallet());
    } catch (err) {
      console.error('Wallet connection failed:', err);
    }
  }, [detectWallet]);

  const disconnect = useCallback(async () => {
    const solana = window.solana;
    if (solana) {
      try {
        await solana.disconnect();
      } catch {
        // ignore
      }
    }
    setPublicKey(null);
    setConnected(false);
    setWalletName(null);
  }, []);

  useEffect(() => {
    const solana = window.solana;
    if (!solana) return;

    const handleDisconnect = () => {
      setPublicKey(null);
      setConnected(false);
      setWalletName(null);
    };

    solana.on('disconnect', handleDisconnect);
    return () => {
      solana.off('disconnect', handleDisconnect);
    };
  }, []);

  return {
    publicKey,
    connected,
    walletName,
    connect,
    disconnect,
    hasWallet: typeof window !== 'undefined' && !!window.solana,
  };
}
