'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function UserSync() {
  const { user, ready, authenticated } = usePrivy();

  useEffect(() => {
    const syncUser = async () => {
      if (ready && authenticated && user) {
        // 1. Check if user exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('privy_user_id', user.id)
          .single();

        // 2. If not, insert them
        if (!existingUser) {
          const { error } = await supabase.from('users').insert({
            privy_user_id: user.id,
            email: user.email?.address, // Assuming email login
            wallet_address: user.wallet?.address,
            kyc_status: 'pending',
          });

          if (error) console.error('Error syncing user:', error);
          else console.log('User synced to DB');
        }
      }
    };

    syncUser();
  }, [user, ready, authenticated]);

  return null; // This component is invisible
}