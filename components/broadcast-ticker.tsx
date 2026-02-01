'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Bell, X, Info, AlertTriangle, Zap } from 'lucide-react'

interface Broadcast {
    id: string
    message: string
    messageType: 'info' | 'warning' | 'urgent'
    timestamp: number
}

export function BroadcastTicker() {
    const params = useParams()
    const eventSlug = params.eventSlug as string
    const [activeBroadcast, setActiveBroadcast] = useState<Broadcast | null>(null)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        if (!eventSlug) return

        const eventSource = new EventSource(`/api/sse?eventSlug=${eventSlug}`)

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                if (data.type === 'broadcast') {
                    setActiveBroadcast(data)
                    setIsVisible(true)

                    // Auto-hide after 15 seconds unless it's urgent
                    if (data.messageType !== 'urgent') {
                        setTimeout(() => {
                            setIsVisible(false)
                        }, 15000)
                    }
                }
            } catch (error) {
                console.error('Failed to parse broadcast:', error)
            }
        }

        return () => eventSource.close()
    }, [eventSlug])

    if (!activeBroadcast || !isVisible) return null

    const bgStyles = {
        info: 'bg-blue-600/90 border-blue-400/50 shadow-blue-500/20',
        warning: 'bg-amber-600/90 border-amber-400/50 shadow-amber-500/20',
        urgent: 'bg-rose-600/90 border-rose-400/50 shadow-rose-500/40 animate-pulse',
    }

    const icons = {
        info: <Info className="w-5 h-5 text-blue-100" />,
        warning: <AlertTriangle className="w-5 h-5 text-amber-100" />,
        urgent: <Zap className="w-5 h-5 text-rose-100" />
    }

    return (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-2xl px-4 animate-fade-in-down`}>
            <div className={`flex items-center gap-4 p-4 rounded-2xl border backdrop-blur-md shadow-2xl ${bgStyles[activeBroadcast.messageType]}`}>
                <div className="flex-shrink-0 p-2 bg-white/10 rounded-xl">
                    {icons[activeBroadcast.messageType]}
                </div>
                <div className="flex-grow">
                    <div className="text-[10px] font-black font-mono text-white/60 uppercase tracking-widest mb-0.5">
                        Admin Broadcast
                    </div>
                    <div className="text-white font-bold text-lg leading-tight">
                        {activeBroadcast.message}
                    </div>
                </div>
                <button
                    onClick={() => setIsVisible(false)}
                    className="flex-shrink-0 p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
            <style jsx>{`
        @keyframes fade-in-down {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
        </div>
    )
}
