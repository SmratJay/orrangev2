import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';

export const runtime = 'nodejs';

/**
 * POST /api/wallet/withdraw
 * Record a new withdrawal transaction
 */
export async function POST(request: Request) {
  try {
    const { privyId } = await requirePrivyUser(request);
    const { amount, destinationAddress, txHash, status = 'pending' } = await request.json();

    if (!amount || !destinationAddress) {
      return NextResponse.json({ 
        error: 'Missing required fields: amount and destinationAddress' 
      }, { status: 400 });
    }

    const supabase = await createClient();

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('privy_user_id', privyId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Insert withdrawal record
    const { data: withdrawal, error } = await supabase
      .from('withdrawals')
      .insert({
        user_id: user.id,
        amount: amount,
        destination_address: destinationAddress,
        tx_hash: txHash,
        status: status,
        network: 'sepolia',
        token_symbol: 'USDC'
      })
      .select()
      .single();

    if (error) {
      console.error('[wallet-withdraw] Insert error:', error);
      return NextResponse.json({ 
        error: 'Failed to record withdrawal',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      withdrawal
    });

  } catch (error) {
    console.error('[wallet-withdraw] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * PATCH /api/wallet/withdraw
 * Update withdrawal status (e.g., after blockchain confirmation)
 */
export async function PATCH(request: Request) {
  try {
    const { privyId } = await requirePrivyUser(request);
    const { withdrawalId, status, completedAt } = await request.json();

    if (!withdrawalId || !status) {
      return NextResponse.json({ 
        error: 'Missing required fields: withdrawalId and status' 
      }, { status: 400 });
    }

    const supabase = await createClient();

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('privy_user_id', privyId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update withdrawal
    const updateData: any = { status };
    if (completedAt) updateData.completed_at = completedAt;

    const { data: withdrawal, error } = await supabase
      .from('withdrawals')
      .update(updateData)
      .eq('id', withdrawalId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[wallet-withdraw] Update error:', error);
      return NextResponse.json({ 
        error: 'Failed to update withdrawal',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      withdrawal
    });

  } catch (error) {
    console.error('[wallet-withdraw] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
