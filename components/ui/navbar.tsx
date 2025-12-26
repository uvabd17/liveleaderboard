"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { LogOut, LayoutDashboard, Menu, X } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

export function Navbar({ className }: { className?: string }) {
    const { data: session, status } = useSession()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    return (
        <nav className={cn(
            "fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl transition-all",
            className
        )}>
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="hover:opacity-90 transition-opacity">
                    <Logo animated />
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-6">
                    {status === "authenticated" ? (
                        <>
                            <Link href="/dashboard" className="text-sm font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-2">
                                <LayoutDashboard className="w-4 h-4" /> Dashboard
                            </Link>
                            <div className="w-px h-4 bg-white/10" />
                            <div className="flex items-center gap-3">
                                <div className="text-right hidden lg:block">
                                    <div className="text-sm font-medium text-white">{session.user?.name}</div>
                                    <div className="text-xs text-slate-500">{session.user?.email}</div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => signOut()}
                                    className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                                >
                                    <LogOut className="w-4 h-4" />
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <Link href="/auth/signin" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                                Sign In
                            </Link>
                            <Button asChild className="glass-button-primary rounded-full px-6">
                                <Link href="/auth/signup">Get Started</Link>
                            </Button>
                        </>
                    )}
                </div>

                {/* Mobile Toggle */}
                <button
                    className="md:hidden p-2 text-slate-400 hover:text-white"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-x-0 top-16 bottom-0 z-40 bg-slate-950 border-t border-white/5 p-4 overflow-y-auto animate-in slide-in-from-top-4">
                    <div className="space-y-4 pb-8">
                        {status === "authenticated" ? (
                            <>
                                <div className="px-2 py-2 border-b border-white/5 mb-2">
                                    <div className="text-sm font-medium text-white">{session.user?.name}</div>
                                    <div className="text-xs text-slate-500">{session.user?.email}</div>
                                </div>
                                <Link
                                    href="/dashboard"
                                    className="block px-4 py-2 rounded-lg bg-white/5 text-white font-medium"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Dashboard
                                </Link>
                                <button
                                    onClick={() => signOut()}
                                    className="w-full text-left px-4 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                    Sign Out
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/auth/signin"
                                    className="block px-4 py-3 text-center rounded-lg bg-white/5 text-slate-300 hover:text-white font-medium"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Sign In
                                </Link>
                                <Link
                                    href="/auth/signup"
                                    className="block px-4 py-3 text-center rounded-lg bg-blue-600 text-white font-bold"
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
