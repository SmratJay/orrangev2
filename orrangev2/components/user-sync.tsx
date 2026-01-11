'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useEffect, useRef } from 'react';

export function UserSync() {
  const { user, ready, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const hasSyncedRef = useRef(false);
  const lastWalletRef = useRef<string | null>(null);

  useEffect(() => {
    const syncUser = async () => {
      if (!ready || !authenticated || !user) return;

      // Find embedded wallet
      const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');
      const walletAddress = embeddedWallet?.address || null;
      const walletId = (embeddedWallet as any)?.id || null; // Privy's internal wallet ID
      
      // Only sync if:
      // 1. We haven't synced yet, OR
      // 2. Wallet address changed (was null, now has value)
      const shouldSync = !hasSyncedRef.current || 
        (walletAddress && lastWalletRef.current !== walletAddress);
      
      if (!shouldSync) return;

      try {
        console.log('[UserSync] Syncing user:', {
          privyId: user.id,
          email: user.email?.address,
          embeddedWallet: walletAddress,
          walletId: walletId,
        });

        // Sync user with backend via API
        // NOTE: We do NOT send user_type - that's managed by admin/fix-merchant endpoint
        const response = await fetch('/api/auth/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            privy_id: user.id,
            email: user.email?.address || null,
            embedded_wallet_address: walletAddress,
            privy_wallet_id: walletId,
          }),
        });

        if (response.ok) {
          hasSyncedRef.current = true;
          lastWalletRef.current = walletAddress;
          console.log('[UserSync] Sync successful');
        }
      } catch (error) {
        console.error('Error syncing user:', error);
      }
    };

    syncUser();
  }, [user, ready, authenticated, wallets]);

  return null;
}