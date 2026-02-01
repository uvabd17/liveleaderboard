'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react'

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'resend'>('loading')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (token) {
      verifyEmail(token)
    } else {
      setStatus('resend')
      setMessage('Enter your email to receive a new verification link')
    }
  }, [token])

  async function verifyEmail(token: string) {
    try {
      const res = await fetch(`/api/auth/verify-email?token=${token}`)
      const data = await res.json()

      if (res.ok && data.success) {
        setStatus('success')
        setMessage('Your email has been verified successfully!')
        // Redirect to signin after 3 seconds
        setTimeout(() => router.push('/auth/signin'), 3000)
      } else {
        setStatus('error')
        setMessage(data.error || 'Failed to verify email')
      }
    } catch {
      setStatus('error')
      setMessage('An error occurred while verifying your email')
    }
  }

  async function resendVerification(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return

    setResending(true)
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await res.json()

      if (res.ok) {
        setStatus('success')
        setMessage('Verification email sent! Please check your inbox.')
      } else {
        setMessage(data.error || 'Failed to send verification email')
      }
    } catch {
      setMessage('An error occurred. Please try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-8 border border-[#1A1A1A]/10 dark:border-white/10">
          {status === 'loading' && (
            <div className="text-center">
              <Loader2 className="w-16 h-16 mx-auto text-blue-500 animate-spin mb-4" />
              <h1 className="text-xl font-semibold text-[#1A1A1A] dark:text-white mb-2">
                Verifying your email...
              </h1>
              <p className="text-[#1A1A1A]/60 dark:text-slate-400">
                Please wait while we verify your email address
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h1 className="text-xl font-semibold text-[#1A1A1A] dark:text-white mb-2">
                Email Verified!
              </h1>
              <p className="text-[#1A1A1A]/60 dark:text-slate-400 mb-6">
                {message}
              </p>
              <Link
                href="/auth/signin"
                className="inline-block px-6 py-3 bg-[#1A1A1A] dark:bg-blue-600 text-white rounded-lg hover:bg-[#1A1A1A]/80 dark:hover:bg-blue-700 transition-colors"
              >
                Continue to Sign In
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
              <h1 className="text-xl font-semibold text-[#1A1A1A] dark:text-white mb-2">
                Verification Failed
              </h1>
              <p className="text-[#1A1A1A]/60 dark:text-slate-400 mb-6">
                {message}
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => setStatus('resend')}
                  className="w-full px-6 py-3 bg-[#1A1A1A] dark:bg-blue-600 text-white rounded-lg hover:bg-[#1A1A1A]/80 dark:hover:bg-blue-700 transition-colors"
                >
                  Request New Verification Link
                </button>
                <Link
                  href="/auth/signin"
                  className="block text-sm text-[#1A1A1A]/60 dark:text-slate-400 hover:text-[#1A1A1A] dark:hover:text-white"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          )}

          {status === 'resend' && (
            <div>
              <div className="text-center mb-6">
                <Mail className="w-16 h-16 mx-auto text-blue-500 mb-4" />
                <h1 className="text-xl font-semibold text-[#1A1A1A] dark:text-white mb-2">
                  Resend Verification Email
                </h1>
                <p className="text-[#1A1A1A]/60 dark:text-slate-400">
                  {message}
                </p>
              </div>
              <form onSubmit={resendVerification} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A]/70 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg bg-[#FAF9F6] dark:bg-slate-800 border border-[#1A1A1A]/20 dark:border-slate-700 text-[#1A1A1A] dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="you@example.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={resending}
                  className="w-full px-6 py-3 bg-[#1A1A1A] dark:bg-blue-600 text-white rounded-lg hover:bg-[#1A1A1A]/80 dark:hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {resending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Verification Email'
                  )}
                </button>
                <Link
                  href="/auth/signin"
                  className="block text-center text-sm text-[#1A1A1A]/60 dark:text-slate-400 hover:text-[#1A1A1A] dark:hover:text-white"
                >
                  Back to Sign In
                </Link>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
