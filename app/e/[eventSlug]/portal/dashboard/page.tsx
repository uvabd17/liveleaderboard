
import React from "react"
import { notFound, redirect } from "next/navigation"
import { db } from "@/lib/db"
import { cookies } from "next/headers"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BroadcastTicker } from "@/components/broadcast-ticker"
import { CheckCircle2, UploadCloud, ExternalLink, FileText, Command, LogOut, ArrowRight, Trophy, Clock } from "lucide-react"
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
        <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-blue-500/30 font-sans">
            
            {/* Broadcast Ticker */}
            <BroadcastTicker />
            
            {/* Aurora Ambience */}
            <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02] bg-center" />
            </div>

            {/* Navigation */}
            <nav className="sticky top-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href={`/e/${eventSlug}`} className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center hover:bg-blue-600/20 transition-colors">
                            <Trophy className="w-5 h-5 text-blue-400" />
                        </Link>
                        <div>
                            <span className="font-black text-base italic uppercase tracking-tighter text-white block leading-none">Participant Portal</span>
                            <span className="text-[10px] font-black font-mono text-slate-600 uppercase tracking-widest">{event.name}</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="hidden md:block text-right">
                            <div className="text-sm font-bold text-white">{participant.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono uppercase">{participant.kind}</div>
                        </div>
                        <form action={`/api/auth/signout`}> 
                             <Button variant="ghost" size="icon" className="text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl" title="Sign out">
                                <LogOut className="w-4 h-4" />
                             </Button>
                        </form>
                    </div>
                </div>
            </nav>

            <main className="container mx-auto max-w-4xl py-10 px-6 space-y-8">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-white mb-2">
                            Mission Dashboard
                        </h1>
                        <p className="text-slate-400 font-medium text-sm">
                            Manage your submissions and track your progress for <span className="text-blue-400 font-semibold">{event.name}</span>.
                        </p>
                    </div>
                    <Badge variant="outline" className="w-fit border-emerald-500/50 text-emerald-400 bg-emerald-950/30 px-4 py-2 uppercase tracking-widest font-mono text-[10px] flex items-center gap-2 rounded-xl">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/> Access Granted
                    </Badge>
                </div>

                {/* Access Code Card */}
                <div className="glass-panel rounded-2xl p-5 flex items-center gap-4 border-white/5">
                    <div className="w-12 h-12 rounded-xl bg-slate-800/50 border border-white/5 flex items-center justify-center shrink-0">
                        <Command className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-white mb-0.5">Your Access Code</h3>
                        <p className="text-[10px] text-slate-500 font-mono truncate">
                            Use this to log in from other devices
                        </p>
                    </div>
                    <div className="bg-slate-800/50 border border-white/10 px-4 py-2 rounded-xl">
                        <span className="font-mono text-lg font-bold text-blue-400 tracking-[0.2em]">{participant.accessCode || 'N/A'}</span>
                    </div>
                </div>

                {/* Rounds Grid */}
                <div className="grid gap-6">
                    {rounds.map((round: any, index: number) => {
                        const roundNum = index + 1
                        const submission = participant.entries.find((s) => s.roundNumber === roundNum)
                        const isSubmitted = !!submission

                        return (
                            <div key={roundNum} className={`
                                group relative overflow-hidden rounded-2xl border transition-all duration-300
                                ${isSubmitted 
                                    ? 'bg-emerald-950/10 border-emerald-500/20 hover:border-emerald-500/30' 
                                    : 'bg-slate-900/40 border-white/5 hover:border-white/10 hover:bg-slate-900/60'
                                }
                            `}>
                                {/* Status Indicator Line */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${isSubmitted ? 'bg-emerald-500' : 'bg-slate-800'}`} />

                                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                                    <div className="space-y-3 flex-1">
                                        <div className="flex items-center gap-3">
                                            <Badge variant="secondary" className="bg-slate-800 text-slate-400 font-mono text-[10px] uppercase tracking-widest border border-slate-700">
                                                Round {roundNum}
                                            </Badge>
                                            {isSubmitted && (
                                                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                                                    <CheckCircle2 className="w-4 h-4" /> Submitted
                                                </div>
                                            )}
                                        </div>
                                        
                                        <h3 className="text-2xl font-bold text-white font-outfit tracking-tight group-hover:text-blue-400 transition-colors">
                                            {round.name || `Round ${roundNum}`}
                                        </h3>
                                        
                                        {isSubmitted && (
                                            <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-950/50 py-2 px-3 rounded-lg w-fit max-w-full">
                                                <ExternalLink className="w-3 h-3 shrink-0" />
                                                <a href={submission.url} target="_blank" rel="noreferrer" className="hover:text-blue-400 truncate transition-colors">
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

