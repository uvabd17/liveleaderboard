import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Simple color extraction function (basic implementation)
function extractColorsFromImage(dataUrl: string): { primary: string; secondary: string; accent: string } {
  // For now, return default colors
  // In production, you would use a library like color-thief or vibrant.js
  // This would need to run client-side or use a canvas-based extraction
  return {
    primary: '#3b82f6',    // blue-500
    secondary: '#8b5cf6',  // purple-500
    accent: '#10b981'      // green-500
  }
}

export async function POST(request: Request) {
  try {
    const session: any = await getServerSession(authOptions as any)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { eventSlug, logoData, extractColors } = body

    if (!eventSlug) {
      return NextResponse.json({ error: 'Event slug required' }, { status: 400 })
    }

    const event = await prisma.event.findUnique({
      where: { slug: eventSlug },
      include: { organization: true }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check permissions
    const uid = session.user.id as string
    const isOwner = event.organization?.ownerId === uid
    const sameOrg = session.user.orgId && session.user.orgId === event.orgId

    if (!isOwner && !sameOrg) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validate logo data (basic validation for data URL)
    if (logoData && !logoData.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image data' }, { status: 400 })
    }

    // Extract colors if requested
    let brandColors = event.brandColors as any
    if (extractColors && logoData) {
      brandColors = extractColorsFromImage(logoData)
    }

    // Update event with logo
    const updated = await prisma.event.update({
      where: { id: event.id },
      data: {
        logoUrl: logoData || null,
        brandColors: brandColors || null as any
      }
    })

    return NextResponse.json({
      success: true,
      logoUrl: updated.logoUrl,
      brandColors: updated.brandColors
    })
  } catch (error) {
    console.error('Logo upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session: any = await getServerSession(authOptions as any)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const eventSlug = url.searchParams.get('eventSlug')

    if (!eventSlug) {
      return NextResponse.json({ error: 'Event slug required' }, { status: 400 })
    }

    const event = await prisma.event.findUnique({
      where: { slug: eventSlug },
      include: { organization: true }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check permissions
    const uid = session.user.id as string
    const isOwner = event.organization?.ownerId === uid
    const sameOrg = session.user.orgId && session.user.orgId === event.orgId

    if (!isOwner && !sameOrg) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Remove logo
    await prisma.event.update({
      where: { id: event.id },
      data: {
        logoUrl: null,
        brandColors: null as any
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logo deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
