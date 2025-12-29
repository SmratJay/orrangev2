"use client"

import type React from "react"
import { PrivyProvider } from "@privy-io/react-auth"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
        appearance: {
          theme: "dark",
          accentColor: "#FF8C00",
        },
      }}
    >
      {children}
    </PrivyProvider>
  )
}
