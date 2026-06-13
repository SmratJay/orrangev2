"use client"

import { useState, useEffect } from "react"
import { usePrivy, useWallets, useCreateWallet, getAccessToken } from "@privy-io/react-auth"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { History, ArrowLeft, Copy, Wallet as WalletIcon, RefreshCw, ArrowDownLeft, ArrowUpRight, ExternalLink, TrendingUp, Clock, CheckCircle2 } from "lucide-react"
import { AuthGuard } from "@/components/auth-guard"
import { BuyForm } from "@/components/buy-form"
import { SellForm } from "@/components/sell-form"
import { WalletBalance } from "@/components/wallet-balance"
import { ProfileMenu } from "@/components/profile-menu"
import { WelcomeAnimation } from "@/components/welcome-animation"
import { NameCaptureModal } from "@/components/name-capture-modal"
import { NotificationBell } from "@/components/notification-bell"

function DashboardContent() {
  const { user } = usePrivy()
  const { wallets, ready: walletsReady } = useWallets()
  const { createWallet } = useCreateWallet()
  const router = useRouter()
  const [view, setView] = useState<'overview' | 'buy' | 'sell' | 'history'>('overview')
  const [isCheckingUserType, setIsCheckingUserType] = useState(true)
  const [embeddedWalletAddress, setEmbeddedWalletAddress] = useState<string | null>(null)
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState<any[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [fullName, setFullName] = useState<string | null>(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const [showNameCapture, setShowNameCapture] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

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

  // Fetch orders on mount for Recent Activity section
  useEffect(() => {
    fetchOrders()
  }, [])

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

          if (userData.id) setUserId(userData.id)
          // New user — no name yet, show capture modal
          if (!userData.full_name) {
            setShowNameCapture(true)
          } else {
            setFullName(userData.full_name)
            // Show welcome animation once per session
            const welcomeKey = 'orrange_welcomed'
            if (!sessionStorage.getItem(welcomeKey)) {
              sessionStorage.setItem(welcomeKey, '1')
              setShowWelcome(true)
            }
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
      <div className="min-h-screen flex items-center justify-center" style={{background:'#0B0C0E'}}>
        <div className="text-center">
          <div className="w-10 h-10 rounded-full animate-spin mx-auto mb-4" style={{border:'2px solid rgba(255,122,26,0.2)', borderTopColor:'#FF7A1A'}} />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{background:'#0B0C0E'}}>
      {/* Name capture for new users */}
      {showNameCapture && (
        <NameCaptureModal onComplete={(name) => {
          setFullName(name)
          setShowNameCapture(false)
          setShowWelcome(true)
        }} />
      )}

      {/* Welcome animation - once per session */}
      {showWelcome && (
        <WelcomeAnimation name={fullName || user?.email?.address?.split('@')[0] || 'there'} />
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/5" style={{background:'rgba(11,12,14,0.8)', backdropFilter:'blur(20px)'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('overview')}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:'linear-gradient(135deg,#FF7A1A,#FF8F3A)'}}>
              <span className="text-black font-bold text-sm">O</span>
            </div>
            <h1 className="text-xl font-bold text-white">ORRANGE</h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell userId={userId || undefined} />
            <ProfileMenu
              fullName={fullName}
              walletAddress={embeddedWalletAddress}
              userType="user"
              onNameChange={setFullName}
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        {(view === 'buy' || view === 'sell' || view === 'history') && (
          <button
            className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition"
            onClick={() => setView('overview')}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        )}

        {view === 'buy' ? (
          <div className="flex justify-center"><BuyForm /></div>
        ) : view === 'sell' ? (
          <div className="flex justify-center"><SellForm /></div>
        ) : view === 'history' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Order History</h2>
              <span className="text-sm text-muted-foreground">{orders.length} orders</span>
            </div>
            {loadingOrders ? (
              <div className="text-center py-16">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground mt-3 text-sm">Loading orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="glass-card rounded-xl p-16 text-center">
                <Clock className="w-10 h-10 mx-auto mb-4 text-muted-foreground/40" />
                <p className="text-muted-foreground">No orders yet. Start your first conversion!</p>
              </div>
            ) : (
              orders.map((order: any) => (
                <div
                  key={order.id}
                  className="glass-card rounded-xl p-5 cursor-pointer transition-all duration-200 hover:border-primary/30"
                  style={{borderColor: 'rgba(255,255,255,0.06)'}}
                  onClick={() => router.push(`/order/${order.id}`)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {order.type === 'onramp'
                          ? <ArrowDownLeft className="w-4 h-4 text-green-400" />
                          : <ArrowUpRight className="w-4 h-4 text-primary" />
                        }
                        <span className="font-medium text-white">{order.type === 'onramp' ? 'On-Ramp' : 'Off-Ramp'}</span>
                        <span className="text-xs text-muted-foreground font-mono">#{order.id.slice(0, 8)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        order.status === 'completed' ? 'bg-green-500/15 text-green-400' :
                        order.status === 'pending' ? 'bg-yellow-500/15 text-yellow-400' :
                        order.status === 'accepted' ? 'bg-blue-500/15 text-blue-400' :
                        'bg-white/10 text-muted-foreground'
                      }`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                    <div className="flex gap-6">
                      <div>
                        <p className="text-xs text-muted-foreground">Fiat</p>
                        <p className="font-semibold text-white">₹{order.fiat_amount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">USDC</p>
                        <p className="font-semibold text-primary">{order.usdc_amount} USDC</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground/60">View →</span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <>
            {/* Welcome */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-1">
                Welcome back{fullName ? <span className="text-primary"> {fullName}</span> : ''}
              </h2>
              <p className="text-muted-foreground">Your P2P crypto gateway</p>
            </div>

            {/* Top row: Wallet Balance + Wallet Address */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <WalletBalance />

              {embeddedWalletAddress ? (
                <div className="glass-card rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                      <WalletIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">Embedded Wallet</p>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg mb-3" style={{background:'rgba(255,255,255,0.04)'}}>
                    <code className="flex-1 text-xs font-mono text-muted-foreground truncate">{embeddedWalletAddress}</code>
                    <button onClick={copyAddress} className="shrink-0 p-1 hover:bg-white/10 rounded transition">
                      {copiedAddress
                        ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                        : <Copy className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => window.open(`https://sepolia.etherscan.io/address/${embeddedWalletAddress}`, '_blank')}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition px-2 py-1 rounded hover:bg-white/10"
                    >
                      <ExternalLink className="w-3 h-3" /> Explorer
                    </button>
                    <button
                      onClick={() => window.open('https://sepoliafaucet.com/', '_blank')}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition px-2 py-1 rounded hover:bg-white/10"
                    >
                      Get Testnet ETH
                    </button>
                  </div>
                </div>
              ) : (
                <div className="glass-card rounded-xl p-6 border border-yellow-500/20">
                  <div className="flex items-center gap-2 mb-4">
                    <WalletIcon className="w-5 h-5 text-yellow-400" />
                    <p className="font-medium text-white">No Wallet Found</p>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {!walletsReady ? 'Checking for wallet...' : 'Create an embedded wallet to start using ORRANGE'}
                  </p>
                  {walletsReady && (
                    <Button onClick={handleCreateWallet} disabled={loading} className="w-full btn-orange border-0">
                      {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <WalletIcon className="w-4 h-4 mr-2" />}
                      {loading ? 'Creating...' : 'Create Embedded Wallet'}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <button
                onClick={() => setView('buy')}
                className="glass-card rounded-xl p-6 text-left transition-all duration-300 hover:-translate-y-1 group"
                style={{borderColor:'rgba(255,122,26,0.15)'}}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{background:'rgba(255,122,26,0.15)'}}>
                  <ArrowDownLeft className="w-5 h-5 text-primary" />
                </div>
                <p className="font-semibold text-white mb-1">On-Ramp</p>
                <p className="text-sm text-muted-foreground">INR → USDC</p>
              </button>

              <button
                onClick={() => setView('sell')}
                className="glass-card rounded-xl p-6 text-left transition-all duration-300 hover:-translate-y-1 group"
                style={{borderColor:'rgba(34,197,94,0.15)'}}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{background:'rgba(34,197,94,0.12)'}}>
                  <ArrowUpRight className="w-5 h-5 text-green-400" />
                </div>
                <p className="font-semibold text-white mb-1">Off-Ramp</p>
                <p className="text-sm text-muted-foreground">USDC → INR</p>
              </button>

              <button
                onClick={() => setView('history')}
                className="glass-card rounded-xl p-6 text-left transition-all duration-300 hover:-translate-y-1 group"
                style={{borderColor:'rgba(255,255,255,0.06)'}}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{background:'rgba(255,255,255,0.06)'}}>
                  <History className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="font-semibold text-white mb-1">History</p>
                <p className="text-sm text-muted-foreground">Past transactions</p>
              </button>
            </div>

            {/* Recent activity preview */}
            <div className="glass-card rounded-xl">
              <div className="flex items-center justify-between p-6 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-white">Recent Activity</h3>
                </div>
                <button onClick={() => { setView('history'); fetchOrders(); }} className="text-sm text-primary hover:text-primary/80 transition">
                  View all →
                </button>
              </div>
              <div className="p-6">
                {loadingOrders ? (
                  <div className="text-center py-8">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-8 h-8 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-muted-foreground text-sm">No transactions yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Start your first conversion above</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.slice(0, 3).map((order: any) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-white/5 transition"
                        onClick={() => router.push(`/order/${order.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            order.type === 'onramp' ? 'bg-green-500/10' : 'bg-primary/10'
                          }`}>
                            {order.type === 'onramp'
                              ? <ArrowDownLeft className="w-4 h-4 text-green-400" />
                              : <ArrowUpRight className="w-4 h-4 text-primary" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{order.type === 'onramp' ? 'On-Ramp' : 'Off-Ramp'}</p>
                            <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-white">{order.usdc_amount} USDC</p>
                          <span className={`text-xs ${
                            order.status === 'completed' ? 'text-green-400' :
                            order.status === 'pending' ? 'text-yellow-400' : 'text-muted-foreground'
                          }`}>{order.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
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