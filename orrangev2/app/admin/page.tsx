"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Users, TrendingUp, CheckCircle, Clock, Shield, Search, UserCheck, RefreshCw } from "lucide-react"
import { Input } from "@/components/ui/input"
import { AuthGuard } from "@/components/auth-guard"
import { getAccessToken } from "@privy-io/react-auth"
import { AnalyticsCharts } from "@/components/admin/analytics-charts"
import { ProfileMenu } from "@/components/profile-menu"

interface AdminStats {
  overview: {
    totalUsers: number
    totalMerchants: number
    totalOrders: number
    completedOrders: number
    completionRate: number
    activeDisputes: number
    pendingOrders: number
    totalVolumeUsdc: number
  }
  today: {
    newUsers: number
    newMerchants: number
  }
  recentActivity: {
    orderCount: number
    statusBreakdown: Record<string, number>
    typeBreakdown: { onramp: number; offramp: number }
    dailyCounts: Record<string, number>
    dailyVolume: Record<string, { onramp: number; offramp: number }>
  }
}

interface AppUser {
  id: string
  email: string
  user_type: 'user' | 'merchant' | 'admin'
  privy_user_id: string
  embedded_wallet_address: string | null
  created_at: string
}

interface Dispute {
  id: string
  order_id: string
  status: string
  reason: string
  filed_by_type: string
  filed_at: string
  order?: {
    id: string
    type: string
    fiat_amount: number
    usdc_amount: number
    status: string
  }
  filed_by_user?: {
    email: string
  }
}

