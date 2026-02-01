'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Sparkles, Trophy, Zap, AlertCircle } from 'lucide-react'

export function StageCinematics() {
    const params = useParams()
    const eventSlug = params.eventSlug as string
    const [activeEffect, setActiveEffect] = useState<'celebration' | 'alert' | 'update' | null>(null)

    useEffect(() => {
        if (!eventSlug) return

        const eventSource = new EventSource(`/api/sse?eventSlug=${eventSlug}`)

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)

                if (data.type === 'broadcast' && data.messageType === 'urgent') {
                    setActiveEffect('alert')
                    setTimeout(() => setActiveEffect(null), 5000)
                }

                if (data.type === 'leaderboard-update') {
                    setActiveEffect('update')
                    setTimeout(() => setActiveEffect(null), 3000)
                }
            } catch (error) {
                console.error('Failed to parse cinematic trigger:', error)
            }
        }

        eventSource.onerror = () => {
            // Safe cleanup on error
            try {
                eventSource.close()
            } catch (e) {
                // Already closed, ignore
            }
        }

        return () => {
            // Safe cleanup on unmount - wrap in try-catch
            try {
                eventSource.close()
            } catch (e) {
                // Already closed, ignore
            }
        }
    }, [eventSlug])

    if (!activeEffect) return null

    return (
        <div className="fixed inset-0 pointer-events-none z-[150] flex items-center justify-center overflow-hidden">
            {activeEffect === 'alert' && (
                <div className="absolute inset-0 bg-rose-600/20 backdrop-blur-sm animate-pulse-fast">
                    <div className="absolute top-0 left-0 w-full h-1 bg-rose-500 animate-slide-right" />
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-rose-500 animate-slide-left" />
                </div>
            )}

            {activeEffect === 'update' && (
                <div className="absolute inset-x-0 bottom-10 flex justify-center animate-bounce-in">
                    <div className="bg-blue-600/90 border border-blue-400/50 rounded-full px-6 py-2 shadow-2xl backdrop-blur-md flex items-center gap-3">
                        <RefreshIcon className="w-4 h-4 text-blue-100 animate-spin" />
                        <span className="text-white font-black font-mono text-[10px] uppercase tracking-widest">Global Standings Updated</span>
                    </div>
                </div>
            )}

            <style jsx>{`
        @keyframes pulse-fast {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.6; }
        }
        @keyframes slide-right {
          from { transform: translateX(-100%); }
          to { transform: translateX(100%); }
        }
        @keyframes slide-left {
          from { transform: translateX(100%); }
          to { transform: translateX(-100%); }
        }
        @keyframes bounce-in {
          0% { transform: translateY(100px); opacity: 0; }
          60% { transform: translateY(-10px); opacity: 1; }
          100% { transform: translateY(0); }
        }
        .animate-pulse-fast { animation: pulse-fast 0.5s infinite; }
        .animate-slide-right { animation: slide-right 2s linear infinite; }
        .animate-slide-left { animation: slide-left 2s linear infinite; }
        .animate-bounce-in { animation: bounce-in 0.6s cubic-bezier(0.17, 0.67, 0.83, 0.67) forwards; }
      `}</style>
        </div>
    )
}

function RefreshIcon({ className }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 16h5v5" />
        </svg>
    )
}
