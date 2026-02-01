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
      <div className="max-w-5xl mx-auto px-4">
        <div className="card px-4 md:px-6 h-14 flex items-center justify-between pointer-events-auto shadow-lg">
          {/* Left: Branding & Context */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 hover:bg-charcoal/5 rounded-lg text-charcoal/40 hover:text-charcoal transition-all group lg:flex items-center gap-2 hidden"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-xs font-medium">Back</span>
            </Link>

            <div className="h-5 w-px bg-charcoal/10 hidden lg:block" />

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-display font-semibold text-charcoal truncate max-w-[120px] md:max-w-xs">
                  {eventName || 'Loading...'}
                </h2>
                {role === 'admin' ? (
                  <span className="badge-minimal bg-violet-50 text-violet-600">Admin</span>
                ) : role === 'judge' ? (
                  <span className="badge-minimal">Judge</span>
                ) : null}
              </div>
              <span className="text-[10px] text-charcoal/40">/{eventSlug}</span>
            </div>
          </div>

          {/* Center/Right: Navigation Links */}
          <div className="flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                  link.active
                    ? "bg-charcoal text-cream"
                    : "text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5"
                )}
              >
                <link.icon className={cn("w-4 h-4", link.active ? "text-cream" : "text-charcoal/40")} />
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}
