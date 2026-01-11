'use client';

import { useState } from 'react';
import { useEmbeddedWallet, sendUSDC } from '@/lib/smart-wallet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface SendUSDCProps {
  recipientAddress: string;
  amount: string;
  orderId: string;
  onSuccess?: (txHash: string) => void;
  onError?: (error: string) => void;
}

export function SendUSDC({ recipientAddress, amount, orderId, onSuccess, onError }: SendUSDCProps) {
  const embeddedWallet = useEmbeddedWallet();
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!embeddedWallet) {
        throw new Error('Wallet not found. Please refresh the page.');
      }

      const hash = await sendUSDC(embeddedWallet, recipientAddress, amount);
      setTxHash(hash);
      
      // Update order in database
      await fetch('/api/orders/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, txHash: hash }),
      });

      onSuccess?.(hash);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to send USDC';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (txHash) {
    return (
      <Card className="border-green-500/50 bg-green-950/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <div>
              <p className="font-semibold text-green-50">Transfer Complete!</p>
              <p className="text-sm text-green-200/70">USDC sent successfully</p>
            </div>
          </div>
          <div className="bg-zinc-900 p-3 rounded-md">
            <p className="text-xs text-zinc-400 mb-1">Transaction Hash:</p>
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-400 hover:text-blue-300 font-mono break-all"
            >
              {txHash}
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-500/50 bg-red-950/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <XCircle className="w-6 h-6 text-red-500" />
            <div>
              <p className="font-semibold text-red-50">Transfer Failed</p>
              <p className="text-sm text-red-200/70">{error}</p>
            </div>
          </div>
          <Button onClick={handleSend} variant="outline" className="w-full">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send USDC to User</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Recipient Address</Label>
          <Input value={recipientAddress} disabled className="font-mono text-xs" />
        </div>
        
        <div className="space-y-2">
          <Label>Amount</Label>
          <Input value={`${amount} USDC`} disabled />
        </div>

        <Button 
          onClick={handleSend} 
          disabled={loading || !embeddedWallet}
          className="w-full"
        >
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {loading ? 'Sending USDC...' : 'Send USDC (Gasless)'}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          ⛽ This transaction is gasless - no ETH needed for gas fees
        </p>
      </CardContent>
    </Card>
  );
}
