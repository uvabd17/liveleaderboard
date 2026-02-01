'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lock, Loader2, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react'

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
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-8 border border-[#1A1A1A]/10 dark:border-white/10">
          {status === 'validating' && (
            <div className="text-center">
              <Loader2 className="w-16 h-16 mx-auto text-blue-500 animate-spin mb-4" />
              <h1 className="text-xl font-semibold text-[#1A1A1A] dark:text-white mb-2">
                Validating Reset Link...
              </h1>
              <p className="text-[#1A1A1A]/60 dark:text-slate-400">
                Please wait
              </p>
            </div>
          )}

          {status === 'invalid' && (
            <div className="text-center">
              <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
              <h1 className="text-xl font-semibold text-[#1A1A1A] dark:text-white mb-2">
                Invalid Reset Link
              </h1>
              <p className="text-[#1A1A1A]/60 dark:text-slate-400 mb-6">
                {message}
              </p>
              <div className="space-y-3">
                <Link
                  href="/auth/forgot-password"
                  className="block w-full px-6 py-3 bg-[#1A1A1A] dark:bg-blue-600 text-white rounded-lg hover:bg-[#1A1A1A]/80 dark:hover:bg-blue-700 transition-colors text-center"
                >
                  Request New Reset Link
                </Link>
                <Link
                  href="/auth/signin"
                  className="block text-center text-sm text-[#1A1A1A]/60 dark:text-slate-400 hover:text-[#1A1A1A] dark:hover:text-white"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h1 className="text-xl font-semibold text-[#1A1A1A] dark:text-white mb-2">
                Password Reset!
              </h1>
              <p className="text-[#1A1A1A]/60 dark:text-slate-400 mb-6">
                {message} Redirecting to sign in...
              </p>
              <Link
                href="/auth/signin"
                className="inline-block px-6 py-3 bg-[#1A1A1A] dark:bg-blue-600 text-white rounded-lg hover:bg-[#1A1A1A]/80 dark:hover:bg-blue-700 transition-colors"
              >
                Continue to Sign In
              </Link>
            </div>
          )}

          {(status === 'valid' || status === 'loading' || status === 'error') && (
            <>
              <div className="text-center mb-6">
                <Lock className="w-12 h-12 mx-auto text-blue-500 mb-4" />
                <h1 className="text-2xl font-bold text-[#1A1A1A] dark:text-white mb-2">
                  Reset Your Password
                </h1>
                <p className="text-[#1A1A1A]/60 dark:text-slate-400">
                  Enter a new password for {email}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A]/70 dark:text-slate-300 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="w-full px-4 py-3 rounded-lg bg-[#FAF9F6] dark:bg-slate-800 border border-[#1A1A1A]/20 dark:border-slate-700 text-[#1A1A1A] dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1A1A1A]/40 dark:text-slate-500 hover:text-[#1A1A1A] dark:hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-[#1A1A1A]/50 dark:text-slate-500 mt-1">
                    Minimum 8 characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A]/70 dark:text-slate-300 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg bg-[#FAF9F6] dark:bg-slate-800 border border-[#1A1A1A]/20 dark:border-slate-700 text-[#1A1A1A] dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>

                {(status === 'error' || message) && status !== 'valid' && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full px-6 py-3 bg-[#1A1A1A] dark:bg-blue-600 text-white rounded-lg hover:bg-[#1A1A1A]/80 dark:hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
                  className="block text-center text-sm text-[#1A1A1A]/60 dark:text-slate-400 hover:text-[#1A1A1A] dark:hover:text-white"
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
