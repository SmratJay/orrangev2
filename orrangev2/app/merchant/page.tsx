"use client"

import { usePrivy, useWallets, getAccessToken } from "@privy-io/react-auth"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LogOut, CheckCircle, Clock, Send, Copy, Wallet as WalletIcon, RefreshCw } from "lucide-react"
import { AuthGuard } from "@/components/auth-guard"
import { useState, useEffect } from "react"
import { SendUSDC } from "@/components/send-usdc"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { WalletBalance } from "@/components/wallet-balance"

interface Order {
  id: string
  user_id: string
  merchant_id?: string | null
  type: string
  status: string
  fiat_amount: number
  usdc_amount: number
  created_at: string
  payment_reference?: string
  user_wallet_address?: string
  users?: {
    email: string
    smart_wallet_address?: string
    embedded_wallet_address?: string
  }
}

function MerchantContent() {
  const { user, logout } = usePrivy()
  const { wallets, ready: walletsReady } = useWallets()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [paymentRef, setPaymentRef] = useState('')
  const [isCheckingAccess, setIsCheckingAccess] = useState(true)
  const [embeddedWalletAddress, setEmbeddedWalletAddress] = useState<string | null>(null)
  const [copiedAddress, setCopiedAddress] = useState(false)

  // Get embedded wallet address
  useEffect(() => {
    if (walletsReady && wallets && wallets.length > 0) {
      const embedded = wallets.find((w) => w.walletClientType === 'privy')
      if (embedded) {
        setEmbeddedWalletAddress(embedded.address)
      }
    }
  }, [wallets, walletsReady])

  // Copy address to clipboard
  const copyAddress = () => {
    if (embeddedWalletAddress) {
      navigator.clipboard.writeText(embeddedWalletAddress)
      setCopiedAddress(true)
      setTimeout(() => setCopiedAddress(false), 2000)
    }
  }

  // Check if user is actually a merchant
  useEffect(() => {
    const checkMerchantAccess = async () => {
      try {
        const response = await fetch('/api/users/me')
        if (response.ok) {
          const userData = await response.json()
          
          // Redirect non-merchants to dashboard
          if (userData.user_type !== 'merchant') {
            router.push('/dashboard')
            return
          }
        }
      } catch (error) {
        console.error('Error checking merchant access:', error)
        router.push('/dashboard')
      } finally {
        setIsCheckingAccess(false)
      }
    }
    
    checkMerchantAccess()
  }, [router])

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 10000) // Refresh every 10s
    return () => clearInterval(interval)
  }, [])

  const fetchOrders = async () => {
    try {
      console.log('[Merchant] Fetching orders...')
      const authToken = await getAccessToken()
      console.log('[Merchant] Auth token:', authToken ? 'present' : 'missing')
      
      const res = await fetch('/api/orders/pending', {
        credentials: 'include',
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {},
      })
      console.log('[Merchant] Response status:', res.status)
      const data = await res.json()
      console.log('[Merchant] Orders data:', data)
      setOrders(data.orders || [])
    } catch (error) {
      console.error('[Merchant] Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const acceptOrder = async (orderId: string) => {
    try {
      const authToken = localStorage.getItem('privy:token')
      const res = await fetch(`/api/orders/${orderId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      })
      
      if (!res.ok) {
        const error = await res.json()
        alert(error.error || 'Failed to accept order')
        return
      }
      
      // Navigate to merchant order page
      router.push(`/merchant/order/${orderId}`)
    } catch (error) {
      console.error('Failed to accept order:', error)
      alert('Failed to accept order')
    }
  }

  // Get merchant ID from user
  const [merchantId, setMerchantId] = useState<string | null>(null)

  useEffect(() => {
    const getMerchantId = async () => {
      try {
        console.log('[Merchant] Fetching merchant ID...')
        const res = await fetch('/api/users/me')
        const data = await res.json()
        console.log('[Merchant] User data:', data)
        if (data.merchant_id) {
          console.log('[Merchant] Merchant ID:', data.merchant_id)
          setMerchantId(data.merchant_id)
        } else {
          console.log('[Merchant] No merchant_id in response')
        }
      } catch (error) {
        console.error('[Merchant] Failed to get merchant ID:', error)
      }
    }
    getMerchantId()
  }, [])

  // Orders to fulfill: new orders not yet accepted by any merchant
  const ordersToFulfill = orders.filter(o => {
    const match = o.status === 'pending' && !o.merchant_id
    if (orders.length > 0 && orders.length < 10) {
      console.log('[Merchant] Order', o.id.slice(0,8), '- status:', o.status, 'merchant_id:', o.merchant_id, 'match:', match)
    }
    return match
  })
  
  // Pending orders: orders accepted by THIS merchant, awaiting payment confirmation
  const pendingOrders = orders.filter(o => 
    (o.status === 'accepted' || o.status === 'merchant_accepted') && 
    o.merchant_id === merchantId
  )
  
  const readyToFulfill = orders.filter(o => o.status === 'payment_received' && o.merchant_id === merchantId)

  console.log('[Merchant] Filter results:', {
    merchantId,
    totalOrders: orders.length,
    ordersToFulfill: ordersToFulfill.length,
    pendingOrders: pendingOrders.length,
    readyToFulfill: readyToFulfill.length,
    orderStatuses: orders.map(o => ({ id: o.id.slice(0,8), status: o.status, merchant_id: o.merchant_id }))
  })

  // Show loading while checking access
  if (isCheckingAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying merchant access...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">BlockRamp Merchant</h1>
          <div className="flex gap-4 items-center">
            <span className="text-sm text-muted-foreground">{user?.email?.address || "Merchant"}</span>
            <Button size="sm" variant="outline" onClick={logout} className="flex items-center gap-2 bg-transparent">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-2">Merchant Dashboard</h2>
          <p className="text-muted-foreground">Manage orders and fulfill USDC conversions</p>
        </div>

        {/* Wallet Info */}
        <Card className="border-border mb-8 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <WalletIcon className="w-5 h-5 text-primary" />
              Your Merchant Wallet
            </CardTitle>
            <CardDescription>This wallet is used to send USDC to customers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Wallet Address */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Wallet Address (Sepolia)</p>
                {embeddedWalletAddress ? (
                  <div className="flex items-center gap-2 bg-zinc-900 px-3 py-2 rounded-md">
                    <code className="text-sm font-mono text-primary flex-1 truncate">
                      {embeddedWalletAddress}
                    </code>
                    <button 
                      onClick={copyAddress}
                      className="p-1 hover:bg-zinc-800 rounded transition-colors"
                      title="Copy address"
                    >
                      <Copy className={`w-4 h-4 ${copiedAddress ? 'text-green-500' : 'text-muted-foreground'}`} />
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Loading wallet...</p>
                )}
                {copiedAddress && (
                  <p className="text-xs text-green-500 mt-1">Copied to clipboard!</p>
                )}
              </div>
              
              {/* USDC Balance */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">USDC Balance</p>
                <WalletBalance />
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground mt-4 border-t border-border pt-4">
              💡 Fund this wallet with USDC on Sepolia testnet. Get test USDC from{' '}
              <a 
                href="https://faucet.circle.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Circle Faucet
              </a>
            </p>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">New Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-500">{ordersToFulfill.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Available to accept</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-500">{pendingOrders.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting payment</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ready to Send</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">{readyToFulfill.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Payment received</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{orders.length}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>
        </div>

        {/* Orders List */}
        <div className="space-y-6">
          {/* New Orders - To Be Accepted */}
          <Card>
            <CardHeader>
              <CardTitle>📋 Orders to Fulfill</CardTitle>
              <CardDescription>New orders from customers. Accept to start processing.</CardDescription>
            </CardHeader>
            <CardContent>
              {ordersToFulfill.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No new orders</p>
              ) : (
                <div className="space-y-4">
                  {ordersToFulfill.map((order) => (
                    <Card key={order.id} className="border-blue-500/30 bg-blue-950/10">
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Order #{order.id.slice(0, 8)}</p>
                            <p className="font-semibold">{order.users?.email}</p>
                          </div>
                          <span className="px-2 py-1 text-xs font-medium bg-blue-500/20 text-blue-300 rounded">NEW</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-zinc-900 rounded-md">
                          <div>
                            <p className="text-xs text-muted-foreground">Amount (INR)</p>
                            <p className="font-bold">₹{order.fiat_amount}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">USDC to Send</p>
                            <p className="font-bold">{order.usdc_amount} USDC</p>
                          </div>
                        </div>

                        <Button
                          onClick={() => acceptOrder(order.id)}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Accept Order
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Orders - Accepted, Awaiting Payment */}
          <Card>
            <CardHeader>
              <CardTitle>⏳ Pending Orders - Awaiting Payment</CardTitle>
              <CardDescription>Orders you accepted. Waiting for customer payment confirmation.</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingOrders.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No pending orders</p>
              ) : (
                <div className="space-y-4">
                  {pendingOrders.map((order) => (
                    <Card key={order.id} className="border-yellow-500/30 bg-yellow-950/10">
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Order #{order.id.slice(0, 8)}</p>
                            <p className="font-semibold">{order.users?.email}</p>
                          </div>
                          <Clock className="w-5 h-5 text-yellow-500" />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-zinc-900 rounded-md">
                          <div>
                            <p className="text-xs text-muted-foreground">Amount (INR)</p>
                            <p className="font-bold">₹{order.fiat_amount}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">USDC to Send</p>
                            <p className="font-bold">{order.usdc_amount} USDC</p>
                          </div>
                        </div>

                        <Button
                          onClick={() => router.push(`/merchant/order/${order.id}`)}
                          className="w-full"
                          variant="outline"
                        >
                          View Order Details →
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ready to Fulfill - Send USDC</CardTitle>
              <CardDescription>Payment confirmed. Send USDC to complete the order.</CardDescription>
            </CardHeader>
            <CardContent>
              {readyToFulfill.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No orders ready to fulfill</p>
              ) : (
                <div className="space-y-4">
                  {readyToFulfill.map((order) => {
                    const recipientAddress = order.users?.smart_wallet_address || order.users?.embedded_wallet_address || order.user_wallet_address
                    
                    return (
                      <Card key={order.id} className="border-green-500/30 bg-green-950/10">
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Order #{order.id.slice(0, 8)}</p>
                              <p className="font-semibold">{order.users?.email}</p>
                              <p className="text-xs text-muted-foreground mt-1">Ref: {order.payment_reference}</p>
                            </div>
                            <Send className="w-5 h-5 text-green-500" />
                          </div>
                          
                          {recipientAddress ? (
                            <SendUSDC
                              recipientAddress={recipientAddress}
                              amount={order.usdc_amount.toString()}
                              orderId={order.id}
                              onSuccess={() => fetchOrders()}
                            />
                          ) : (
                            <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-md">
                              <p className="text-sm text-red-200">
                                ⚠️ User wallet address not found. Ask user to login first.
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default function MerchantDashboardPage() {
  return (
    <AuthGuard>
      <MerchantContent />
    </AuthGuard>
  )
}
