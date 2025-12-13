import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { token, profile } = body

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    // Find participant by access token
    // Note: Prisma JSON filtering is limited, so we fetch and filter
    const allParticipants = await db.participant.findMany()
    const participants = allParticipants.filter(p => {
      const profile = p.profile as any
      return profile && profile.accessToken === token
    })

    if (participants.length === 0) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    }

    const participant = participants[0]
    const currentProfile = (participant.profile as any) || {}

    // Merge profile updates (preserve accessToken)
    const updatedProfile = {
      ...currentProfile,
      ...profile,
      accessToken: currentProfile.accessToken, // Preserve access token
    }

    // Update participant profile
    const updated = await db.participant.update({
      where: { id: participant.id },
      data: {
        profile: updatedProfile,
      },
    })

    return NextResponse.json({
      success: true,
      profile: updated.profile,
    })
  } catch (error) {
    console.error('Failed to update participant profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

