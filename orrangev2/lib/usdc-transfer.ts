import { PrivyClient } from '@privy-io/server-auth';
import { createPublicClient, encodeFunctionData, http, parseUnits } from 'viem';
import { sepolia } from 'viem/chains';

export const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as const;

const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

function getPrivyClient(): PrivyClient {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const secret = process.env.PRIVY_APP_SECRET;
  if (!appId || !secret) throw new Error('Privy credentials not configured');
  return new PrivyClient(appId, secret);
}

/**
 * Get USDC balance for a wallet address (public RPC, no auth needed)
 */
export async function getUSDCBalance(walletAddress: string): Promise<number> {
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(),
  });

  const balance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [walletAddress as `0x${string}`],
  });

  return Number(balance) / 1_000_000;
}

/**
 * Server-side USDC transfer from merchant custodial wallet to user.
 * Uses Privy server-auth to sign the transaction — no user interaction needed.
 */
export async function transferUSDCFromMerchantToUser(
  merchantWalletId: string,
  toAddress: string,
  usdcAmount: number
): Promise<string> {
  const privy = getPrivyClient();

  const amountInUnits = parseUnits(String(usdcAmount), 6);
  const data = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [toAddress as `0x${string}`, amountInUnits],
  });

  const { hash } = await privy.walletApi.ethereum.sendTransaction({
    walletId: merchantWalletId,
    caip2: 'eip155:11155111',
    transaction: {
      to: USDC_ADDRESS,
      data,
    },
  });

  return hash;
}
