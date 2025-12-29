"use client"

import { usePrivy } from "@privy-io/react-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LogOut } from "lucide-react"
import { AuthGuard } from "@/components/auth-guard"

function AdminContent() {
  const { user, logout } = usePrivy()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">BlockRamp Admin</h1>
          <div className="flex gap-4 items-center">
            <span className="text-sm text-muted-foreground">{user?.email?.address || "Admin"}</span>
            <Button size="sm" variant="outline" onClick={logout} className="flex items-center gap-2 bg-transparent">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-2">Admin Dashboard</h2>
          <p className="text-muted-foreground">Monitor platform activity and manage approvals</p>
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">0</div>
              <p className="text-xs text-muted-foreground mt-1">Active users</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Merchants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">0</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Platform Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">$0</div>
              <p className="text-xs text-muted-foreground mt-1">Total transactions</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">0</div>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger
              value="users"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Users
            </TabsTrigger>
            <TabsTrigger
              value="merchants"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Merchants
            </TabsTrigger>
            <TabsTrigger
              value="transactions"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Transactions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>Manage platform users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <p>No users yet</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="merchants">
            <Card>
              <CardHeader>
                <CardTitle>Merchant Approvals</CardTitle>
                <CardDescription>Review and approve merchant accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <p>No pending merchant applications</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Platform Transactions</CardTitle>
                <CardDescription>Monitor all conversions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <p>No transactions yet</p>
                </div>
              </CardContent>
            </Card>
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
