'use client';

import { useState } from 'react';
import { Wallet, Copy, Check, LogOut } from 'lucide-react';
import { shortenAddress } from '@/utils/format';
import clsx from 'clsx';

export function WalletConnector() {
  const [address, setAddress] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleConnect = () => {
    const trimmed = inputValue.trim();
    if (trimmed.length > 10) {
      setAddress(trimmed);
      setInputValue('');
      setShowInput(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDisconnect = () => {
    setAddress('');
    setInputValue('');
  };

  if (!address) {
    return (
      <>
        {showInput ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter wallet address..."
              className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 w-56 lg:w-72"
              onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
            />
            <button
              onClick={handleConnect}
              disabled={!inputValue.trim()}
              className="h-9 rounded-lg bg-primary px-3 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              Connect
            </button>
            <button
              onClick={() => setShowInput(false)}
              className="h-9 rounded-lg px-2 text-sm text-text-muted hover:text-text transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowInput(true)}
            className="flex items-center gap-2 h-9 rounded-lg bg-gradient-to-r from-primary to-accent px-4 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            <Wallet size={16} />
            Connect Wallet
          </button>
        )}
      </>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5">
        <div className="h-2 w-2 rounded-full bg-success" />
        <span className="text-sm font-mono text-text">
          {shortenAddress(address)}
        </span>
      </div>
      <button
        onClick={handleCopy}
        className={clsx(
          'p-2 rounded-lg transition-colors',
          copied
            ? 'bg-success/15 text-success'
            : 'text-text-muted hover:bg-surface-light hover:text-text'
        )}
        title="Copy address"
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>
      <button
        onClick={handleDisconnect}
        className="p-2 rounded-lg text-text-muted hover:bg-surface-light hover:text-danger transition-colors"
        title="Disconnect"
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}
