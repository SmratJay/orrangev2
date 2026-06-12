'use client';

import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useEmbeddedWallet, getUSDCBalance } from '@/lib/smart-wallet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RefreshCw, Wallet, ArrowRightLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function SellForm() {
  const router = useRouter();
  const { user, ready } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const embeddedWallet = useEmbeddedWallet();
  
  const [amountUsdc, setAmountUsdc] = useState('');
  const [userUpiId, setUserUpiId] = useState('');
  const [defaultUpiId, setDefaultUpiId] = useState<string | null>(null);
  const [usingDefault, setUsingDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string>('0.00');
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Exchange rate: 1 USDC = 90 INR
  const EXCHANGE_RATE = 90;
  const inrAmount = amountUsdc ? (parseFloat(amountUsdc) * EXCHANGE_RATE).toFixed(2) : '0.00';

  // Load default UPI from profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch('/api/users/profile');
        if (res.ok) {
          const data = await res.json();
          if (data.user?.default_upi_id) {
            setDefaultUpiId(data.user.default_upi_id);
            setUserUpiId(data.user.default_upi_id);
            setUsingDefault(true);
          }
        }
      } catch {}
    };
    loadProfile();
  }, []);

  // Get wallet address and balance
  useEffect(() => {
    if (walletsReady && wallets && wallets.length > 0) {
      const embedded = wallets.find((w) => w.walletClientType === 'privy');
      if (embedded) {
        setWalletAddress(embedded.address);
        fetchBalance(embedded);
      }
    }
  }, [wallets, walletsReady]);

  const fetchBalance = async (wallet: any) => {
    setBalanceLoading(true);
    try {
      const balance = await getUSDCBalance(wallet);
      setUsdcBalance(balance);
    } catch (error) {
      console.error('[SellForm] Error fetching balance:', error);
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleSell = async () => {
    if (!ready || !user) {
      alert('Please wait for authentication');
      return;
    }

    if (!walletAddress || !embeddedWallet) {
      alert('Wallet not available');
      return;
    }

    const usdcAmt = parseFloat(amountUsdc);
    if (!amountUsdc || usdcAmt <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    // Check balance
    const balance = parseFloat(usdcBalance);
    if (usdcAmt > balance) {
      alert(`Insufficient balance. You have ${usdcBalance} USDC`);
      return;
    }

    if (!userUpiId || userUpiId.length < 5) {
      alert('Please enter a valid UPI ID');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'offramp',
          fiatAmount: parseFloat(inrAmount),
          usdcAmount: usdcAmt,
          userWalletAddress: walletAddress,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create order');
      }

      const { order } = await response.json();

      // Save user UPI ID separately
      await fetch(`/api/orders/${order.id}/update-upi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userUpiId }),
      });

      router.push(`/order/${order.id}`);
    } catch (e) {
      console.error('[SellForm] Error:', e);
      alert(e instanceof Error ? e.message : 'Failed to create order');
      setLoading(false);
    }
  };

  const refreshBalance = () => {
    if (embeddedWallet) {
      fetchBalance(embeddedWallet);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5" />
          Sell USDC (Sepolia)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Wallet Status */}
        {!walletsReady ? (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading wallet...</span>
          </div>
        ) : !walletAddress ? (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-800">No wallet found</p>
          </div>
        ) : (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
            <div className="flex justify-between items-center">
              <span>
                ✅ Wallet: {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
              </span>
              <button
                onClick={refreshBalance}
                className="text-green-700 hover:text-green-900"
                disabled={balanceLoading}
              >
                <RefreshCw className={`w-4 h-4 ${balanceLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="mt-2 font-semibold">
              Balance: {balanceLoading ? 'Loading...' : `${usdcBalance} USDC`}
            </div>
          </div>
        )}

        {/* USDC Amount */}
        <div className="space-y-2">
          <Label>Amount to Sell (USDC)</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="10.00"
            value={amountUsdc}
            onChange={(e) => setAmountUsdc(e.target.value)}
          />
          {amountUsdc && parseFloat(amountUsdc) > parseFloat(usdcBalance) && (
            <p className="text-xs text-red-500">Amount exceeds your balance</p>
          )}
        </div>

        {/* UPI ID */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Your UPI ID (for receiving INR)</Label>
            {defaultUpiId && (
              <button
                type="button"
                onClick={() => {
                  if (usingDefault) {
                    setUsingDefault(false);
                    setUserUpiId('');
                  } else {
                    setUsingDefault(true);
                    setUserUpiId(defaultUpiId);
                  }
                }}
                className="text-xs text-primary hover:text-primary/80 transition"
              >
                {usingDefault ? 'Use different UPI' : `Use default (${defaultUpiId})`}
              </button>
            )}
          </div>
          <Input
            type="text"
            placeholder="yourname@upi"
            value={userUpiId}
            onChange={(e) => { setUserUpiId(e.target.value); setUsingDefault(false); }}
          />
          {usingDefault && defaultUpiId && (
            <p className="text-xs text-green-600">✓ Using your default UPI ID</p>
          )}
          {!usingDefault && (
            <p className="text-xs text-muted-foreground">Enter the UPI ID where you want to receive INR</p>
          )}
        </div>

        {/* Summary */}
        <div className="p-4 bg-slate-50 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>Exchange Rate</span>
            <span>₹{EXCHANGE_RATE} / USDC</span>
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span>You Receive</span>
            <span>₹{inrAmount}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>You Send</span>
            <span>{amountUsdc || '0.00'} USDC</span>
          </div>
        </div>

        {/* Warning */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <p className="font-medium">⚠️ Important:</p>
          <p className="mt-1">
            You will send USDC first. Only proceed with trusted merchants.
            Make sure your UPI ID is correct.
          </p>
        </div>

        <Button
          className="w-full"
          onClick={handleSell}
          disabled={
            loading ||
            !amountUsdc ||
            !walletAddress ||
            !userUpiId ||
            parseFloat(amountUsdc) <= 0 ||
            parseFloat(amountUsdc) > parseFloat(usdcBalance)
          }
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Creating Order...
            </>
          ) : (
            'Create Sell Order'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
