import { useWallets } from '@privy-io/react-auth';
import { createWalletClient, createPublicClient, custom, parseUnits, encodeFunctionData, http, formatUnits } from 'viem';
import { sepolia } from 'viem/chains';

// Sepolia USDC contract address
export const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';

// ERC-20 ABI for transfer function
export const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
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

/**
 * Hook to get the user's embedded wallet
 */
export function useEmbeddedWallet() {
  const { wallets } = useWallets();
  return wallets.find((w) => w.walletClientType === 'privy');
}

/**
 * Send USDC using the embedded wallet (gasless via Privy)
 * @param embeddedWallet - The user's Privy embedded wallet
 * @param toAddress - Recipient address
 * @param amount - Amount in USDC (e.g., "10.5")
 * @returns Transaction hash
 */
export async function sendUSDC(
  embeddedWallet: any,
  toAddress: string,
  amount: string
): Promise<string> {
  if (!embeddedWallet) {
    throw new Error('No embedded wallet found');
  }

  // Get the provider from embedded wallet
  const provider = await embeddedWallet.getEthereumProvider();
  
  const walletClient = createWalletClient({
    chain: sepolia,
    transport: custom(provider),
  });

  // Convert amount to proper decimals (USDC has 6 decimals)
  const amountInWei = parseUnits(amount, 6);

  // Encode the transfer function call
  const data = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [toAddress as `0x${string}`, amountInWei],
  });

  // Send transaction (Privy handles gas sponsorship automatically)
  const txHash = await walletClient.sendTransaction({
    to: USDC_ADDRESS,
    data,
    account: embeddedWallet.address as `0x${string}`,
  });

  return txHash;
}

/**
 * Reliable Sepolia RPC endpoints with fallback
 */
const RPC_URLS = [
  'https://sepolia.drpc.org',
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://1rpc.io/sepolia',
  'https://rpc.sepolia.org',
  'https://rpc2.sepolia.org',
];

/**
 * Get USDC balance using reliable fallback RPCs
 */
export async function getUSDCBalance(
  embeddedWallet: any
): Promise<string> {
  console.log('[getUSDCBalance] START - wallet:', embeddedWallet?.address);
  
  if (!embeddedWallet) {
    console.log('[getUSDCBalance] No wallet provided');
    return '0';
  }

  const address = embeddedWallet.address as `0x${string}`;
  
  // Try each RPC until one works
  for (const rpcUrl of RPC_URLS) {
    try {
      console.log('[getUSDCBalance] Trying RPC:', rpcUrl);
      const client = createPublicClient({
        chain: sepolia,
        transport: http(rpcUrl, { timeout: 5000 }),
      });
      
      const balance = await client.readContract({
        address: USDC_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
      });
      
      const formatted = formatUnits(balance, 6);
      console.log('[getUSDCBalance] Success with', rpcUrl, 'balance:', formatted);
      return formatted;
    } catch (err) {
      console.log('[getUSDCBalance] RPC failed:', rpcUrl, err instanceof Error ? err.message : String(err));
      // Continue to next RPC
    }
  }
  
  throw new Error('All RPC endpoints failed to fetch balance');
}
