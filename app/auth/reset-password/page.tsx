'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lock, Loader2, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { FloatingInput } from '@/components/ui/floating-input'

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'validating' | 'valid' | 'invalid' | 'loading' | 'success' | 'error'>('validating')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (token) {
      validateToken(token)
    } else {
      setStatus('invalid')
      setMessage('No reset token provided')
    }
  }, [token])

  async function validateToken(token: string) {
    try {
      const res = await fetch(`/api/auth/reset-password?token=${token}`)
      const data = await res.json()

      if (data.valid) {
        setStatus('valid')
        setEmail(data.email)
      } else {
        setStatus('invalid')
        setMessage(data.error || 'Invalid or expired reset link')
      }
    } catch {
      setStatus('invalid')
      setMessage('Failed to validate reset link')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (password !== confirmPassword) {
      setMessage('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setMessage('Password must be at least 8 characters')
      return
    }

    setStatus('loading')
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })
      const data = await res.json()

      if (res.ok && data.success) {
        setStatus('success')
        setMessage('Password reset successfully!')
        // Redirect to signin after 3 seconds
        setTimeout(() => router.push('/auth/signin'), 3000)
      } else {
        setStatus('error')
        setMessage(data.error || 'Failed to reset password')
      }
    } catch {
      setStatus('error')
      setMessage('An error occurred. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Logo size={24} variant="icon" />
            <span className="font-display text-lg font-semibold text-charcoal dark:text-white">Live Leaderboard</span>
          </Link>
        </div>

        <div className="card p-8 bg-white dark:bg-slate-900">
          {status === 'validating' && (
            <div className="text-center">
              <Loader2 className="w-16 h-16 mx-auto text-charcoal/30 dark:text-white/30 animate-spin mb-4" />
              <h1 className="text-xl font-semibold text-charcoal dark:text-white mb-2">
                Validating Reset Link...
              </h1>
              <p className="text-charcoal/60 dark:text-white/60">
                Please wait
              </p>
            </div>
          )}

          {status === 'invalid' && (
            <div className="text-center">
              <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
              <h1 className="text-xl font-semibold text-charcoal dark:text-white mb-2">
                Invalid Reset Link
              </h1>
              <p className="text-charcoal/60 dark:text-white/60 mb-6">
                {message}
              </p>
              <div className="space-y-3">
                <Link
                  href="/auth/forgot-password"
                  className="block w-full px-6 py-3 btn-primary rounded-full text-center"
                >
                  Request New Reset Link
                </Link>
                <Link
                  href="/auth/signin"
                  className="block text-center text-sm text-charcoal/60 dark:text-white/60 hover:text-charcoal dark:hover:text-white"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h1 className="text-xl font-semibold text-charcoal dark:text-white mb-2">
                Password Reset!
              </h1>
              <p className="text-charcoal/60 dark:text-white/60 mb-6">
                {message} Redirecting to sign in...
              </p>
              <Link
                href="/auth/signin"
                className="inline-block px-6 py-3 btn-primary rounded-full"
              >
                Continue to Sign In
              </Link>
            </div>
          )}

          {(status === 'valid' || status === 'loading' || status === 'error') && (
            <>
              <div className="text-center mb-6">
                <Lock className="w-12 h-12 mx-auto text-charcoal/30 dark:text-white/30 mb-4" />
                <h1 className="text-2xl font-semibold text-charcoal dark:text-white mb-2">
                  Reset Your Password
                </h1>
                <p className="text-charcoal/60 dark:text-white/60">
                  Enter a new password for {email}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <FloatingInput
                  label="New Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  hint="Minimum 8 characters"
                  autoComplete="new-password"
                />

                <FloatingInput
                  label="Confirm Password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="flex items-center gap-2 text-sm text-charcoal/60 dark:text-white/60 hover:text-charcoal dark:hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showPassword ? 'Hide passwords' : 'Show passwords'}
                </button>

                {(status === 'error' || message) && status !== 'valid' && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 dark:text-rose-400 text-sm">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="btn-primary w-full h-12 rounded-full flex items-center justify-center gap-2"
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </button>

                <Link
                  href="/auth/signin"
                  className="block text-center text-sm text-charcoal/60 dark:text-white/60 hover:text-charcoal dark:hover:text-white"
                >
                  Back to Sign In
                </Link>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
