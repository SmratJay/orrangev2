import { NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits } from 'viem';
import { sepolia } from 'viem/chains';

export const runtime = 'nodejs';

const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as `0x${string}`;

const USDC_ABI = [{
  name: 'balanceOf',
  type: 'function',
  inputs: [{ name: 'owner', type: 'address' }],
  outputs: [{ name: 'balance', type: 'uint256' }],
  stateMutability: 'view',
}] as const;

const RPC_URLS = [
  'https://sepolia.drpc.org',
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://1rpc.io/sepolia',
  'https://rpc.sepolia.org',
  'https://rpc2.sepolia.org',
];

async function tryRpc(url: string, address: `0x${string}`) {
  const client = createPublicClient({
    chain: sepolia,
    transport: http(url, { timeout: 8000 }),
  });
  const [usdcBalance, ethBalance] = await Promise.all([
    client.readContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [address],
    }) as Promise<bigint>,
    client.getBalance({ address }),
  ]);
  return { usdcBalance, ethBalance };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
  }

  try {
    const result = await Promise.any(
      RPC_URLS.map(url => tryRpc(url, address as `0x${string}`))
    );

    return NextResponse.json({
      usdc: formatUnits(result.usdcBalance, 6),
      eth: formatUnits(result.ethBalance, 18),
    });
  } catch (err) {
    console.error('[/api/wallet/balance] All RPCs failed:', err);
    return NextResponse.json({ error: 'All RPC endpoints failed' }, { status: 503 });
  }
}
