"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Settings, Target, ClipboardList, MonitorPlay, Gavel } from "lucide-react"
import { cn } from "@/lib/utils"

interface AdminNavbarProps {
  eventSlug?: string
}

export function AdminNavbar({ eventSlug }: AdminNavbarProps) {
  const pathname = usePathname()

  const getHref = (path: string) => {
    if (eventSlug) {
      // Map generic admin paths to event-specific paths
      if (path === '/admin') return `/e/${eventSlug}/admin`
      if (path === '/admin/rounds') return `/e/${eventSlug}/admin/rounds`
      if (path === '/admin/rubric') return `/e/${eventSlug}/admin/rubric`
      if (path === '/admin/settings') return `/e/${eventSlug}/admin/settings`
      if (path === '/judge') return `/e/${eventSlug}/judge` // Assuming judge view is also event specific
      if (path === '/stage') return `/e/${eventSlug}/stage` // Assuming stage view is also event specific
    }
    return path
  }

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/rounds", label: "Rounds", icon: Target },
    { href: "/admin/rubric", label: "Rubric", icon: ClipboardList },
    { href: "/admin/settings", label: "Settings", icon: Settings },
    { href: "/judge", label: "Judge View", icon: Gavel },
    { href: "/stage", label: "Live Display", icon: MonitorPlay },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#020617] supports-[backdrop-filter]:bg-[#020617]/95">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-2">
            ← Events
          </Link>
          <div className="h-4 w-[1px] bg-white/10" />
          <span className="font-bold text-lg tracking-tight text-white">
            Event Dashboard
          </span>
        </div>
        
        {eventSlug && (
            <div className="flex items-center gap-4">
                <span className="text-xs font-mono text-slate-500 uppercase tracking-widest hidden sm:block">{eventSlug}</span>
            </div>
        )}
      </div>
    </nav>
  )
}

