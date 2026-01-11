'use client';

import { useWallets } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';
import { createPublicClient, http, formatUnits } from 'viem';
import { sepolia } from 'viem/chains';

const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'; // Sepolia USDC

export function WalletBalance() {
  const { wallets } = useWallets();
  const [balance, setBalance] = useState('0.00');
  const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');

  useEffect(() => {
    async function getBalance() {
      if (!embeddedWallet) return;

      const client = createPublicClient({
        chain: sepolia,
        transport: http(),
      });

      // Simple balance check (standard ERC-20 'balanceOf' call)
      const data = await client.readContract({
        address: USDC_ADDRESS,
        abi: [{
          name: 'balanceOf',
          type: 'function',
          inputs: [{ name: 'owner', type: 'address' }],
          outputs: [{ name: 'balance', type: 'uint256' }],
          stateMutability: 'view',
        }],
        functionName: 'balanceOf',
        args: [embeddedWallet.address as `0x${string}`],
      });

      setBalance(formatUnits(data as bigint, 6)); // USDC has 6 decimals
    }

    getBalance();
    const interval = setInterval(getBalance, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [embeddedWallet]);

  return (
    <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
      <p className="text-zinc-400 text-sm mb-1">Your USDC Balance</p>
      <h3 className="text-3xl font-bold text-white">{balance} USDC</h3>
      <p className="text-xs text-zinc-500 mt-2 font-mono">
        {embeddedWallet?.address.slice(0, 6)}...{embeddedWallet?.address.slice(-4)}
      </p>
    </div>
  );
}