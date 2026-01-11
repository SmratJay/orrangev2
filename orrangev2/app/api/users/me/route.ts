import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';

export const runtime = 'nodejs';

/**
 * GET /api/users/me
 * Get current user's data including user_type
 */
export async function GET(request: Request) {
  try {
    const { privyId } = await requirePrivyUser(request);
    console.log('[API /users/me] Privy ID:', privyId);
    
    const supabase = await createClient();

    // Get user data
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, user_type, privy_user_id, smart_wallet_address, embedded_wallet_address')
      .eq('privy_user_id', privyId)
      .single();

    console.log('[API /users/me] Query result:', { user, error });

    if (error || !user) {
      console.error('[API /users/me] User not found for privy_id:', privyId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If user is a merchant, fetch merchant_id
    let responseData = { ...user };
    if (user.user_type === 'merchant') {
      const { data: merchant } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (merchant) {
        responseData.merchant_id = merchant.id;
      }
    }

    console.log('[API /users/me] Returning user:', responseData);
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}
