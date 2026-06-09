import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';
import { z } from 'zod';

export const runtime = 'nodejs';

const updateUpiSchema = z.object({
  userUpiId: z.string().trim().min(3).max(50),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { privyId } = await requirePrivyUser(request);
    const supabase = await createClient();
    const { id: orderId } = await params;

    const body = await request.json();
    const parsed = updateUpiSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid UPI ID', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { userUpiId } = parsed.data;

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('privy_user_id', privyId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, type, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    if (order.type !== 'offramp') {
      return NextResponse.json(
        { error: 'Can only update UPI for off-ramp orders' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        user_upi_id: userUpiId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update UPI', detail: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'UPI ID updated',
      userUpiId,
    });

  } catch (error) {
    console.error('[Update UPI] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
