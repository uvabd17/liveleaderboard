import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const APP_NAME = 'Live Leaderboard'
const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@liveleaderboard.app'

export async function sendVerificationEmail(email: string, token: string, name?: string) {
  const verifyUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`
  
  if (!resend) {
    console.log('[email] Resend not configured. Verification URL:', verifyUrl)
    return { success: true, mock: true }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Verify your email - ${APP_NAME}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #FAF9F6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              <h1 style="color: #1A1A1A; margin: 0 0 24px 0; font-size: 24px;">Welcome to ${APP_NAME}!</h1>
              <p style="color: #444; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Hi${name ? ` ${name}` : ''},<br><br>
                Please verify your email address by clicking the button below:
              </p>
              <a href="${verifyUrl}" style="display: inline-block; background: #1A1A1A; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 16px;">
                Verify Email Address
              </a>
              <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
                Or copy and paste this link into your browser:<br>
                <code style="display: block; background: #f4f4f4; padding: 12px; border-radius: 6px; margin-top: 8px; word-break: break-all; font-size: 12px;">${verifyUrl}</code>
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    })

    if (error) {
      console.error('[email] Failed to send verification email:', error)
      return { success: false, error }
    }

    console.log('[email] Verification email sent to:', email)
    return { success: true, data }
  } catch (error) {
    console.error('[email] Error sending verification email:', error)
    return { success: false, error }
  }
}

export async function sendPasswordResetEmail(email: string, token: string, name?: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`
  
  if (!resend) {
    console.log('[email] Resend not configured. Reset URL:', resetUrl)
    return { success: true, mock: true }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Reset your password - ${APP_NAME}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #FAF9F6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              <h1 style="color: #1A1A1A; margin: 0 0 24px 0; font-size: 24px;">Password Reset Request</h1>
              <p style="color: #444; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Hi${name ? ` ${name}` : ''},<br><br>
                We received a request to reset your password. Click the button below to create a new password:
              </p>
              <a href="${resetUrl}" style="display: inline-block; background: #1A1A1A; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 16px;">
                Reset Password
              </a>
              <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
                Or copy and paste this link into your browser:<br>
                <code style="display: block; background: #f4f4f4; padding: 12px; border-radius: 6px; margin-top: 8px; word-break: break-all; font-size: 12px;">${resetUrl}</code>
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email - your password won't be changed.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    })

    if (error) {
      console.error('[email] Failed to send password reset email:', error)
      return { success: false, error }
    }

    console.log('[email] Password reset email sent to:', email)
    return { success: true, data }
  } catch (error) {
    console.error('[email] Error sending password reset email:', error)
    return { success: false, error }
  }
}

export async function sendWelcomeEmail(email: string, name?: string) {
  if (!resend) {
    console.log('[email] Resend not configured. Skipping welcome email.')
    return { success: true, mock: true }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Welcome to ${APP_NAME}!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #FAF9F6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              <h1 style="color: #1A1A1A; margin: 0 0 24px 0; font-size: 24px;">Welcome to ${APP_NAME}! 🎉</h1>
              <p style="color: #444; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Hi${name ? ` ${name}` : ''},<br><br>
                Your email has been verified and your account is now active. You're all set to start creating amazing live events!
              </p>
              <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display: inline-block; background: #1A1A1A; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 16px;">
                Go to Dashboard
              </a>
              <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
              <p style="color: #666; font-size: 14px; margin: 0;">
                <strong>Quick Tips:</strong>
              </p>
              <ul style="color: #666; font-size: 14px; line-height: 1.8; padding-left: 20px;">
                <li>Create your first event from the dashboard</li>
                <li>Set up scoring criteria and rounds</li>
                <li>Invite judges and participants</li>
                <li>Watch your leaderboard update in real-time!</li>
              </ul>
            </div>
          </div>
        </body>
        </html>
      `
    })

    if (error) {
      console.error('[email] Failed to send welcome email:', error)
      return { success: false, error }
    }

    console.log('[email] Welcome email sent to:', email)
    return { success: true, data }
  } catch (error) {
    console.error('[email] Error sending welcome email:', error)
    return { success: false, error }
  }
}

// Generate secure random token
export function generateToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  const randomValues = new Uint8Array(length)
  crypto.getRandomValues(randomValues)
  for (let i = 0; i < length; i++) {
    token += chars[randomValues[i] % chars.length]
  }
  return token
}
