"use client"

import { useState, useEffect } from "react"
import { usePrivy, useWallets, useCreateWallet, getAccessToken } from "@privy-io/react-auth"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDownUp, Plus, History, LogOut, ArrowLeft, Copy, Wallet as WalletIcon, RefreshCw } from "lucide-react"
import Link from "next/link"
import { AuthGuard } from "@/components/auth-guard"
import { BuyForm } from "@/components/buy-form"
import { WalletBalance } from "@/components/wallet-balance"

function DashboardContent() {
  const { user, logout, ready: privyReady } = usePrivy()
  const { wallets, ready: walletsReady } = useWallets()
  const { createWallet } = useCreateWallet()
  const router = useRouter()
  const [view, setView] = useState<'overview' | 'buy' | 'history'>('overview')
  const [isCheckingUserType, setIsCheckingUserType] = useState(true)
  const [embeddedWalletAddress, setEmbeddedWalletAddress] = useState<string | null>(null)
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState<any[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  // Get embedded wallet address - recheck when wallets change
  useEffect(() => {
    console.log('[Dashboard] Wallets state:', { 
      walletsReady, 
      walletsCount: wallets?.length,
      wallets: wallets?.map(w => ({ type: w.walletClientType, address: w.address }))
    })
    
    if (walletsReady && wallets && wallets.length > 0) {
      const embedded = wallets.find((w) => w.walletClientType === 'privy')
      if (embedded) {
        console.log('[Dashboard] Found embedded wallet:', embedded.address)
        setEmbeddedWalletAddress(embedded.address)
      }
    }
  }, [wallets, walletsReady])

  // Handle wallet creation
  const handleCreateWallet = async () => {
    try {
      console.log('[Dashboard] Creating wallet...')
      await createWallet()
      console.log('[Dashboard] Wallet created successfully')
    } catch (error) {
      console.error('[Dashboard] Error creating wallet:', error)
    }
  }

  // Copy address to clipboard
  const copyAddress = () => {
    if (embeddedWalletAddress) {
      navigator.clipboard.writeText(embeddedWalletAddress)
      setCopiedAddress(true)
      setTimeout(() => setCopiedAddress(false), 2000)
    }
  }

  // Fetch user's orders
  const fetchOrders = async () => {
    setLoadingOrders(true)
    try {
      const authToken = await getAccessToken()
      const res = await fetch('/api/orders/my-orders', {
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : undefined
      })
      const data = await res.json()
      setOrders(data.orders || [])
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoadingOrders(false)
    }
  }

  // Fetch orders when viewing history
  useEffect(() => {
    if (view === 'history') {
      fetchOrders()
    }
  }, [view])

  useEffect(() => {
    const checkUserType = async () => {
      try {
        const response = await fetch('/api/users/me')
        console.log('[Dashboard] /api/users/me response:', response.status)
        
        if (response.ok) {
          const userData = await response.json()
          console.log('[Dashboard] User data:', userData)
          console.log('[Dashboard] User type:', userData.user_type)
          
          // Redirect merchants to merchant dashboard
          if (userData.user_type === 'merchant') {
            console.log('[Dashboard] Redirecting to /merchant')
            router.push('/merchant')
            return
          }
          
          // Redirect admins to admin dashboard
          if (userData.user_type === 'admin') {
            console.log('[Dashboard] Redirecting to /admin')
            router.push('/admin')
            return
          }
          
          console.log('[Dashboard] User is regular user, staying on dashboard')
        } else {
          console.error('[Dashboard] Failed to fetch user data:', response.status)
        }
      } catch (error) {
        console.error('Error checking user type:', error)
      } finally {
        setIsCheckingUserType(false)
      }
    }
    
    if (user) {
      checkUserType()
    }
  }, [user, router])

  if (isCheckingUserType) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 
            className="text-2xl font-bold text-primary cursor-pointer" 
            onClick={() => setView('overview')}
          >
            BlockRamp
          </h1>
          <div className="flex gap-4 items-center">
            <span className="text-sm text-muted-foreground">{user?.email?.address || "User"}</span>
            <Button size="sm" variant="outline" onClick={logout} className="flex items-center gap-2 bg-transparent">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        {(view === 'buy' || view === 'history') && (
          <Button 
            variant="ghost" 
            className="mb-6 flex items-center gap-2" 
            onClick={() => setView('overview')}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        )}

        {/* Conditional Rendering */}
        {view === 'buy' ? (
          <div className="flex justify-center">
            <BuyForm />
          </div>
        ) : view === 'history' ? (
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
              <CardDescription>Your past orders and transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingOrders ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground mt-2">Loading orders...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No orders yet. Start your first conversion!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <Card key={order.id} className="border-border hover:border-primary/50 transition cursor-pointer"
                      onClick={() => router.push(`/order/${order.id}`)}
                    >
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-sm text-muted-foreground">Order #{order.id.slice(0, 8)}</p>
                            <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded ${
                            order.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            order.status === 'merchant_accepted' || order.status === 'accepted' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Amount</p>
                            <p className="font-semibold">₹{order.fiat_amount}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">USDC</p>
                            <p className="font-semibold">{order.usdc_amount} USDC</p>
                          </div>
                        </div>
                        <Button variant="outline" className="w-full mt-4" size="sm">
                          View Details →
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Welcome Section */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">Welcome back</h2>
              <p className="text-muted-foreground">Manage your crypto conversions and transactions</p>
            </div>

            {/* Wallet Address Display */}
            {embeddedWalletAddress ? (
              <Card className="mb-8 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <WalletIcon className="w-5 h-5" />
                    Your Embedded Wallet
                  </CardTitle>
                  <CardDescription>
                    This is your Privy-managed smart wallet on Sepolia testnet
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-background rounded-lg">
                    <code className="flex-1 text-sm font-mono">
                      {embeddedWalletAddress}
                    </code>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={copyAddress}
                      className="shrink-0"
                    >
                      {copiedAddress ? '✓ Copied' : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => window.open(`https://sepolia.etherscan.io/address/${embeddedWalletAddress}`, '_blank')}
                    >
                      View on Explorer
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => window.open('https://sepoliafaucet.com/', '_blank')}
                    >
                      Get Testnet ETH
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="mb-8 border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 to-yellow-500/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <WalletIcon className="w-5 h-5" />
                    No Wallet Found
                  </CardTitle>
                  <CardDescription>
                    {!walletsReady ? 'Loading wallet...' : 'Create an embedded wallet to start using BlockRamp'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!walletsReady ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Checking for wallet...</span>
                    </div>
                  ) : (
                    <Button 
                      onClick={handleCreateWallet}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Creating Wallet...
                        </>
                      ) : (
                        <>
                          <WalletIcon className="w-4 h-4 mr-2" />
                          Create Embedded Wallet
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 2. PLACED HERE: Your Wallet Balance is the first thing users see */}
            <div className="mb-8">
              <WalletBalance />
            </div>

            {/* Quick Actions Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {/* ON RAMP CARD */}
              <Card 
                className="bg-gradient-to-br from-primary/10 to-transparent border-primary/30 hover:border-primary/50 transition cursor-pointer"
                onClick={() => setView('buy')}
              >
                <CardHeader>
                  <Plus className="w-8 h-8 text-primary mb-2" />
                  <CardTitle>On-Ramp</CardTitle>
                  <CardDescription>Convert INR to USDC</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full bg-primary hover:bg-primary/90">Start Conversion</Button>
                </CardContent>
              </Card>

              {/* OFF RAMP CARD */}
              <Card className="bg-gradient-to-br from-accent/10 to-transparent border-accent/30 hover:border-accent/50 transition cursor-pointer opacity-50">
                <CardHeader>
                  <ArrowDownUp className="w-8 h-8 text-accent mb-2" />
                  <CardTitle>Off-Ramp</CardTitle>
                  <CardDescription>Coming Soon (USDC to INR)</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button disabled className="w-full bg-accent hover:bg-accent/90">Locked</Button>
                </CardContent>
              </Card>

              {/* HISTORY CARD */}
              <Card 
                className="border-border hover:border-primary/30 transition cursor-pointer"
                onClick={() => setView('history')}
              >
                <CardHeader>
                  <History className="w-8 h-8 text-muted-foreground mb-2" />
                  <CardTitle>History</CardTitle>
                  <CardDescription>View past transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full bg-transparent">
                    View History
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Your latest conversions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <p>No transactions yet. Start your first conversion!</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  )
}