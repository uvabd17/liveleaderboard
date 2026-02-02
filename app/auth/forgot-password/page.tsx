'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, Loader2, CheckCircle, ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { FloatingInput } from '@/components/ui/floating-input'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return

    setStatus('loading')
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await res.json()

      if (res.ok) {
        setStatus('success')
        setMessage(data.message || 'Password reset email sent!')
      } else {
        setStatus('error')
        setMessage(data.error || 'Failed to send reset email')
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
          {status === 'success' ? (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h1 className="text-xl font-semibold text-charcoal dark:text-white mb-2">
                Check Your Email
              </h1>
              <p className="text-charcoal/60 dark:text-white/60 mb-6">
                {message}
              </p>
              <p className="text-sm text-charcoal/50 dark:text-white/50 mb-6">
                Didn&apos;t receive the email? Check your spam folder or try again.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => { setStatus('idle'); setEmail('') }}
                  className="w-full px-6 py-3 bg-charcoal/10 dark:bg-white/10 text-charcoal dark:text-white rounded-full hover:bg-charcoal/20 dark:hover:bg-white/20 transition-colors"
                >
                  Try a Different Email
                </button>
                <Link
                  href="/auth/signin"
                  className="block text-center text-sm text-charcoal/60 dark:text-white/60 hover:text-charcoal dark:hover:text-white"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <Mail className="w-12 h-12 mx-auto text-charcoal/30 dark:text-white/30 mb-4" />
                <h1 className="text-2xl font-semibold text-charcoal dark:text-white mb-2">
                  Forgot Password?
                </h1>
                <p className="text-charcoal/60 dark:text-white/60">
                  Enter your email and we&apos;ll send you a reset link
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <FloatingInput
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />

                {status === 'error' && (
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
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>

                <Link
                  href="/auth/signin"
                  className="flex items-center justify-center gap-2 text-sm text-charcoal/60 dark:text-white/60 hover:text-charcoal dark:hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4" />
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
