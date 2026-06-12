'use client';

import { useWallets } from '@privy-io/react-auth';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Loader2, RefreshCw, Wallet } from 'lucide-react';

async function fetchBalancesFromServer(address: string): Promise<{ usdc: string; eth: string }> {
  const res = await fetch(`/api/wallet/balance?address=${address}`);
  if (!res.ok) throw new Error('Balance fetch failed');
  return res.json();
}

interface Balances {
  usdc: string;
  eth: string;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export function WalletBalance() {
  const { wallets } = useWallets();
  const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');
  const address = embeddedWallet?.address;
  const isMounted = useRef(true);

  const [balances, setBalances] = useState<Balances>({
    usdc: '0.00',
    eth: '0.00',
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const fetchBalances = useCallback(async () => {
    if (!address) {
      if (isMounted.current) setBalances(prev => ({ ...prev, loading: false }));
      return;
    }

    if (isMounted.current) setBalances(prev => ({ ...prev, error: null }));

    try {
      const data = await fetchBalancesFromServer(address);
      if (!isMounted.current) return;
      setBalances({
        usdc: data.usdc,
        eth: data.eth,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (err) {
      console.error('[WalletBalance] Balance fetch failed:', err);
      if (!isMounted.current) return;
      setBalances(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load balance — tap refresh',
      }));
    }
  }, [address]);

  useEffect(() => {
    isMounted.current = true;
    fetchBalances();
    const interval = setInterval(fetchBalances, 15000);
    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [fetchBalances]);

  const handleManualRefresh = () => {
    setBalances(prev => ({ ...prev, loading: true }));
    fetchBalances();
  };

  if (!address) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Wallet className="w-5 h-5" />
          <p className="text-sm">No wallet connected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card-orange rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #FF7A1A, #FF8F3A)'}}>
            <Wallet className="w-4 h-4 text-black" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Wallet Balance</p>
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={balances.loading}
          className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-40 p-1 rounded hover:bg-white/10"
        >
          {balances.loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* USDC Balance - hero number */}
      <div className="flex items-baseline gap-2 mb-1">
        <h3 className="text-3xl font-bold text-white">
          {balances.loading && balances.usdc === '0.00' ? (
            <span className="text-muted-foreground/40">--.--</span>
          ) : (
            Number(balances.usdc).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
          )}
        </h3>
        <span className="text-primary font-semibold">USDC</span>
      </div>

      {/* ETH for gas */}
      <div className="flex items-center gap-1.5 mb-4">
        <span className="text-sm text-muted-foreground">
          {balances.loading && balances.eth === '0.00' ? '-.----' : Number(balances.eth).toFixed(4)} ETH
        </span>
        <span className="text-xs text-muted-foreground/50">• gas</span>
      </div>

      {/* Address + last updated */}
      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <p className="text-xs font-mono text-muted-foreground/60">
          {address.slice(0, 6)}…{address.slice(-4)}
        </p>
        {balances.lastUpdated && !balances.loading && (
          <p className="text-xs text-muted-foreground/40">
            {balances.lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </div>

      {balances.error && (
        <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
          {balances.error}
        </p>
      )}
    </div>
  );
}