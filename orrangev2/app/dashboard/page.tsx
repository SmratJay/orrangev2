"use client"

import { useState } from "react" // Added this
import { usePrivy } from "@privy-io/react-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDownUp, Plus, History, LogOut, ArrowLeft } from "lucide-react" // Added ArrowLeft
import Link from "next/link"
import { AuthGuard } from "@/components/auth-guard"
import { BuyForm } from "@/components/buy-form" // Import your new form

function DashboardContent() {
  const { user, logout } = usePrivy()
  // view can be 'overview' or 'buy'
  const [view, setView] = useState<'overview' | 'buy'>('overview')

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
        {/* Back Button (only shows when in 'buy' view) */}
        {view === 'buy' && (
          <Button 
            variant="ghost" 
            className="mb-6 flex items-center gap-2" 
            onClick={() => setView('overview')}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        )}

        {/* Conditional Rendering based on view */}
        {view === 'buy' ? (
          <div className="flex justify-center">
            <BuyForm />
          </div>
        ) : (
          <>
            {/* Welcome Section */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold mb-2">Welcome back</h2>
              <p className="text-muted-foreground">Manage your crypto conversions and transactions</p>
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {/* ON RAMP CARD */}
              <Card 
                className="bg-gradient-to-br from-primary/10 to-transparent border-primary/30 hover:border-primary/50 transition cursor-pointer"
                onClick={() => setView('buy')} // Set view to buy
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
              <Card className="border-border hover:border-primary/30 transition cursor-pointer">
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