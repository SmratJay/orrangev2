import { useWallets } from '@privy-io/react-auth';
import { createWalletClient, custom, parseUnits, encodeFunctionData } from 'viem';
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
 * Get USDC balance for an address
 */
export async function getUSDCBalance(
  embeddedWallet: any
): Promise<string> {
  console.log('[getUSDCBalance] START - wallet:', embeddedWallet?.address);
  
  if (!embeddedWallet) {
    console.log('[getUSDCBalance] No wallet provided');
    return '0';
  }

  try {
    // Use Privy's provider which is already configured and reliable
    console.log('[getUSDCBalance] Getting provider...');
    const provider = await embeddedWallet.getEthereumProvider();
    console.log('[getUSDCBalance] Got provider:', !!provider);
    
    const callData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [embeddedWallet.address as `0x${string}`],
    });
    console.log('[getUSDCBalance] Encoded calldata:', callData);
    
    // Read balance via provider's eth_call
    console.log('[getUSDCBalance] Calling eth_call...');
    const result = await provider.request({
      method: 'eth_call',
      params: [
        {
          to: USDC_ADDRESS,
          data: callData,
        },
        'latest',
      ],
    });
    console.log('[getUSDCBalance] eth_call result:', result);

    // Parse the hex result
    const balance = BigInt(result as string);
    const formatted = (Number(balance) / 1_000_000).toFixed(6);
    console.log('[getUSDCBalance] Final balance:', formatted);
    return formatted;
  } catch (error) {
    console.error('[getUSDCBalance] Error:', error);
    throw error;
  }
}
