"use client"

import type React from "react"
import { usePrivy } from "@privy-io/react-auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export function AuthGuard({
  children,
  requiredRole,
}: { children: React.ReactNode; requiredRole?: "user" | "merchant" | "admin" }) {
  const { authenticated, user, isLoading } = usePrivy()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !authenticated) {
      router.push("/auth/login")
    }
  }, [authenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!authenticated) {
    return null
  }

  return <>{children}</>
}
