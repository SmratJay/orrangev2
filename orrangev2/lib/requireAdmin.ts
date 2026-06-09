import { createClient } from '@/lib/server';

export async function requireAdminUser(privyId: string) {
  const supabase = await createClient();

  const { data: user, error } = await supabase
    .from('users')
    .select('id, user_type')
    .eq('privy_user_id', privyId)
    .single();

  if (error || !user || user.user_type !== 'admin') {
    throw new Error('Unauthorized - Admin access required');
  }

  return user;
}
