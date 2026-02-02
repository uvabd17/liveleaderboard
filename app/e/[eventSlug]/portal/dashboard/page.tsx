
import React from "react"
import { notFound, redirect } from "next/navigation"
import { db } from "@/lib/db"
import { cookies } from "next/headers"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BroadcastTicker } from "@/components/broadcast-ticker"
import { CheckCircle2, UploadCloud, ExternalLink, FileText, Command, LogOut, ArrowRight, Clock } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import SubmissionDialog from "./submission-dialog" // Client component for the dialog
import Link from "next/link"

export default async function ParticipantDashboard({ params }: { params: { eventSlug: string } }) {
    const { eventSlug } = params

    const event = await db.event.findUnique({ where: { slug: eventSlug } })
    if (!event) notFound()

    // Verify Session
    const participantId = cookies().get(`p_session_${event.id}`)?.value
    if (!participantId) {
        redirect(`/e/${eventSlug}/portal`)
    }

    const participant = await db.participant.findUnique({
        where: { id: participantId },
        include: { entries: true }
    })

    if (!participant) redirect(`/e/${eventSlug}/portal`)

    // Parse Rules for Rounds
    const rules = (event.rules as any) || {}
    const rounds = Array.isArray(rules.rounds) ? rules.rounds : Array.from({ length: 3 }).map((_, i) => ({ id: i + 1, name: `Round ${i + 1}` }))

    return (
        <div className="min-h-screen bg-cream text-charcoal">
            
            {/* Broadcast Ticker */}
            <BroadcastTicker />
            
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] bg-charcoal/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-charcoal/5 rounded-full blur-[120px]" />
            </div>

            {/* Navigation */}
            <nav className="sticky top-0 z-50 bg-cream/80 backdrop-blur-md border-b border-charcoal/5">
                <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href={`/e/${eventSlug}`} className="p-2 rounded-lg hover:bg-charcoal/5 transition-colors">
                            <Logo className="w-5 h-5" />
                        </Link>
                        <div>
                            <span className="font-display font-semibold text-charcoal block leading-none">Participant Portal</span>
                            <span className="text-xs text-charcoal/40">{event.name}</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="hidden md:block text-right">
                            <div className="text-sm font-medium text-charcoal">{participant.name}</div>
                            <div className="text-xs text-charcoal/40">{participant.kind}</div>
                        </div>
                        <form action={`/api/auth/signout`}> 
                             <Button variant="ghost" size="icon" className="text-charcoal/40 hover:text-rose-500 hover:bg-rose-50 rounded-lg" title="Sign out">
                                <LogOut className="w-4 h-4" />
                             </Button>
                        </form>
                    </div>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto py-10 px-6 space-y-8">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="font-display text-2xl font-semibold text-charcoal mb-1">
                            Your Dashboard
                        </h1>
                        <p className="text-charcoal/50 text-sm">
                            Manage your submissions for <span className="font-medium text-charcoal">{event.name}</span>
                        </p>
                    </div>
                    <div className="badge-minimal bg-emerald-50 text-emerald-600 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/> Access Granted
                    </div>
                </div>

                {/* Access Code Card */}
                <div className="card p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-charcoal/5 flex items-center justify-center shrink-0">
                        <Command className="w-5 h-5 text-charcoal/40" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-charcoal mb-0.5">Your Access Code</h3>
                        <p className="text-xs text-charcoal/40 truncate">
                            Use this to log in from other devices
                        </p>
                    </div>
                    <div className="bg-charcoal/5 px-4 py-2 rounded-lg">
                        <span className="font-mono text-lg font-bold text-charcoal tracking-wider">{participant.accessCode || 'N/A'}</span>
                    </div>
                </div>

                {/* Rounds Grid */}
                <div className="grid gap-4">
                    {rounds.map((round: any, index: number) => {
                        const roundNum = index + 1
                        const submission = participant.entries.find((s) => s.roundNumber === roundNum)
                        const isSubmitted = !!submission

                        return (
                            <div key={roundNum} className={`
                                group relative overflow-hidden card transition-all
                                ${isSubmitted 
                                    ? 'bg-emerald-50/50 border-emerald-200' 
                                    : ''
                                }
                            `}>
                                {/* Status Indicator Line */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${isSubmitted ? 'bg-emerald-500' : 'bg-charcoal/10'}`} />

                                <div className="p-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-3">
                                            <span className="badge-minimal">Round {roundNum}</span>
                                            {isSubmitted && (
                                                <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
                                                    <CheckCircle2 className="w-4 h-4" /> Submitted
                                                </div>
                                            )}
                                        </div>
                                        
                                        <h3 className="text-lg font-display font-semibold text-charcoal">
                                            {round.name || `Round ${roundNum}`}
                                        </h3>
                                        
                                        {isSubmitted && (
                                            <div className="flex items-center gap-2 text-sm text-charcoal/50 bg-charcoal/5 py-2 px-3 rounded-lg w-fit max-w-full">
                                                <ExternalLink className="w-3 h-3 shrink-0" />
                                                <a href={submission.url} target="_blank" rel="noreferrer" className="hover:text-charcoal truncate transition-colors">
                                                    {submission.url}
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    <div className="shrink-0">
                                        <SubmissionDialog
                                            eventSlug={eventSlug}
                                            roundNumber={roundNum}
                                            initialUrl={submission?.url}
                                            initialNotes={submission?.notes}
                                            roundName={round.name}
                                        />
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </main>
        </div>
    )
}

