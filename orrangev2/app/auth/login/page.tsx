"use client"
import { usePrivy } from "@privy-io/react-auth"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { AuthLayout } from "@/components/auth-layout"
import { Wallet, Mail } from "lucide-react"

export default function LoginPage() {
  const { login, authenticated, user } = usePrivy()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (authenticated) {
      router.push("/dashboard")
    }
  }, [authenticated, router])

  const handleLogin = async () => {
    setIsLoading(true)
    try {
      login()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout title="Login" description="Connect your wallet or email to access BlockRamp">
      <div className="space-y-4">
        <Button
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full bg-primary hover:bg-primary/90 flex items-center justify-center gap-2"
          size="lg"
        >
          <Wallet className="w-4 h-4" />
          {isLoading ? "Connecting..." : "Connect Wallet"}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-card text-muted-foreground">or</span>
          </div>
        </div>

        <Button
          onClick={handleLogin}
          disabled={isLoading}
          variant="outline"
          className="w-full flex items-center justify-center gap-2 bg-transparent"
          size="lg"
        >
          <Mail className="w-4 h-4" />
          {isLoading ? "Connecting..." : "Login with Email"}
        </Button>
      </div>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        <p>Don't have an account?</p>
        <p className="text-primary mt-1">Sign up during the login process</p>
      </div>
    </AuthLayout>
  )
}
