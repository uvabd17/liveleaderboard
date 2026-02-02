"use client"
import React from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  ArrowRight, Activity, Users, Lock,
  Play, ShieldCheck, Globe, Layout, Palette, BarChart3, Clock
} from "lucide-react"
import { Logo } from "@/components/brand/logo"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  React.useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard')
    }
  }, [status, router])

  const steps = [
    {
      number: "01",
      title: "Create Your Event",
      desc: "Set up your competition in seconds. Define scoring rubrics, rounds, and branding to match your organization."
    },
    {
      number: "02",
      title: "Assign Personnel",
      desc: "Invite judges with secure access codes. Bulk-import participants. We handle the organization."
    },
    {
      number: "03",
      title: "Go Live",
      desc: "As judges score, displays update instantly. Zero latency. Maximum impact."
    }
  ]

  const features = [
    {
      title: "Cinematic Displays",
      desc: "Stage views designed for projectors. Live timers, dynamic rankings, automatic animations.",
      icon: <Globe className="w-6 h-6" />
    },
    {
      title: "Professional Judging",
      desc: "Intuitive scoring portal with secure, enterprise-grade authentication.",
      icon: <ShieldCheck className="w-6 h-6" />
    },
    {
      title: "Custom Branding",
      desc: "Your logos, colors, and identity. Every event reflects your brand.",
      icon: <Palette className="w-6 h-6" />
    },
    {
      title: "Real-time Analytics",
      desc: "Monitor judge progress, participant performance, and event health.",
      icon: <BarChart3 className="w-6 h-6" />
    },
    {
      title: "Multi-Round Support",
      desc: "Manage complex competitions with independent timers per round.",
      icon: <Clock className="w-6 h-6" />
    },
    {
      title: "Enterprise Security",
      desc: "Rate limiting, encryption, and secure invites protect your data.",
      icon: <Lock className="w-6 h-6" />
    }
  ]

  return (
    <div className="min-h-[100dvh] bg-cream text-charcoal selection:bg-charcoal/10 overflow-x-hidden font-sans">

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-cream/80 backdrop-blur-md border-b border-charcoal/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={20} variant="icon" />
            <span className="font-display text-lg font-semibold tracking-tight">Live Leaderboard</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/auth/signin" className="text-sm font-medium text-charcoal/60 hover:text-charcoal transition-colors">
              Sign In
            </Link>
            <Button asChild className="btn-primary rounded-full px-5 h-9 text-sm">
              <Link href="/auth/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-24 md:pt-44 md:pb-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-charcoal/5 text-charcoal/60 text-xs font-medium mb-8 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Professional Grade Platform
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-semibold tracking-tight mb-6 animate-fade-in-up">
            The Standard for<br />
            <span className="italic">Live Competitions</span>
          </h1>

          <p className="text-lg md:text-xl text-charcoal/50 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up delay-100">
            Deploy professional leaderboards in seconds. Built for hackathons,
            tournaments, and evaluative events with real-time architecture.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-200">
            <Button asChild className="btn-primary h-12 px-8 rounded-full text-sm font-medium">
              <Link href="/auth/signup">
                Create Organization <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" className="h-12 px-8 rounded-full text-sm font-medium text-charcoal/60 hover:text-charcoal hover:bg-charcoal/5">
              <Link href="/e/demo-event">
                View Demo
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="border-y border-charcoal/5 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-center gap-8 md:gap-16 text-charcoal/30">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">10,000+ Events</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <span className="text-sm font-medium">Zero Latency</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-sm font-medium">Enterprise Ready</span>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 md:py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-charcoal/40 mb-3">Process</p>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">How It Works</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-12 md:gap-8">
            {steps.map((step, i) => (
              <div key={i} className="relative text-center md:text-left">
                <div className="text-6xl font-display font-semibold text-charcoal/5 mb-4">{step.number}</div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-charcoal/50 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 md:py-32 px-6 bg-charcoal text-cream">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-cream/40 mb-3">Capabilities</p>
              <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
                Everything You Need<br />To Scale Your Event
              </h2>
            </div>
            <p className="max-w-md text-cream/50 leading-relaxed">
              A comprehensive event operating system designed for clarity and engagement.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-cream/10 rounded-2xl overflow-hidden">
            {features.map((feature, i) => (
              <div key={i} className="bg-charcoal p-8 md:p-10 hover:bg-charcoal-50 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-cream/5 flex items-center justify-center mb-6 text-cream/60">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-cream mb-2">{feature.title}</h3>
                <p className="text-cream/40 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-5xl font-semibold tracking-tight mb-6">
            Ready to host your<br />best event yet?
          </h2>
          <p className="text-charcoal/50 mb-10 max-w-lg mx-auto">
            Join thousands of organizations using Live Leaderboard to deliver professional competition experiences.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild className="btn-primary h-14 px-10 rounded-full text-base font-medium">
              <Link href="/auth/signup">Get Started Free</Link>
            </Button>
            <span className="text-charcoal/30 text-sm">No credit card required</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-charcoal/5 py-16 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between gap-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <Logo size={20} variant="icon" />
              <span className="font-display text-lg font-semibold tracking-tight">Live Leaderboard</span>
            </div>
            <p className="text-charcoal/40 text-sm max-w-xs leading-relaxed">
              Real-time competition platform for organizations who demand excellence.
            </p>
            <p className="text-charcoal/20 text-xs font-mono">
              © 2026 Live Leaderboard
            </p>
          </div>

          <div className="flex gap-16">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-charcoal/30">Legal</p>
              <div className="flex flex-col gap-2.5">
                <Link href="/legal/terms" className="text-sm text-charcoal/50 hover:text-charcoal transition-colors">Terms of Service</Link>
                <Link href="/legal/privacy" className="text-sm text-charcoal/50 hover:text-charcoal transition-colors">Privacy Policy</Link>
              </div>
            </div>
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-charcoal/30">Connect</p>
              <div className="flex flex-col gap-2.5">
                <Link href="/dashboard" className="text-sm text-charcoal/50 hover:text-charcoal transition-colors">Dashboard</Link>
                <Link href="/auth/signin" className="text-sm text-charcoal/50 hover:text-charcoal transition-colors">Sign In</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
