import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session: any = await getServerSession(authOptions as any)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { logoData, brandColors } = body

    if (!session.user.orgId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Validate logo data (basic validation for data URL)
    if (logoData && !logoData.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image data' }, { status: 400 })
    }

    // Update organization with logo and branding
    const updated = await prisma.organization.update({
      where: { id: session.user.orgId },
      data: {
          brandingTheme: {
            logoUrl: logoData || null,
            brandColors: brandColors || null as any,
        }
      }
    })

    return NextResponse.json({
      success: true,
      brandingTheme: updated.brandingTheme
    })
  } catch (error) {
    console.error('Organization logo upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session: any = await getServerSession(authOptions as any)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.orgId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Remove organization branding
    await prisma.organization.update({
      where: { id: session.user.orgId },
      data: {
        brandingTheme: null as any
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Organization logo deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const session: any = await getServerSession(authOptions as any)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.orgId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    const org = await prisma.organization.findUnique({
      where: { id: session.user.orgId },
      select: { brandingTheme: true }
    })

    return NextResponse.json({
      brandingTheme: org?.brandingTheme || null
    })
  } catch (error) {
    console.error('Failed to fetch organization branding:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


