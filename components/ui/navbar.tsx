"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LogOut, LayoutDashboard, Menu, X, Sun, Moon, Monitor } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/brand/logo"
import { useTheme } from "@/components/theme-provider"

function ThemeToggle() {
    const { theme, setTheme, resolvedTheme } = useTheme()
    const [showMenu, setShowMenu] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setShowMenu(!showMenu)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-charcoal/60 dark:text-white/60 hover:text-charcoal dark:hover:text-white hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all"
                title="Toggle theme"
            >
                {resolvedTheme === 'dark' ? (
                    <Moon className="w-4 h-4" />
                ) : (
                    <Sun className="w-4 h-4" />
                )}
            </button>
            
            {showMenu && (
                <div className="absolute right-0 top-full mt-2 w-36 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-charcoal/10 dark:border-white/10 py-1 z-50">
                    <button
                        onClick={() => { setTheme('light'); setShowMenu(false) }}
                        className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-charcoal/5 dark:hover:bg-white/5 transition-colors",
                            theme === 'light' && "text-charcoal dark:text-white font-medium"
                        )}
                    >
                        <Sun className="w-4 h-4" /> Light
                    </button>
                    <button
                        onClick={() => { setTheme('dark'); setShowMenu(false) }}
                        className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-charcoal/5 dark:hover:bg-white/5 transition-colors",
                            theme === 'dark' && "text-charcoal dark:text-white font-medium"
                        )}
                    >
                        <Moon className="w-4 h-4" /> Dark
                    </button>
                    <button
                        onClick={() => { setTheme('system'); setShowMenu(false) }}
                        className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-charcoal/5 dark:hover:bg-white/5 transition-colors",
                            theme === 'system' && "text-charcoal dark:text-white font-medium"
                        )}
                    >
                        <Monitor className="w-4 h-4" /> System
                    </button>
                </div>
            )}
        </div>
    )
}

export function Navbar({ className }: { className?: string }) {
    const { data: session, status } = useSession()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    return (
        <nav className={cn(
            "fixed top-0 left-0 right-0 z-50 bg-cream/80 dark:bg-black/80 backdrop-blur-md border-b border-charcoal/5 dark:border-white/5",
            className
        )}>
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo & Brand */}
                <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                    <Logo size={20} variant="icon" />
                    <span className="font-display text-lg font-semibold tracking-tight text-charcoal dark:text-white">Live Leaderboard</span>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-4">
                    <ThemeToggle />
                    
                    {status === "authenticated" ? (
                        <>
                            <div className="h-4 w-px bg-charcoal/10 dark:bg-white/10" />
                            
                            <Link
                                href="/dashboard"
                                className="flex items-center gap-2 text-sm font-medium text-charcoal/60 dark:text-white/60 hover:text-charcoal dark:hover:text-white transition-colors"
                            >
                                <LayoutDashboard className="w-4 h-4" /> Dashboard
                            </Link>

                            <div className="h-4 w-px bg-charcoal/10 dark:bg-white/10" />

                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <div className="text-xs text-charcoal/40 dark:text-white/40">Signed in as</div>
                                    <div className="text-sm font-medium text-charcoal dark:text-white max-w-[120px] truncate">{session.user?.name}</div>
                                </div>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => signOut()}
                                    className="w-9 h-9 rounded-full text-charcoal/40 dark:text-white/40 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                                    title="Sign Out"
                                >
                                    <LogOut className="w-4 h-4" />
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-4">
                            <Link
                                href="/auth/signin"
                                className="text-sm font-medium text-charcoal/60 dark:text-white/60 hover:text-charcoal dark:hover:text-white transition-colors"
                            >
                                Sign In
                            </Link>
                            <Button asChild className="btn-primary rounded-full px-5 h-9 text-sm">
                                <Link href="/auth/signup">Get Started</Link>
                            </Button>
                        </div>
                    )}
                </div>

                {/* Mobile Toggle */}
                <div className="md:hidden flex items-center gap-2">
                    <ThemeToggle />
                    <button
                        className="p-2 rounded-lg text-charcoal/60 dark:text-white/60 hover:text-charcoal dark:hover:text-white hover:bg-charcoal/5 dark:hover:bg-white/5 transition-colors"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-40 bg-charcoal/20 dark:bg-black/40 backdrop-blur-sm pt-20 px-4" onClick={() => setMobileMenuOpen(false)}>
                    <div className="bg-cream dark:bg-slate-900 rounded-2xl p-4 shadow-xl border border-charcoal/5 dark:border-white/10 space-y-2" onClick={e => e.stopPropagation()}>
                        {status === "authenticated" ? (
                            <>
                                <div className="px-4 py-3 bg-charcoal/5 dark:bg-white/5 rounded-xl mb-4">
                                    <div className="text-xs text-charcoal/40 dark:text-white/40 mb-0.5">Signed in as</div>
                                    <div className="text-sm font-medium text-charcoal dark:text-white">{session.user?.name}</div>
                                    <div className="text-xs text-charcoal/40 dark:text-white/40 truncate">{session.user?.email}</div>
                                </div>
                                <Link
                                    href="/dashboard"
                                    className="flex items-center justify-between px-4 py-3 rounded-xl text-charcoal dark:text-white hover:bg-charcoal/5 dark:hover:bg-white/5 transition-colors text-sm font-medium"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Dashboard
                                    <LayoutDashboard className="w-4 h-4 text-charcoal/40 dark:text-white/40" />
                                </Link>
                                <button
                                    onClick={() => signOut()}
                                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors text-sm font-medium"
                                >
                                    Sign Out
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/auth/signin"
                                    className="block px-4 py-3 text-center rounded-xl text-charcoal dark:text-white hover:bg-charcoal/5 dark:hover:bg-white/5 transition-colors text-sm font-medium"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Sign In
                                </Link>
                                <Link
                                    href="/auth/signup"
                                    className="block px-4 py-3 text-center rounded-xl bg-charcoal dark:bg-white text-cream dark:text-black text-sm font-medium"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Get Started
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    )
}
