"use client"

import type React from "react"
import { usePrivy } from "@privy-io/react-auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export function AuthGuard({
  children,
}: {
  children: React.ReactNode
}) {
  const { ready, authenticated } = usePrivy()
  const router = useRouter()

  useEffect(() => {
    // Wait until Privy is ready before making decisions
    if (ready && !authenticated) {
      router.push("/auth/login")
    }
  }, [ready, authenticated, router])

  // Privy not initialized yet → show loader
  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Ready but unauthenticated → redirect in effect
  if (!authenticated) {
    return null
  }

  return <>{children}</>
}
