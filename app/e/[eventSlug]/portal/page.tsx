"use client"

import React, { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, ArrowRight, ShieldCheck, Trophy } from "lucide-react"
import toast from 'react-hot-toast'
import Link from "next/link"

export default function ParticipantLoginPage() {
    const { eventSlug } = useParams()
    const router = useRouter()
    const [accessCode, setAccessCode] = useState("")
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch("/api/participant/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accessCode, eventSlug }),
            })

            if (!res.ok) {
                throw new Error(await res.text())
            }

            const data = await res.json()
            toast.success(`Welcome back, ${data.participant.name}!`)
            router.push(`/e/${eventSlug}/portal/dashboard`)

        } catch (error: any) {
            toast.error("Invalid Access Code. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#020617] font-sans text-slate-200 selection:bg-blue-500/30">
            {/* Aurora Ambience */}
            <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />
            </div>

            {/* Simple Nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href={`/e/${eventSlug}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-blue-400" />
                        </div>
                        <span className="font-black text-base italic uppercase tracking-tighter text-white">Live Leaderboard</span>
                    </Link>
                </div>
            </nav>

            <div className="container mx-auto max-w-md pt-32 px-6">
                <Card className="glass-panel border-white/10 shadow-2xl rounded-3xl overflow-hidden">
                    <CardHeader className="text-center space-y-4 pb-2 pt-8">
                        <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <ShieldCheck className="w-8 h-8 text-blue-400" />
                        </div>
                        <div className="space-y-2">
                            <CardTitle className="text-2xl font-black italic uppercase tracking-tighter text-white">
                                Participant Portal
                            </CardTitle>
                            <CardDescription className="font-medium text-slate-400 text-sm">
                                Enter your unique access code to manage submissions.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 pt-4">
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black font-mono uppercase tracking-widest text-slate-500 ml-1">
                                    Access Code
                                </label>
                                <Input
                                    value={accessCode}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAccessCode(e.target.value.toUpperCase())}
                                    placeholder="e.g. A7X92B"
                                    className="bg-slate-800/50 border-white/10 text-center text-2xl font-mono tracking-[0.5em] h-16 uppercase placeholder:text-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50"
                                    maxLength={6}
                                    required
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-widest transition-all rounded-2xl text-sm"
                                disabled={loading || accessCode.length < 3}
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Enter Portal <ArrowRight className="ml-2 w-5 h-5" /></>}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <p className="text-center text-slate-600 text-xs mt-8 font-mono">
                    Don&apos;t have a code? Ask your event organizer.
                </p>
            </div>
        </div>
    )
}
