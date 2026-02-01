import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hub } from '@/lib/hub'

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { eventSlug, message, type = 'info' } = await req.json()

        if (!eventSlug || !message) {
            return NextResponse.json({ error: 'Event slug and message are required' }, { status: 400 })
        }

        // Broadcast through the hub
        hub.broadcast('broadcast', {
            message,
            messageType: type, // 'info' | 'warning' | 'urgent'
            eventSlug,
            timestamp: Date.now(),
            id: Math.random().toString(36).substring(7)
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Broadcast error:', error)
        return NextResponse.json({ error: 'Failed to send broadcast' }, { status: 500 })
    }
}
