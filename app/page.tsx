"use client"
import React from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/ui/navbar"
import { Button } from "@/components/ui/button"
import {
  ArrowRight, Trophy, Zap, Activity, Users, Lock, ChevronRight,
  Play, ShieldCheck, Globe, Layout, Palette, BarChart3, Clock
} from "lucide-react"

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
      title: "1. Create Your Event",
      desc: "Set up your competition in seconds. Define your scoring rubric, rounds, and branding to match your organization.",
      icon: <Layout className="w-6 h-6 text-blue-400" />
    },
    {
      title: "2. Assign Personnel",
      desc: "Invite judges with secure access codes and bulk-import participants. Our platform handles the organization for you.",
      icon: <Users className="w-6 h-6 text-emerald-400" />
    },
    {
      title: "3. Go Live",
      desc: "Broadcasting is instant. As judges score, the Stage display and audience leaderboards update with zero latency.",
      icon: <Play className="w-6 h-6 text-amber-400" />
    }
  ]

  const features = [
    {
      title: "Cinematic Stage Display",
      desc: "A breathtaking 'Ultra Premium' view designed for large screens and projecters. Features live timers and dynamic ranking shifts.",
      icon: <Globe className="w-10 h-10 text-indigo-400" />,
      color: "indigo"
    },
    {
      title: "Professional Judging",
      desc: "Judges get a dedicated, intuitive portal for scoring and feedback. All inputs are secured with enterprise-grade hashing.",
      icon: <ShieldCheck className="w-10 h-10 text-emerald-400" />,
      color: "emerald"
    },
    {
      title: "Custom Branding",
      desc: "Make it yours. Customize logos, color palettes, and themes. Every event reflects your brand identity perfectly.",
      icon: <Palette className="w-10 h-10 text-rose-400" />,
      color: "rose"
    },
    {
      title: "Real-time Analytics",
      desc: "Track every movement. Monitor judge progress, participant performance, and event stats in a unified dashboard.",
      icon: <BarChart3 className="w-10 h-10 text-blue-400" />,
      color: "blue"
    },
    {
      title: "Flexible Rounds",
      desc: "Manage multi-stage competitions effortlessly. Control timers and judging windows for each round independently.",
      icon: <Clock className="w-10 h-10 text-amber-400" />,
      color: "amber"
    },
    {
      title: "Enterprise Security",
      desc: "Built-in rate limiting, bcrypt hashing, and secure invite systems ensure your competition integrity is never compromised.",
      icon: <Lock className="w-10 h-10 text-slate-400" />,
      color: "slate"
    }
  ]

  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-white selection:bg-blue-500/30 overflow-x-hidden font-sans">

      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none opacity-50" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Professional Grade v2.0 Live
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
            The World Standard for <br />
            <span className="text-white italic">Live Competitions</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 uppercase font-mono tracking-widest">
            Deploy professional leaderboards in seconds. Built for hackathons,
            tournaments, and evaluative events with <span className="text-slate-200">zero latency architecture</span>.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 font-black tracking-widest italic uppercase">
            <Button asChild size="lg" className="h-16 px-10 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_40px_rgba(37,99,235,0.3)] border border-blue-400/20 text-base">
              <Link href="/auth/signup">
                Create Organization <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="h-16 px-10 rounded-full text-slate-300 hover:text-white hover:bg-white/5 border border-white/5 hover:border-white/10 text-base">
              <Link href="/e/demo-event">
                View Sample Stage
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-y border-white/5 relative">
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 blur-[100px] pointer-events-none" />

        <div className="text-center mb-20 space-y-4">
          <h2 className="text-xs font-black font-mono text-blue-500 tracking-[0.5em] uppercase italic">Operational Flow</h2>
          <h3 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter uppercase">How it Works</h3>
        </div>

        <div className="grid md:grid-cols-3 gap-12 relative">
          {/* Connector Line */}
          <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent hidden md:block" />

          {steps.map((step, i) => (
            <div key={i} className="relative group text-center space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-white/10 flex items-center justify-center mx-auto shadow-2xl group-hover:bg-blue-600/10 group-hover:border-blue-500/30 transition-all duration-500 active:scale-95">
                {step.icon}
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-black text-white uppercase italic tracking-tight">{step.title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Powerful Features Grid */}
      <section className="max-w-7xl mx-auto px-6 py-32 space-y-20">
        <div className="flex flex-col md:flex-row items-end justify-between gap-6">
          <div className="space-y-4">
            <h2 className="text-xs font-black font-mono text-emerald-500 tracking-[0.5em] uppercase italic">Deep Capabilities</h2>
            <h3 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter uppercase">Everything You Need<br />To Scale Your Event</h3>
          </div>
          <p className="max-w-md text-slate-500 font-medium leading-relaxed">
            Our platform isn't just a scoreboard; it's a comprehensive event operating system designed for maximum clarity and engagement.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <div key={i} className="group p-10 rounded-[2.5rem] bg-slate-900/40 border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all duration-500 hover:translate-y-[-8px]">
              <div className="mb-8 p-5 rounded-2xl bg-slate-950/50 border border-white/5 inline-flex shadow-inner group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-2xl font-black text-white mb-4 uppercase italic tracking-tight">{feature.title}</h3>
              <p className="text-slate-500 leading-relaxed font-medium text-sm">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-32 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-600/5 -z-10" />
        <div className="max-w-3xl mx-auto space-y-10">
          <h2 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter uppercase leading-none">Ready to host your<br />best event yet?</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Button asChild size="lg" className="h-20 px-12 rounded-full bg-white text-black hover:bg-slate-200 font-black uppercase italic tracking-widest text-lg shadow-2xl">
              <Link href="/auth/signup">Get Started Now</Link>
            </Button>
            <span className="text-slate-600 font-mono text-xs uppercase italic tracking-widest">No credit card required</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-slate-950 py-20 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-white">
              <Trophy className="w-6 h-6 text-blue-500" />
              <span className="font-black italic uppercase tracking-tighter text-2xl">Live Leaderboard</span>
            </div>
            <p className="text-slate-500 text-sm max-w-sm leading-relaxed font-medium">
              A premium, real-time competition platform for organizations who demand the best in performance and aesthetics.
            </p>
            <div className="text-[10px] text-slate-700 font-mono tracking-widest uppercase">
              © 2024 LIVE LEADERBOARD // v2.0.0 STABLE
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-10 md:justify-end">
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-black font-mono text-slate-500 uppercase tracking-widest">Legal</span>
              <Link href="/legal/terms" className="text-slate-400 hover:text-white transition-colors text-sm font-bold uppercase italic">Terms of Service</Link>
              <Link href="/legal/privacy" className="text-slate-400 hover:text-white transition-colors text-sm font-bold uppercase italic">Privacy Policy</Link>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-black font-mono text-slate-500 uppercase tracking-widest">Connect</span>
              <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm font-bold uppercase italic">Organization Hub</a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm font-bold uppercase italic">Contact Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
