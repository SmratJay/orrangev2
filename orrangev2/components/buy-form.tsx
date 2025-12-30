'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export function BuyForm() {
  const { user } = usePrivy();
  const [amountInr, setAmountInr] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  // Hardcoded rate for prototype: 1 USDC = 90 INR
  const EXCHANGE_RATE = 90; 
  const usdcAmount = amountInr ? (parseFloat(amountInr) / EXCHANGE_RATE).toFixed(2) : '0.00';

  const handleBuy = async () => {
    if (!user || !amountInr) return;
    setLoading(true);

    try {
      // 1. Get our internal user ID based on Privy ID
      const { data: dbUser } = await supabase
        .from('users')
        .select('id')
        .eq('privy_user_id', user.id)
        .single();

      if (!dbUser) throw new Error('User not found in DB');

      // 2. Create the Order in Supabase
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          user_id: dbUser.id,
          type: 'ONRAMP',
          fiat_amount: parseFloat(amountInr),
          usdc_amount: parseFloat(usdcAmount),
          status: 'PENDING',
        })
        .select()
        .single();

      if (error) throw error;

      setOrderId(order.id);
      alert('Order Created! Please pay to the merchant.');
    } catch (e) {
      console.error(e);
      alert('Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  if (orderId) {
    return (
      <Card>
        <CardHeader><CardTitle>Order Placed!</CardTitle></CardHeader>
        <CardContent>
          <div className="bg-green-100 p-4 rounded-md text-green-900 mb-4">
            Order #{orderId.slice(0, 8)} created successfully.
          </div>
          <p>Please send <strong>₹{amountInr}</strong> to the merchant UPI:</p>
          <div className="text-xl font-mono font-bold my-2 p-2 bg-gray-100 rounded">
            merchant@ybl
          </div>
          <Button className="w-full mt-4" onClick={() => window.location.reload()}>
            I have made the payment
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Buy USDC (Sepolia)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
          disabled={loading || !amountInr}
        >
          {loading ? 'Creating Order...' : 'Proceed to Payment'}
        </Button>
      </CardContent>
    </Card>
  );
}