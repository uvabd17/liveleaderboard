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
        <div className="min-h-screen bg-cream text-charcoal">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] bg-charcoal/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-charcoal/5 rounded-full blur-[120px]" />
            </div>

            {/* Nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-cream/80 backdrop-blur-md border-b border-charcoal/5">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href={`/e/${eventSlug}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <Trophy className="w-5 h-5 text-charcoal" />
                        <span className="font-display font-semibold text-charcoal">Live Leaderboard</span>
                    </Link>
                </div>
            </nav>

            <div className="max-w-md mx-auto pt-32 px-6">
                <Card className="card border-charcoal/10 shadow-lg overflow-hidden">
                    <CardHeader className="text-center space-y-4 pb-2 pt-8">
                        <div className="mx-auto w-14 h-14 rounded-2xl bg-charcoal/5 flex items-center justify-center">
                            <ShieldCheck className="w-7 h-7 text-charcoal/60" />
                        </div>
                        <div className="space-y-2">
                            <CardTitle className="font-display text-xl font-semibold text-charcoal">
                                Participant Portal
                            </CardTitle>
                            <CardDescription className="text-charcoal/50 text-sm">
                                Enter your unique access code to manage submissions.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 pt-4">
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-charcoal">
                                    Access Code
                                </label>
                                <Input
                                    value={accessCode}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAccessCode(e.target.value.toUpperCase())}
                                    placeholder="e.g. A7X92B"
                                    className="input text-center text-2xl font-mono tracking-[0.3em] h-14 uppercase"
                                    maxLength={6}
                                    required
                                />
                            </div>

                            <Button
                                type="submit"
                                className="btn-primary w-full h-12 rounded-xl"
                                disabled={loading || accessCode.length < 3}
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Enter Portal <ArrowRight className="ml-2 w-4 h-4" /></>}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <p className="text-center text-charcoal/40 text-xs mt-8">
                    Don&apos;t have a code? Ask your event organizer.
                </p>
            </div>
        </div>
    )
}
