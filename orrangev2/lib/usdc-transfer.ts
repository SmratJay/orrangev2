/**
 * Direct USDC Transfer (Merchant → User)
 * 
 * This module handles direct USDC transfers from merchant custodial wallets
 * to user custodial wallets using Privy's server-side control.
 * 
 * Flow (On-Ramp):
 * 1. User creates order: "I want 10 USDC for ₹900"
 * 2. Merchant accepts order (must have USDC in wallet)
 * 3. User pays ₹900 to merchant's UPI
 * 4. Merchant confirms INR receipt
 * 5. Backend transfers USDC from merchant wallet → user wallet
 * 6. Order completed
 * 
 * Why no escrow:
 * - Both wallets are Privy custodial (server has control)
 * - Merchant's wallet balance = their inventory
 * - Server can sign transactions from merchant's wallet
 * 
 * NOTE: Server-side signing requires Privy SDK v2.0+ or REST API
 * Current implementation uses viem with merchant wallet private key approach
 */

import { parseUnits, encodeFunctionData, createPublicClient, http, createWalletClient } from 'viem';
import { sepolia } from 'viem/chains';

// Sepolia USDC contract
export const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as const;

// ERC-20 ABI
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
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const;

/**
 * Get USDC balance of any wallet address
 * 
 * @param walletAddress - Wallet address to check
 * @returns Balance in USDC (e.g., 10.5)
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
  
  // Convert from wei (6 decimals for USDC) to decimal
  return Number(balance) / 1e6;
}

/**
 * Transfer USDC from merchant wallet to user wallet
 * 
 * Uses Privy REST API for server-side wallet signing.
 * Server must be registered as authorized signer on merchant's wallet.
 * 
 * @param merchantWalletId - Merchant's Privy wallet ID (not address!)
 * @param userWalletAddress - User's embedded wallet address  
 * @param amount - Amount of USDC to transfer (e.g., 10.5)
 * @returns Transaction hash
 */
export async function transferUSDCFromMerchantToUser(
  merchantWalletId: string,
  userWalletAddress: string,
  amount: number
): Promise<string> {
  console.log('[USDC Transfer] Starting transfer', {
    merchantWalletId,
    to: userWalletAddress,
    amount: `${amount} USDC`,
  });

  // Verify authorization key is configured
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  const authKeyId = process.env.PRIVY_AUTHORIZATION_KEY_ID;
  const authPrivateKey = process.env.PRIVY_AUTHORIZATION_PRIVATE_KEY;
  
  if (!appId || !appSecret || !authKeyId || !authPrivateKey) {
    throw new Error('Privy credentials not configured. Check .env.local');
  }

  try {
    // Convert amount to wei (USDC has 6 decimals)
    const amountInWei = parseUnits(amount.toString(), 6);
    
    // Encode USDC ERC-20 transfer function call
    const data = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [userWalletAddress as `0x${string}`, amountInWei],
    });

    console.log('[USDC Transfer] Encoded transaction data:', {
      to: USDC_ADDRESS,
      data: data.substring(0, 66) + '...',
      chainId: sepolia.id,
      amountInWei: amountInWei.toString(),
    });

    // Use Privy REST API for wallet transaction signing
    // Privy API v1 endpoint for embedded wallet RPC
    const apiUrl = `https://auth.privy.io/api/v1/wallets/${merchantWalletId}/rpc`;
    console.log('[USDC Transfer] Calling Privy API:', apiUrl);
    console.log('[USDC Transfer] Auth config:', {
      hasAppId: !!appId,
      hasAppSecret: !!appSecret,
      hasAuthKeyId: !!authKeyId,
      hasAuthPrivateKey: !!authPrivateKey,
      authKeyId,
      merchantWalletId,
    });

    const requestBody = {
      method: 'eth_sendTransaction',
      params: [{
        to: USDC_ADDRESS,
        data: data,
        chainId: `0x${sepolia.id.toString(16)}`, // Hex: 0xaa36a7
      }],
    };

    console.log('[USDC Transfer] Request body:', JSON.stringify(requestBody, null, 2));

    const headers = {
      'Content-Type': 'application/json',
      'privy-app-id': appId,
      'Authorization': `Basic ${Buffer.from(`${appId}:${appSecret}`).toString('base64')}`,
      'privy-authorization-key-id': authKeyId,
      'privy-authorization-private-key': authPrivateKey,
    };

    console.log('[USDC Transfer] Request headers:', {
      'Content-Type': headers['Content-Type'],
      'privy-app-id': headers['privy-app-id'],
      'Authorization': headers['Authorization'].substring(0, 20) + '...',
      'privy-authorization-key-id': headers['privy-authorization-key-id'],
      'privy-authorization-private-key': headers['privy-authorization-private-key'].substring(0, 30) + '...',
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    console.log('[USDC Transfer] Privy API response status:', response.status);
    console.log('[USDC Transfer] Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('[USDC Transfer] Response body (raw):', responseText);

    if (!response.ok) {
      console.error('[USDC Transfer] Privy API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText,
      });
      throw new Error(`Privy API error: ${response.status} ${response.statusText} - ${responseText}`);
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[USDC Transfer] Failed to parse response:', parseError);
      throw new Error(`Invalid JSON response from Privy: ${responseText.substring(0, 200)}`);
    }

    console.log('[USDC Transfer] Privy API response (parsed):', JSON.stringify(result, null, 2));

    const txHash = result.result || result.data?.transaction_hash || result.data?.txHash;

    if (!txHash) {
      console.error('[USDC Transfer] No transaction hash in response:', result);
      throw new Error('No transaction hash returned from Privy');
    }

    console.log('[USDC Transfer] Transaction sent successfully', {
      txHash,
      explorerUrl: `https://sepolia.etherscan.io/tx/${txHash}`,
    });

    return txHash;
  } catch (error) {
    console.error('[USDC Transfer] Failed:', error);
    throw new Error(
      `USDC transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
