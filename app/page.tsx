"use client"
import React from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/ui/navbar"
import { Button } from "@/components/ui/button"
import { ArrowRight, Trophy, Zap, Activity, Users, Lock, ChevronRight } from "lucide-react"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  React.useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard')
    }
  }, [status, router])

  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-white selection:bg-blue-500/30 overflow-hidden font-sans">

      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none opacity-50" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            v2.0 Now Available with Real-time Scoring
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
            The Standard for <br />
            <span className="text-white">Live Competitions</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            Launch professional leaderboards in seconds. Real-time implementation for hackathons,
            tournaments, and judging events with <span className="text-slate-200">zero latency</span>.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <Button asChild size="lg" className="h-12 px-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_40px_rgba(37,99,235,0.3)] border border-blue-400/20 text-base">
              <Link href="/auth/signup">
                Start for Free <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="h-12 px-8 rounded-full text-slate-300 hover:text-white hover:bg-white/5 border border-white/5 hover:border-white/10 text-base">
              <Link href="/e/demo-event">
                View Live Demo
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats/Social Proof */}
      <div className="border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: 'Active Users', value: '2,000+' },
            { label: 'Events Hosted', value: '500+' },
            { label: 'Uptime', value: '99.9%' },
            { label: 'Scores Logged', value: '100k+' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-6 py-24 md:py-32">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: <Zap className="w-8 h-8 text-yellow-400" />,
              title: "Instant Updates",
              desc: "Powered by optimized Server-Sent Events (SSE). Scores update on every screen instantly without refreshing."
            },
            {
              icon: <Activity className="w-8 h-8 text-emerald-400" />,
              title: "Judge Console",
              desc: "Dedicated interface for judges with customizable scoring rubrics, comments, and secure authentication."
            },
            {
              icon: <Lock className="w-8 h-8 text-blue-400" />,
              title: "Enterprise Grade",
              desc: "Built-in rate limiting, audit logs, regular backups, and role-based access control for your organization."
            }
          ].map((feature, i) => (
            <div key={i} className="group p-8 rounded-3xl bg-slate-900/50 border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all duration-500">
              <div className="mb-6 p-4 rounded-2xl bg-slate-950/50 border border-white/5 inline-flex shadow-inner">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-slate-400 leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-slate-950 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-slate-400">
            <Trophy className="w-5 h-5" />
            <span className="font-semibold text-slate-300">Live Leaderboard</span>
            <span className="text-slate-600">© 2024</span>
          </div>

          <div className="flex bg-slate-900/50 rounded-full px-1 p-1 border border-white/5">
            <Link href="/legal/terms" className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-all">Terms</Link>
            <Link href="/legal/privacy" className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-all">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
