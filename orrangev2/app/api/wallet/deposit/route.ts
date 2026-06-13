import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';

export const runtime = 'nodejs';

/**
 * POST /api/wallet/deposit
 * Record an external deposit (when someone sends USDC to the wallet)
 */
export async function POST(request: Request) {
  try {
    const { privyId } = await requirePrivyUser(request);
    const { amount, fromAddress, txHash } = await request.json();

    if (!amount || !fromAddress || !txHash) {
      return NextResponse.json({ 
        error: 'Missing required fields: amount, fromAddress, txHash' 
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

    // Check if deposit already recorded (prevent duplicates)
    const { data: existing } = await supabase
      .from('external_deposits')
      .select('id')
      .eq('tx_hash', txHash)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      return NextResponse.json({ 
        success: true,
        message: 'Deposit already recorded',
        deposit: existing
      });
    }

    // Insert deposit record
    const { data: deposit, error } = await supabase
      .from('external_deposits')
      .insert({
        user_id: user.id,
        amount: amount,
        from_address: fromAddress,
        tx_hash: txHash,
        token_symbol: 'USDC',
        network: 'sepolia'
      })
      .select()
      .single();

    if (error) {
      console.error('[wallet-deposit] Insert error:', error);
      return NextResponse.json({ 
        error: 'Failed to record deposit',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      deposit
    });

  } catch (error) {
    console.error('[wallet-deposit] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * GET /api/wallet/deposit
 * Get external deposits for the user
 */
export async function GET(request: Request) {
  try {
    const { privyId } = await requirePrivyUser(request);
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

    // Fetch deposits
    const { data: deposits, error } = await supabase
      .from('external_deposits')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[wallet-deposit] Fetch error:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch deposits',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      deposits: deposits || []
    });

  } catch (error) {
    console.error('[wallet-deposit] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