function AdminContent() {
  const router = useRouter()
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [usersTotal, setUsersTotal] = useState(0)
  const [usersLoading, setUsersLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [userTypeFilter, setUserTypeFilter] = useState('')
  const [roleUpdateLoading, setRoleUpdateLoading] = useState<string | null>(null)
  const [roleUpdateMsg, setRoleUpdateMsg] = useState<{ id: string; msg: string; ok: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const authToken = await getAccessToken()
        const response = await fetch('/api/users/me', 
          authToken ? { headers: { 'Authorization': `Bearer ${authToken}` } } : {}
        )
        if (!response.ok) {
          router.push('/dashboard')
          return
        }

        const userData = await response.json()
        if (userData.user_type !== 'admin') {
          if (userData.user_type === 'merchant') {
            router.push('/merchant')
          } else {
            router.push('/dashboard')
          }
          return
        }
      } catch {
        router.push('/dashboard')
        return
      } finally {
        setCheckingAccess(false)
      }
    }

    checkAdminAccess()
  }, [router])

  // Fetch stats and disputes
  useEffect(() => {
    if (checkingAccess) return

    const fetchData = async () => {
      setLoading(true)
      try {
        const authToken = await getAccessToken()

        const [statsRes, disputesRes] = await Promise.all([
          fetch('/api/admin/stats?days=7', authToken ? { headers: { 'Authorization': `Bearer ${authToken}` } } : {}),
          fetch('/api/admin/disputes', authToken ? { headers: { 'Authorization': `Bearer ${authToken}` } } : {}),
        ])

        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData)
        }

        if (disputesRes.ok) {
          const disputesData = await disputesRes.json()
          setDisputes(disputesData.disputes || [])
        }
      } catch (error) {
        console.error('Failed to fetch admin data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [checkingAccess])

  const fetchUsers = async (search = '', typeFilter = '') => {
    setUsersLoading(true)
    try {
      const authToken = await getAccessToken()
      const params = new URLSearchParams({ limit: '20', offset: '0' })
      if (search) params.set('search', search)
      if (typeFilter) params.set('user_type', typeFilter)
      const res = await fetch(`/api/admin/users?${params}`,
        authToken ? { headers: { 'Authorization': `Bearer ${authToken}` } } : {}
      )
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
        setUsersTotal(data.pagination?.total || 0)
      }
    } catch (e) {
      console.error('Failed to fetch users:', e)
    } finally {
      setUsersLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string, upiId?: string) => {
    setRoleUpdateLoading(userId)
    setRoleUpdateMsg(null)
    try {
      const authToken = await getAccessToken()
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ userId, userType: newRole, upiId }),
      })
      const data = await res.json()
      if (res.ok) {
        setRoleUpdateMsg({ id: userId, msg: data.message || 'Role updated', ok: true })
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, user_type: newRole as AppUser['user_type'] } : u))
      } else {
        setRoleUpdateMsg({ id: userId, msg: data.error || 'Failed to update', ok: false })
      }
    } catch {
      setRoleUpdateMsg({ id: userId, msg: 'Network error', ok: false })
    } finally {
      setRoleUpdateLoading(null)
      setTimeout(() => setRoleUpdateMsg(null), 4000)
    }
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-yellow-500/20 text-yellow-400',
      under_review: 'bg-blue-500/20 text-blue-400',
      pending_evidence: 'bg-purple-500/20 text-purple-400',
      resolved_user_favor: 'bg-green-500/20 text-green-400',
      resolved_merchant_favor: 'bg-green-500/20 text-green-400',
      resolved_split: 'bg-orange-500/20 text-orange-400',
      resolved_no_action: 'bg-gray-500/20 text-gray-400',
    }
    return colors[status] || 'bg-gray-500/20 text-gray-400'
  }

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      payment_not_received: 'Payment not received',
      usdc_not_received: 'USDC not received',
      wrong_amount: 'Wrong amount',
      fraud: 'Suspected fraud',
      technical_issue: 'Technical issue',
      other: 'Other',
    }
    return labels[reason] || reason
  }

  if (checkingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background:'#0B0C0E'}}>
        <div className="text-center">
          <div className="w-10 h-10 rounded-full animate-spin mx-auto mb-4" style={{border:'2px solid rgba(255,122,26,0.2)', borderTopColor:'#FF7A1A'}} />
          <p className="text-muted-foreground text-sm">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{background:'#0B0C0E'}}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/5" style={{background:'rgba(11,12,14,0.85)', backdropFilter:'blur(20px)'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:'linear-gradient(135deg,#FF7A1A,#FF8F3A)'}}>
              <Shield className="w-4 h-4 text-black" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-none">ORRANGE Admin</h1>
              <p className="text-xs text-muted-foreground">Control Center</p>
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{background:'rgba(255,122,26,0.1)', border:'1px solid rgba(255,122,26,0.2)'}}>
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-primary font-medium">Admin</span>
            </div>
            <ProfileMenu userType="admin" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-1">Platform Overview</h2>
          <p className="text-muted-foreground">Monitor disputes, user activity, and platform health</p>
        </div>

        {/* Key Metrics */}
        {!loading && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="stat-card group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{background:'rgba(255,122,26,0.15)'}}>
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">+{stats.today.newUsers} today</span>
              </div>
              <div className="text-2xl font-bold text-white mb-1">{stats.overview.totalUsers.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Users</div>
              <div className="text-xs text-muted-foreground/60 mt-1">{stats.overview.totalMerchants} merchants</div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{background: stats.overview.activeDisputes > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.12)'}}>
                  <AlertTriangle className={`w-5 h-5 ${stats.overview.activeDisputes > 0 ? 'text-red-400' : 'text-green-400'}`} />
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  stats.overview.activeDisputes > 0 ? 'text-red-400 bg-red-400/10' : 'text-green-400 bg-green-400/10'
                }`}>{stats.overview.activeDisputes > 0 ? 'Needs attention' : 'All clear'}</span>
              </div>
              <div className={`text-2xl font-bold mb-1 ${stats.overview.activeDisputes > 0 ? 'text-red-400' : 'text-white'}`}>
                {stats.overview.activeDisputes}
              </div>
              <div className="text-sm text-muted-foreground">Active Disputes</div>
              <div className="text-xs text-muted-foreground/60 mt-1">{stats.overview.pendingOrders} pending orders</div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{background:'rgba(59,130,246,0.15)'}}>
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">{stats.recentActivity.orderCount} orders</span>
              </div>
              <div className="text-2xl font-bold text-white mb-1">{stats.overview.totalVolumeUsdc.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">7-Day Volume (USDC)</div>
              <div className="text-xs text-muted-foreground/60 mt-1">last 7 days</div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{background:'rgba(168,85,247,0.15)'}}>
                  <CheckCircle className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-xs text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full">{stats.overview.completedOrders}/{stats.overview.totalOrders}</span>
              </div>
              <div className="text-2xl font-bold text-white mb-1">{stats.overview.completionRate}%</div>
              <div className="text-sm text-muted-foreground">Completion Rate</div>
              <div className="w-full h-1.5 rounded-full mt-2" style={{background:'rgba(255,255,255,0.08)'}}>
                <div className="h-1.5 rounded-full" style={{width:`${stats.overview.completionRate}%`, background:'linear-gradient(90deg,#a855f7,#7c3aed)'}} />
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="p-1 rounded-xl" style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)'}}>
            <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
            <TabsTrigger value="disputes" className="relative rounded-lg">
              Disputes
              {disputes.filter(d => ['open', 'under_review'].includes(d.status)).length > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </TabsTrigger>
            <TabsTrigger value="orders" className="rounded-lg">Orders</TabsTrigger>
            <TabsTrigger value="users" className="rounded-lg" onClick={() => { if (users.length === 0) fetchUsers() }}>Users</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="space-y-4">
              {/* System status strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.15)'}}>
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-sm text-green-300">All Systems Operational</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.15)'}}>
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-blue-300">Real-time Monitoring</span>
                </div>
                <button
                  className="flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                  style={{background:'rgba(255,122,26,0.08)', border:'1px solid rgba(255,122,26,0.15)'}}
                  onClick={() => setActiveTab('disputes')}
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-primary" />
                    <span className="text-sm text-orange-300">{disputes.filter(d => d.status === 'open').length} open disputes</span>
                  </div>
                  <span className="text-xs text-primary">Review →</span>
                </button>
              </div>

              {/* Analytics charts */}
              {stats && <AnalyticsCharts stats={stats} days={7} />}
            </div>
          </TabsContent>

          {/* Disputes Tab */}
          <TabsContent value="disputes">
            <div className="glass-card rounded-xl">
              <div className="flex items-center justify-between p-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{background:'rgba(239,68,68,0.15)'}}>
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Dispute Management</h3>
                    <p className="text-xs text-muted-foreground">Review and resolve user/merchant disputes</p>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">{disputes.length} total</span>
              </div>
              <div className="p-6">
                {disputes.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-10 h-10 mx-auto mb-4 text-green-400/50" />
                    <p className="text-muted-foreground">No disputes found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {disputes.map((dispute) => (
                      <div
                        key={dispute.id}
                        className="p-4 rounded-xl cursor-pointer transition-all duration-200"
                        style={{background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)'}}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,122,26,0.3)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
                        onClick={() => router.push(`/admin/disputes/${dispute.id}`)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-white text-sm">Order #{dispute.order_id.slice(0, 8)}</span>
                              <Badge className={getStatusBadge(dispute.status)}>
                                {dispute.status.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Filed by {dispute.filed_by_type} · {new Date(dispute.filed_at).toLocaleString()}
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-primary">{dispute.order?.usdc_amount} USDC</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">{getReasonLabel(dispute.reason)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <div className="glass-card rounded-xl">
              <div className="flex items-center gap-3 p-6 border-b border-white/5">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{background:'rgba(59,130,246,0.15)'}}>
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Order Status Breakdown</h3>
                  <p className="text-xs text-muted-foreground">Last 7 days</p>
                </div>
              </div>
              <div className="p-6">
                {stats?.recentActivity.statusBreakdown && (
                  <div className="space-y-3">
                    {Object.entries(stats.recentActivity.statusBreakdown).map(([status, count]) => (
                      <div key={status} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                        <span className="capitalize text-sm text-muted-foreground">{status.replace(/_/g, ' ')}</span>
                        <span className="text-sm font-semibold text-white px-2.5 py-0.5 rounded-full" style={{background:'rgba(255,255,255,0.08)'}}>{String(count)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="glass-card rounded-xl">
              <div className="flex items-center justify-between flex-wrap gap-3 p-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{background:'rgba(255,122,26,0.15)'}}>
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">User Management</h3>
                    <p className="text-xs text-muted-foreground">{usersTotal} total users</p>
                  </div>
                </div>
                <button onClick={() => fetchUsers(userSearch, userTypeFilter)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-white hover:bg-white/10 transition">
                  <RefreshCw className={`w-4 h-4 ${usersLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
              <div className="p-6 space-y-4">
                {/* Filters */}
                <div className="flex gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by email..."
                      className="pl-9"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchUsers(userSearch, userTypeFilter)}
                    />
                  </div>
                  <select
                    className="rounded-lg px-3 py-2 text-sm text-white"
                    style={{background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)'}}
                    value={userTypeFilter}
                    onChange={(e) => { setUserTypeFilter(e.target.value); fetchUsers(userSearch, e.target.value) }}
                  >
                    <option value="">All roles</option>
                    <option value="user">User</option>
                    <option value="merchant">Merchant</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={() => fetchUsers(userSearch, userTypeFilter)}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-black transition"
                    style={{background:'linear-gradient(135deg,#FF7A1A,#FF8F3A)'}}
                  >
                    <Search className="w-4 h-4" />
                    Search
                  </button>
                </div>

                {usersLoading ? (
                  <div className="text-center py-12">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary" />
                    <p className="text-sm text-muted-foreground mt-2">Loading users...</p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No users found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {users.map((u) => (
                      <div key={u.id} className="rounded-xl p-4 transition-all" style={{background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)'}}>
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{u.email || '(no email)'}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Joined {new Date(u.created_at).toLocaleDateString()} &nbsp;·&nbsp;
                              {u.embedded_wallet_address
                                ? <span className="font-mono">{u.embedded_wallet_address.slice(0, 10)}…</span>
                                : 'No wallet'
                              }
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className={{
                              user: 'bg-blue-500/20 text-blue-400',
                              merchant: 'bg-purple-500/20 text-purple-400',
                              admin: 'bg-yellow-500/20 text-yellow-400',
                            }[u.user_type]}>
                              {u.user_type}
                            </Badge>
                          </div>
                        </div>

                        {/* Role change controls */}
                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground">Change role:</span>
                          {(['user', 'merchant', 'admin'] as const).filter(r => r !== u.user_type).map(role => (
                            <Button
                              key={role}
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={roleUpdateLoading === u.id}
                              onClick={() => {
                                if (role === 'merchant') {
                                  const upi = prompt(`Enter UPI ID for ${u.email}:`, 'merchant@upi')
                                  if (upi !== null) handleRoleChange(u.id, role, upi)
                                } else {
                                  if (confirm(`Make ${u.email} a ${role}?`)) handleRoleChange(u.id, role)
                                }
                              }}
                            >
                              {roleUpdateLoading === u.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <UserCheck className="w-3 h-3 mr-1" />
                              )}
                              Make {role}
                            </Button>
                          ))}
                        </div>

                        {roleUpdateMsg?.id === u.id && (
                          <p className={`text-xs mt-2 ${roleUpdateMsg.ok ? 'text-green-500' : 'text-red-500'}`}>
                            {roleUpdateMsg.msg}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default function AdminDashboardPage() {
  return (
    <AuthGuard>
      <AdminContent />
    </AuthGuard>
  )
}
