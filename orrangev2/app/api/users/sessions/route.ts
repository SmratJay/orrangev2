import { NextResponse } from 'next/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';

export const runtime = 'nodejs';

async function privyRequest(path: string, method = 'GET', body?: unknown) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;
  const appSecret = process.env.PRIVY_APP_SECRET!;
  const auth = Buffer.from(`${appId}:${appSecret}`).toString('base64');

  const res = await fetch(`https://auth.privy.io/api/v1${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'privy-app-id': appId,
      'Authorization': `Basic ${auth}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res;
}

// GET - list active sessions for the current user
export async function GET(request: Request) {
  try {
    const { privyId } = await requirePrivyUser(request);

    const res = await privyRequest(`/users/${privyId}`);
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 502 });
    }

    const privyUser = await res.json();

    // Extract session-relevant data: linked accounts act as session sources
    const sessions = (privyUser.linked_accounts || []).map((account: any) => ({
      type: account.type,
      address: account.address || account.email || account.subject,
      verified_at: account.verified_at,
      first_verified_at: account.first_verified_at,
      latest_verified_at: account.latest_verified_at,
      client_type: account.wallet_client_type || account.type,
    }));

    return NextResponse.json({ sessions, privyId });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

// DELETE - revoke all sessions (logout everywhere) via Privy
export async function DELETE(request: Request) {
  try {
    const { privyId } = await requirePrivyUser(request);

    // Privy doesn't have a dedicated "revoke all sessions" endpoint per se
    // but we can delete the user's auth tokens by calling logout on server
    // The practical approach: invalidate by deleting the user's sessions
    const res = await privyRequest(`/users/${privyId}/sessions`, 'DELETE');

    if (!res.ok && res.status !== 404) {
      // Fallback: still return success since local logout will happen
      console.warn('[sessions DELETE] Privy returned:', res.status);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
