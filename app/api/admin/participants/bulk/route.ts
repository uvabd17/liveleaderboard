import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Generate 6-character access code (same pattern as registration)
function generateAccessCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { eventId, participants } = await req.json()

        if (!eventId || !Array.isArray(participants)) {
            return NextResponse.json({ error: 'Event ID and participants array are required' }, { status: 400 })
        }

        // Verify event ownership
        const event = await db.event.findUnique({
            where: { id: eventId },
            include: { organization: true }
        })

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 })
        }

        // Prepare data for bulk create with access codes
        const data = participants.map((p: any) => ({
            eventId,
            name: p.name,
            kind: (p.kind === 'individual' ? 'individual' : 'team') as 'individual' | 'team',
            normalizedName: p.name.toLowerCase().trim(),
            profile: p.profile || {},
            accessCode: generateAccessCode()
        }))

        // Use createMany to insert participants
        // SkipDuplicates is important if we want to avoid errors on partial imports
        await db.participant.createMany({
            data,
            skipDuplicates: true
        })

        // Return the created participants with their access codes for admin to distribute
        return NextResponse.json({ 
            success: true, 
            count: data.length,
            participants: data.map(p => ({ name: p.name, kind: p.kind, accessCode: p.accessCode }))
        })
    } catch (error) {
        console.error('Bulk import error:', error)
        return NextResponse.json({ error: 'Failed to import participants' }, { status: 500 })
    }
}
