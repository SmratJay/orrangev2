'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { sepolia } from 'viem/chains';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        // 🔐 Chains
        defaultChain: sepolia,
        supportedChains: [sepolia],

        // 🔑 Auth methods
        loginMethods: ['email', 'google'],

        // 🎨 UI
        appearance: {
          theme: 'dark',
          accentColor: '#676FFF',
          showWalletLoginFirst: false,
        },

        // 🧠 Smart Account Configuration (Account Abstraction)
        embeddedWallets: {
          // createOnLogin: 'users-without-wallets', // Requires newer SDK version
          // requireUserPasswordOnCreate: false, // Requires newer SDK version
        },

        // 💰 External wallet configuration
        externalWallets: {
          coinbaseWallet: {
            // connectionOptions: 'smartWalletOnly', // Requires newer SDK version
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
