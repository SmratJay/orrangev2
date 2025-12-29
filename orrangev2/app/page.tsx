import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, Zap, TrendingUp } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      {/* Navigation */}
      <nav className="fixed w-full top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="text-2xl font-bold text-primary">BlockRamp</div>
          <div className="flex gap-4">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">
                Login
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block mb-4 px-4 py-2 bg-primary/10 rounded-full border border-primary/30">
            <span className="text-primary text-sm font-medium">Web3 Payments Simplified</span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-text-pretty mb-6">
            Convert USDC to INR <span className="text-primary">Instantly</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            BlockRamp is the trusted crypto on/off ramp platform. Convert between USDC and INR with our network of
            verified merchants. Fast, secure, and transparent.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                Get Started <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-card/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Why Choose BlockRamp?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 bg-card rounded-lg border border-border hover:border-primary/50 transition">
              <Shield className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">Bank-Grade Security</h3>
              <p className="text-muted-foreground">
                Your funds are protected with multi-signature wallets and our verified merchant network ensures safe
                transactions.
              </p>
            </div>
            <div className="p-8 bg-card rounded-lg border border-border hover:border-primary/50 transition">
              <Zap className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">Lightning Fast</h3>
              <p className="text-muted-foreground">
                Get your INR in minutes, not hours. Our optimized settlement process ensures quick transactions.
              </p>
            </div>
            <div className="p-8 bg-card rounded-lg border border-border hover:border-primary/50 transition">
              <TrendingUp className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">Competitive Rates</h3>
              <p className="text-muted-foreground">
                Market-leading exchange rates with transparent pricing. No hidden fees, ever.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg p-12 border border-primary/30 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-6">Join thousands of users converting crypto to INR securely.</p>
          <Link href="/auth/signup">
            <Button size="lg" className="bg-primary hover:bg-primary/90">
              Create Account Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center text-muted-foreground text-sm">
          <p>BlockRamp &copy; 2025. All rights reserved. | Secure • Transparent • Fast</p>
        </div>
      </footer>
    </div>
  )
}
