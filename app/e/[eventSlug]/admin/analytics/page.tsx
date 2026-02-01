'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, BarChart3, TrendingUp, ShieldCheck, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface JudgeStat {
    id: string
    name: string
    participantsScored: number
    avgScore: number
    totalSubmissions: number
}

interface AnalyticsData {
    judgeStats: JudgeStat[]
    overall: {
        totalScoresSubmitted: number
        averagePoints: number
        participantsWithScores: number
    }
}

export default function AnalyticsPage() {
    const params = useParams()
    const eventSlug = params.eventSlug as string
    const [data, setData] = useState<AnalyticsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const fetchAnalytics = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true)
        try {
            const res = await fetch(`/api/admin/analytics?eventSlug=${eventSlug}`)
            if (res.ok) {
                const json = await res.json()
                setData(json)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        fetchAnalytics()
        const interval = setInterval(() => fetchAnalytics(), 30000) // Auto-refresh every 30s
        return () => clearInterval(interval)
    }, [eventSlug])

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#1A1A1A] flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-[#1A1A1A] dark:text-blue-500 animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#1A1A1A] text-[#1A1A1A] dark:text-slate-200 p-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href={`/e/${eventSlug}/admin`}>
                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/5">
                                <ArrowLeft className="w-5 h-5 text-slate-400" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black text-[#1A1A1A] dark:text-white uppercase italic tracking-tighter">Judge Insights</h1>
                            <p className="text-[10px] text-[#1A1A1A]/50 dark:text-slate-500 font-mono tracking-widest uppercase">Real-time judging analysis</p>
                        </div>
                    </div>
                    <Button
                        onClick={() => fetchAnalytics(true)}
                        disabled={refreshing}
                        variant="outline"
                        className="rounded-full border-[#1A1A1A]/10 dark:border-white/10 bg-[#1A1A1A]/5 dark:bg-white/5 hover:bg-[#1A1A1A]/10 dark:hover:bg-white/10 text-xs font-black uppercase tracking-widest px-6"
                    >
                        <RefreshCw className={`w-3 h-3 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        {refreshing ? 'Syncing...' : 'Sync Data'}
                    </Button>
                </div>

                {/* Top-Level Totals */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="card p-8 rounded-[2rem] border-[#1A1A1A]/10 dark:border-white/10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 text-blue-600/10 dark:text-blue-500/10 group-hover:scale-110 transition-transform">
                            <TrendingUp className="w-24 h-24" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black font-mono text-[#1A1A1A]/50 dark:text-slate-500 tracking-widest uppercase">Total Submissions</p>
                            <p className="text-5xl font-black text-[#1A1A1A] dark:text-white italic tracking-tighter mt-2">{data?.overall.totalScoresSubmitted}</p>
                        </div>
                    </div>
                    <div className="card p-8 rounded-[2rem] border-[#1A1A1A]/10 dark:border-white/10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 text-indigo-600/10 dark:text-indigo-500/10 group-hover:scale-110 transition-transform">
                            <Users className="w-24 h-24" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black font-mono text-[#1A1A1A]/50 dark:text-slate-500 tracking-widest uppercase">Participants Evaluated</p>
                            <p className="text-5xl font-black text-[#1A1A1A] dark:text-white italic tracking-tighter mt-2">{data?.overall.participantsWithScores}</p>
                        </div>
                    </div>
                    <div className="card p-8 rounded-[2rem] border-[#1A1A1A]/10 dark:border-white/10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 text-emerald-600/10 dark:text-emerald-500/10 group-hover:scale-110 transition-transform">
                            <BarChart3 className="w-24 h-24" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black font-mono text-[#1A1A1A]/50 dark:text-slate-500 tracking-widest uppercase">System Avg Score</p>
                            <p className="text-5xl font-black text-[#1A1A1A] dark:text-white italic tracking-tighter mt-2">{data?.overall.averagePoints}</p>
                        </div>
                    </div>
                </div>

                {/* Detailed Judge Table */}
                <div className="card rounded-[2.5rem] border-[#1A1A1A]/10 dark:border-white/10 overflow-hidden">
                    <div className="p-8 border-b border-[#1A1A1A]/5 dark:border-white/5">
                        <h3 className="text-sm font-black text-[#1A1A1A] dark:text-white uppercase italic tracking-widest">Active Judging Matrix</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#1A1A1A]/5 dark:bg-white/5 border-b border-[#1A1A1A]/5 dark:border-white/5">
                                <tr>
                                    <th className="px-8 py-4 text-left text-[10px] font-black font-mono text-[#1A1A1A]/50 dark:text-slate-500 uppercase tracking-widest">Judge</th>
                                    <th className="px-8 py-4 text-center text-[10px] font-black font-mono text-[#1A1A1A]/50 dark:text-slate-500 uppercase tracking-widest">Coverage</th>
                                    <th className="px-8 py-4 text-center text-[10px] font-black font-mono text-[#1A1A1A]/50 dark:text-slate-500 uppercase tracking-widest">Submissions</th>
                                    <th className="px-8 py-4 text-center text-[10px] font-black font-mono text-[#1A1A1A]/50 dark:text-slate-500 uppercase tracking-widest">Point Bias (Avg)</th>
                                    <th className="px-8 py-4 text-right text-[10px] font-black font-mono text-[#1A1A1A]/50 dark:text-slate-500 uppercase tracking-widest">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1A1A1A]/5 dark:divide-white/5 text-sm">
                                {data?.judgeStats.map((judge) => (
                                    <tr key={judge.id} className="hover:bg-[#1A1A1A]/5 dark:hover:bg-white/5 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center font-black text-blue-600 dark:text-blue-400">
                                                    {judge.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-[#1A1A1A] dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase">{judge.name}</div>
                                                    <div className="text-[10px] text-[#1A1A1A]/50 dark:text-slate-500 font-mono">UID: {judge.id.slice(0, 8)}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center font-mono font-bold text-[#1A1A1A] dark:text-white">
                                            {judge.participantsScored}
                                        </td>
                                        <td className="px-8 py-6 text-center font-mono text-[#1A1A1A]/60 dark:text-slate-400">
                                            {judge.totalSubmissions}
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className={`px-4 py-1.5 rounded-full font-mono font-bold text-xs ${judge.avgScore > (data?.overall.averagePoints * 1.2) ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                                judge.avgScore < (data?.overall.averagePoints * 0.8) ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                                    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                }`}>
                                                {judge.avgScore}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2 text-[10px] font-black font-mono text-emerald-500">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                LIVE
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {data?.judgeStats.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-20 text-center text-[#1A1A1A]/50 dark:text-slate-500 font-mono uppercase text-xs">
                                            <AlertCircle className="w-8 h-8 mx-auto mb-4 opacity-20" />
                                            Awaiting Judging Activity...
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Bias Legend */}
                <div className="flex items-center gap-8 px-8 py-4 card rounded-2xl border-[#1A1A1A]/5 dark:border-white/5 opacity-60">
                    <div className="text-[10px] font-black font-mono text-[#1A1A1A]/50 dark:text-slate-500 tracking-widest uppercase">Point Bias Legend:</div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-black font-mono text-[#1A1A1A]/60 dark:text-slate-400 uppercase">Balanced (±20%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-[10px] font-black font-mono text-[#1A1A1A]/60 dark:text-slate-400 uppercase">Conservative Bias</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                        <span className="text-[10px] font-black font-mono text-[#1A1A1A]/60 dark:text-slate-400 uppercase">Generous Bias</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
