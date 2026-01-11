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
    const checkUserTypeAndRedirect = async () => {
      if (authenticated && user) {
        try {
          console.log('[Login] Checking user type from database...');
          
          // Always check database (source of truth)
          const userResponse = await fetch('/api/users/me');
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            console.log('[Login] User data from DB:', userData);
            
            if (userData.user_type === 'merchant') {
              console.log('[Login] Redirecting to /merchant');
              router.push('/merchant');
              return;
            }
            
            if (userData.user_type === 'admin') {
              console.log('[Login] Redirecting to /admin');
              router.push('/admin');
              return;
            }
            
            // Regular user - go to dashboard
            console.log('[Login] Redirecting to /dashboard');
            router.push('/dashboard');
            return;
          }
          
          // User not found in database - new user, shouldn't happen on login
          console.log('[Login] User not in database, redirecting to /dashboard/setup');
          router.push('/dashboard/setup');
        } catch (error) {
          console.error('[Login] Error checking user type:', error);
          router.push('/dashboard');
        }
      }
    }
    
    checkUserTypeAndRedirect();
  }, [authenticated, user, router])

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
