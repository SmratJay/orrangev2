import { NextResponse } from 'next/server';
import { makeMerchant } from '@/lib/make-merchant';

export const runtime = 'nodejs';

/**
 * POST /api/admin/quick-promote
 * Quick endpoint to promote current user to merchant (for testing)
 * In production, remove this or add proper auth
 */
export async function POST(request: Request) {
  try {
    const { privyUserId, upiId, inventoryBalance } = await request.json();

    if (!privyUserId) {
      return NextResponse.json({ error: 'privyUserId required' }, { status: 400 });
    }

    const success = await makeMerchant(
      privyUserId,
      upiId || 'merchant@paytm',
      inventoryBalance || 10000
    );

    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: `User ${privyUserId} is now a merchant. Please logout and login again.` 
      });
    } else {
      return NextResponse.json({ error: 'Failed to promote user' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error promoting user:', error);
    return NextResponse.json({ error: 'Failed to promote user' }, { status: 500 });
  }
}
