"use client"
import { usePrivy } from "@privy-io/react-auth"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { AuthLayout } from "@/components/auth-layout"
import { Wallet, Mail } from "lucide-react"

export default function SignupPage() {
  const { login, authenticated, user } = usePrivy()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const checkUserTypeAndRedirect = async () => {
      if (authenticated && user) {
        try {
          console.log('[Signup] Checking if user exists in database...');
          
          // Check database for existing user (source of truth)
          const response = await fetch('/api/users/me');
          
          if (response.ok) {
            const userData = await response.json();
            console.log('[Signup] Existing user found:', userData.user_type);
            
            // Redirect based on user_type from database
            if (userData.user_type === 'merchant') {
              console.log('[Signup] Redirecting to /merchant');
              router.push('/merchant');
              return;
            }
            
            if (userData.user_type === 'admin') {
              console.log('[Signup] Redirecting to /admin');
              router.push('/admin');
              return;
            }
            
            // Regular user - go to dashboard
            console.log('[Signup] Redirecting to /dashboard');
            router.push('/dashboard');
            return;
          }
          
          // User doesn't exist in database - new signup
          console.log('[Signup] New user, redirecting to /dashboard/setup');
          router.push('/dashboard/setup');
          
        } catch (error) {
          console.error('[Signup] Error checking user:', error);
          // On error, assume new user
          router.push('/dashboard/setup');
        }
      }
    }
    
    checkUserTypeAndRedirect();
  }, [authenticated, user, router])

  const handleSignup = async () => {
    setIsLoading(true)
    try {
      login()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout title="Create Account" description="Join BlockRamp and start converting crypto today">
      <div className="space-y-4">
        <Button
          onClick={handleSignup}
          disabled={isLoading}
          className="w-full bg-primary hover:bg-primary/90 flex items-center justify-center gap-2"
          size="lg"
        >
          <Wallet className="w-4 h-4" />
          {isLoading ? "Creating..." : "Create with Wallet"}
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
          onClick={handleSignup}
          disabled={isLoading}
          variant="outline"
          className="w-full flex items-center justify-center gap-2 bg-transparent"
          size="lg"
        >
          <Mail className="w-4 h-4" />
          {isLoading ? "Creating..." : "Create with Email"}
        </Button>
      </div>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        <p>Already have an account?</p>
        <p className="text-primary mt-1">Log in with your wallet or email</p>
      </div>
    </AuthLayout>
  )
}
