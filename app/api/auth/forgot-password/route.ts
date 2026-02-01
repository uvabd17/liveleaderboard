import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateToken, sendPasswordResetEmail } from '@/lib/email'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({
      where: { email }
    })

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent'
      })
    }

    // Check if user has a password (not OAuth-only)
    if (!user.password) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent'
      })
    }

    // Generate reset token
    const token = generateToken(32)
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await db.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpires: expires
      }
    })

    // Send reset email
    await sendPasswordResetEmail(user.email, token, user.name || undefined)

    console.log(`[auth] Password reset requested for: ${user.email}`)

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent'
    })

  } catch (error) {
    console.error('[auth] Error requesting password reset:', error)
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    )
  }
}
