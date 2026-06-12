import { NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';

export const runtime = 'nodejs';

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: Request) {
  try {
    const { privyId } = await requirePrivyUser(request);
    const supabase = await createClient();

    const { data: user } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('privy_user_id', privyId)
      .single();

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, type, status, fiat_amount, usdc_amount, user_upi_id, payment_reference, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const headers = [
      'Order ID', 'Type', 'Status',
      'USDC Amount', 'INR Amount', 'UPI ID',
      'Payment Reference', 'Created At', 'Updated At'
    ];

    const rows = (orders || []).map(o => [
      o.id,
      o.type === 'onramp' ? 'On-Ramp (INR→USDC)' : 'Off-Ramp (USDC→INR)',
      o.status,
      o.usdc_amount,
      o.fiat_amount,
      o.user_upi_id || '',
      o.payment_reference || '',
      new Date(o.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      new Date(o.updated_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    ]);

    const csv = [
      `# ORRANGE Transaction Export`,
      `# User: ${user.full_name || user.email}`,
      `# Exported: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`,
      `# Total Orders: ${rows.length}`,
      '',
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(',')),
    ].join('\n');

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="orrange-orders-${Date.now()}.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
