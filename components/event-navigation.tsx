'use client'

import { useParams, usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { EventCache } from '@/lib/cache'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'

import { LayoutDashboard, Trophy, MonitorPlay, Settings, Gavel, ChevronLeft } from 'lucide-react'

export function EventNavigation() {
  const params = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const { role } = useAuth()
  const eventSlug = params.eventSlug as string
  const [eventName, setEventName] = useState<string>('')
  const cache = EventCache.getInstance()

  useEffect(() => {
    const cacheKey = `event_${eventSlug}`
    const cachedEvent = cache.get(cacheKey)

    if (cachedEvent) {
      setEventName(cachedEvent.event?.name || cachedEvent.name || '')
    } else {
      fetch(`/api/events/${eventSlug}`)
        .then(res => res.json())
        .then(data => {
          if (data.event) {
            setEventName(data.event.name)
            cache.set(cacheKey, data, 5 * 60 * 1000)
          }
        })
        .catch(() => { })
    }
  }, [eventSlug])

  if (!eventSlug) return null

  const isAdmin = pathname?.includes('/admin')
  const isJudge = pathname?.includes('/judge')
  const isStage = pathname?.includes('/stage')
  const isStandings = !isAdmin && !isJudge && !isStage && pathname === `/e/${eventSlug}`

  const navLinks = [
    { label: 'Standings', href: `/e/${eventSlug}`, icon: Trophy, active: isStandings },
    { label: 'Live Display', href: `/e/${eventSlug}/stage`, icon: MonitorPlay, active: isStage },
  ]

  if (role === 'admin' || session?.user?.email === 'admin@demo.com') { // simplified check for brevity
    navLinks.push({ label: 'Admin', href: `/e/${eventSlug}/admin`, icon: Settings, active: isAdmin })
  }
  if (role === 'judge') {
    navLinks.push({ label: 'Judge Portal', href: `/e/${eventSlug}/judge`, icon: Gavel, active: isJudge })
  }

  return (
    <nav className="fixed top-4 inset-x-0 z-50 pointer-events-none">
      <div className="max-w-7xl mx-auto px-4">
        <div className="glass-panel rounded-[2rem] px-4 md:px-8 h-16 flex items-center justify-between pointer-events-auto border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          {/* Left: Branding & Context */}
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all group lg:flex items-center gap-2 hidden"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-[10px] font-black font-mono uppercase tracking-widest">Back</span>
            </Link>

            <div className="h-6 w-[1px] bg-white/10 hidden lg:block" />

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-black font-outfit text-white uppercase italic tracking-tight truncate max-w-[120px] md:max-w-xs">
                  {eventName || 'Loading...'}
                </h2>
                {role === 'admin' ? (
                  <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[8px] font-black uppercase tracking-widest rounded-full">Admin</span>
                ) : role === 'judge' ? (
                  <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-black uppercase tracking-widest rounded-full">Judge</span>
                ) : null}
              </div>
              <span className="text-[9px] font-black font-mono text-slate-500 uppercase tracking-widest">/ {eventSlug}</span>
            </div>
          </div>

          {/* Center/Right: Navigation Links */}
          <div className="flex items-center gap-1 md:gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-black font-mono uppercase tracking-widest transition-all",
                  link.active
                    ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] scale-105"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <link.icon className={cn("w-3.5 h-3.5 md:w-4 md:h-4", link.active ? "text-white" : "text-slate-500")} />
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}
