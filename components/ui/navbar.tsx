"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LogOut, LayoutDashboard, Menu, X, Trophy } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

export function Navbar({ className }: { className?: string }) {
    const { data: session, status } = useSession()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    return (
        <nav className={cn(
            "fixed top-0 left-0 right-0 z-50 bg-cream/80 backdrop-blur-md border-b border-charcoal/5",
            className
        )}>
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo & Brand */}
                <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                    <Trophy className="w-5 h-5 text-charcoal" />
                    <span className="font-display text-lg font-semibold tracking-tight text-charcoal">Live Leaderboard</span>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-6">
                    {status === "authenticated" ? (
                        <>
                            <Link
                                href="/dashboard"
                                className="flex items-center gap-2 text-sm font-medium text-charcoal/60 hover:text-charcoal transition-colors"
                            >
                                <LayoutDashboard className="w-4 h-4" /> Dashboard
                            </Link>

                            <div className="h-4 w-px bg-charcoal/10" />

                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <div className="text-xs text-charcoal/40">Signed in as</div>
                                    <div className="text-sm font-medium text-charcoal max-w-[120px] truncate">{session.user?.name}</div>
                                </div>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => signOut()}
                                    className="w-9 h-9 rounded-full text-charcoal/40 hover:text-rose-500 hover:bg-rose-50 transition-all"
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
                                className="text-sm font-medium text-charcoal/60 hover:text-charcoal transition-colors"
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
                <button
                    className="md:hidden p-2 rounded-lg text-charcoal/60 hover:text-charcoal hover:bg-charcoal/5 transition-colors"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-40 bg-charcoal/20 backdrop-blur-sm pt-20 px-4" onClick={() => setMobileMenuOpen(false)}>
                    <div className="bg-cream rounded-2xl p-4 shadow-xl border border-charcoal/5 space-y-2" onClick={e => e.stopPropagation()}>
                        {status === "authenticated" ? (
                            <>
                                <div className="px-4 py-3 bg-charcoal/5 rounded-xl mb-4">
                                    <div className="text-xs text-charcoal/40 mb-0.5">Signed in as</div>
                                    <div className="text-sm font-medium text-charcoal">{session.user?.name}</div>
                                    <div className="text-xs text-charcoal/40 truncate">{session.user?.email}</div>
                                </div>
                                <Link
                                    href="/dashboard"
                                    className="flex items-center justify-between px-4 py-3 rounded-xl text-charcoal hover:bg-charcoal/5 transition-colors text-sm font-medium"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Dashboard
                                    <LayoutDashboard className="w-4 h-4 text-charcoal/40" />
                                </Link>
                                <button
                                    onClick={() => signOut()}
                                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors text-sm font-medium"
                                >
                                    Sign Out
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/auth/signin"
                                    className="block px-4 py-3 text-center rounded-xl text-charcoal hover:bg-charcoal/5 transition-colors text-sm font-medium"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Sign In
                                </Link>
                                <Link
                                    href="/auth/signup"
                                    className="block px-4 py-3 text-center rounded-xl bg-charcoal text-cream text-sm font-medium"
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
