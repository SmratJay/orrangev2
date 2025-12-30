'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { sepolia } from 'viem/chains';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={{
        // 1. Force Sepolia Network only
        defaultChain: sepolia,
        supportedChains: [sepolia],
        
        // 2. UI Configuration - Clean look
        appearance: {
          theme: 'dark',
          accentColor: '#676FFF',
          showWalletLoginFirst: false,
        },
        
        // 3. Auth Strategy: Social/Email only (No external wallet buttons)
        loginMethods: ['email', 'google'], 
        
        // 4. Embedded Wallet Config - This makes it "Invisible" to the user
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
          requireUserPasswordOnCreate: false, // Smoother UX for prototype
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}