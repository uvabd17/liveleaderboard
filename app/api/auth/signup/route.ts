import { NextResponse } from 'next/server'
import { hash } from 'bcrypt'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const { email, password, name, organizationName } = await req.json()

    // Validation
    if (!email || !password || !organizationName) {
      return NextResponse.json(
        { error: 'Email, password, and organization name are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    // Generate org slug from name
    const baseSlug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Check slug uniqueness
    let slug = baseSlug
    let counter = 1
    while (await db.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    // Hash password
    const hashedPassword = await hash(password, 12)

    // Create user and organization in transaction
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name: name || email.split('@')[0],
        }
      })

      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          slug,
          ownerId: user.id,
        }
      })

      // Link user to organization
      await tx.user.update({
        where: { id: user.id },
        data: { orgId: organization.id }
      })

      return { user, organization }
    })

    return NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
      }
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
