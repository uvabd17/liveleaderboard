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
            "fixed top-4 inset-x-0 z-50 transition-all duration-500",
            className
        )}>
            <div className="max-w-7xl mx-auto px-4">
                <div className="glass-panel rounded-[2rem] px-6 h-16 flex items-center justify-between border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                    {/* Logo & Brand */}
                    <Link href="/" className="hover:opacity-90 transition-all hover:scale-105 active:scale-95">
                        <Logo animated size={28} />
                    </Link>

                    {/* Main Navigation links could go here if global, but usually they are event-specific */}
                    {/* For the global navbar, we focus on Dashboard/Auth */}

                    <div className="hidden md:flex items-center gap-1">
                        {status === "authenticated" ? (
                            <>
                                <Link
                                    href="/dashboard"
                                    className="px-4 py-2 rounded-xl text-sm font-black font-mono tracking-widest text-slate-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2 uppercase"
                                >
                                    <LayoutDashboard className="w-4 h-4" /> Dashboard
                                </Link>

                                <div className="w-[1px] h-4 bg-white/10 mx-2" />

                                <div className="flex items-center gap-4 pl-2">
                                    <div className="flex flex-col items-end">
                                        <div className="text-[10px] font-black font-mono text-blue-400 uppercase tracking-widest">Operator</div>
                                        <div className="text-xs font-bold text-white max-w-[120px] truncate">{session.user?.name}</div>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => signOut()}
                                        className="w-10 h-10 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                                        title="Sign Out"
                                    >
                                        <LogOut className="w-4 h-4" />
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Link
                                    href="/auth/signin"
                                    className="px-6 py-2 rounded-xl text-sm font-black font-mono tracking-widest text-slate-400 hover:text-white transition-all uppercase"
                                >
                                    Login
                                </Link>
                                <Button asChild className="bg-white text-black hover:bg-slate-200 font-black rounded-xl px-6 h-10 shadow-lg transition-all hover:scale-105 active:scale-95">
                                    <Link href="/auth/signup">Get Started</Link>
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Mobile Toggle */}
                    <button
                        className="md:hidden p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-colors"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm pt-24 px-4 overflow-y-auto" onClick={() => setMobileMenuOpen(false)}>
                    <div className="glass-panel rounded-[2.5rem] p-6 border-white/10 space-y-4 animate-in fade-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        {status === "authenticated" ? (
                            <>
                                <div className="px-4 py-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="text-[10px] font-black font-mono text-blue-400 uppercase tracking-widest mb-1">Authenticated Operator</div>
                                    <div className="text-sm font-bold text-white">{session.user?.name}</div>
                                    <div className="text-xs text-slate-500 font-mono truncate">{session.user?.email}</div>
                                </div>
                                <Link
                                    href="/dashboard"
                                    className="flex items-center justify-between px-6 py-4 rounded-2xl bg-white/5 text-white font-black font-mono uppercase tracking-widest text-xs hover:bg-white/10 transition-colors"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Dashboard
                                    <LayoutDashboard className="w-4 h-4" />
                                </Link>
                                <button
                                    onClick={() => signOut()}
                                    className="w-full flex items-center justify-between px-6 py-4 rounded-2xl bg-rose-500/10 text-rose-400 font-black font-mono uppercase tracking-widest text-xs transition-colors"
                                >
                                    Log Out
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/auth/signin"
                                    className="block px-6 py-4 text-center rounded-2xl bg-white/5 text-slate-300 hover:text-white font-black font-mono uppercase tracking-widest text-xs"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Sign In
                                </Link>
                                <Link
                                    href="/auth/signup"
                                    className="block px-6 py-4 text-center rounded-2xl bg-white text-black font-black font-mono uppercase tracking-widest text-xs shadow-xl"
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
