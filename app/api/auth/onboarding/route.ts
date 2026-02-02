import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { accountType, organizationName } = await req.json()

    // Validation
    if (!accountType || !['individual', 'organization'].includes(accountType)) {
      return NextResponse.json(
        { error: 'Invalid account type' },
        { status: 400 }
      )
    }

    if (!organizationName || organizationName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      )
    }

    // Get current user
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: { organization: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user already completed onboarding
    if (user.onboardingComplete && user.orgId) {
      return NextResponse.json(
        { error: 'Onboarding already completed' },
        { status: 400 }
      )
    }

    // Generate org slug from name
    const baseSlug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50) // Limit length

    // Ensure unique slug
    let slug = baseSlug || 'org'
    let counter = 1
    while (await db.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug || 'org'}-${counter}`
      counter++
    }

    // Create organization and update user in transaction
    await db.$transaction(async (tx) => {
      // Create organization
      const organization = await tx.organization.create({
        data: {
          name: organizationName.trim(),
          slug,
          ownerId: user.id,
        }
      })

      // Update user with org and onboarding status
      await tx.user.update({
        where: { id: user.id },
        data: {
          orgId: organization.id,
          accountType,
          onboardingComplete: true,
        }
      })
    })

    console.log(`[onboarding] Completed for ${session.user.email} as ${accountType}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[onboarding] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
