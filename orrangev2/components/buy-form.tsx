'use client';

import { useState, useEffect } from 'react';
import { usePrivy, useWallets, useCreateWallet } from '@privy-io/react-auth';
import { useEmbeddedWallet } from '@/lib/smart-wallet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RefreshCw, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function BuyForm() {
  const router = useRouter();
  const { user, ready } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { createWallet } = useCreateWallet();
  const embeddedWallet = useEmbeddedWallet();
  const [amountInr, setAmountInr] = useState('');
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Debug: log wallets on load
  useEffect(() => {
    console.log('[BuyForm] Wallets state:', { walletsReady, count: wallets?.length });
    
    if (wallets && wallets.length > 0) {
      console.log('[BuyForm] Available wallets:', wallets.map(w => ({
        type: w.walletClientType,
        address: w.address
      })));
      
      // Try to find embedded wallet
      const embedded = wallets.find((w) => w.walletClientType === 'privy');
      if (embedded) {
        console.log('[BuyForm] Found embedded wallet:', embedded.address);
        setWalletAddress(embedded.address);
      }
    }
  }, [wallets, walletsReady]);

  // Handle wallet creation
  const handleCreateWallet = async () => {
    try {
      console.log('[BuyForm] Creating wallet...');
      await createWallet();
      console.log('[BuyForm] Wallet created!');
    } catch (error) {
      console.error('[BuyForm] Error creating wallet:', error);
    }
  };

  // Hardcoded rate for prototype: 1 USDC = 90 INR
  const EXCHANGE_RATE = 90; 
  const usdcAmount = amountInr ? (parseFloat(amountInr) / EXCHANGE_RATE).toFixed(2) : '0.00';

  const handleBuy = async () => {
    if (!ready || !user) {
      alert('Please wait for authentication');
      return;
    }

    if (!walletAddress && !embeddedWallet) {
      alert('Please create a wallet first');
      return;
    }
    
    if (!amountInr || parseFloat(amountInr) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    setLoading(true);

    try {
      // Create order via API
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'onramp',
          fiatAmount: parseFloat(amountInr),
          usdcAmount: parseFloat(usdcAmount),
          userWalletAddress: walletAddress || embeddedWallet?.address,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      const { order } = await response.json();
      
      // Redirect to order page
      router.push(`/order/${order.id}`);
    } catch (e) {
      console.error(e);
      alert('Failed to create order');
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Buy USDC (Sepolia)</CardTitle>
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
            <p className="text-sm text-orange-800 mb-2">No wallet found. Create one to continue:</p>
            <Button 
              size="sm" 
              onClick={handleCreateWallet}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4 mr-2" />
                  Create Wallet
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
            ✅ Wallet ready: {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
          </div>
        )}

        <div className="space-y-2">
          <Label>Amount (INR)</Label>
          <Input 
            type="number" 
            placeholder="1000" 
            value={amountInr} 
            onChange={(e) => setAmountInr(e.target.value)} 
          />
        </div>
        
        <div className="p-4 bg-slate-50 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>Exchange Rate</span>
            <span>₹{EXCHANGE_RATE} / USDC</span>
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span>You Receive</span>
            <span>{usdcAmount} USDC</span>
          </div>
        </div>

        <Button 
          className="w-full" 
          onClick={handleBuy} 
          disabled={loading || !amountInr || !walletAddress}
        >
          {loading ? 'Creating Order...' : !walletAddress ? 'Create Wallet First' : 'Proceed to Payment'}
        </Button>
      </CardContent>
    </Card>
  );
}