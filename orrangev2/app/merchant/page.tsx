"use client"

import { usePrivy } from "@privy-io/react-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, LogOut } from "lucide-react"
import { AuthGuard } from "@/components/auth-guard"

function MerchantContent() {
  const { user, logout } = usePrivy()

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
        {/* Welcome Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-2">Merchant Dashboard</h2>
          <p className="text-muted-foreground">Manage your merchant account and fulfill conversion requests</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">0</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting fulfillment</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">$0</div>
              <p className="text-xs text-muted-foreground mt-1">Current month</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Daily Limit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">$10,000</div>
              <p className="text-xs text-muted-foreground mt-1">Available</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold text-yellow-500">Pending Approval</div>
              <p className="text-xs text-muted-foreground mt-1">Under review</p>
            </CardContent>
          </Card>
        </div>

        {/* Request for Approval */}
        <Card className="bg-yellow-950/20 border-yellow-700/30 mb-12">
          <CardHeader>
            <div className="flex items-start gap-4">
              <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div>
                <CardTitle className="text-yellow-50">Awaiting Admin Approval</CardTitle>
                <CardDescription className="text-yellow-200/70">
                  Your merchant account is currently pending approval from our admins. This typically takes 24-48 hours.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Orders</CardTitle>
            <CardDescription>Orders waiting for your fulfillment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>No pending orders at this time</p>
            </div>
          </CardContent>
        </Card>
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
