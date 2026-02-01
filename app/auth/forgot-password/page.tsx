'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, Loader2, CheckCircle, ArrowLeft } from 'lucide-react'

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
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-8 border border-[#1A1A1A]/10 dark:border-white/10">
          {status === 'success' ? (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h1 className="text-xl font-semibold text-[#1A1A1A] dark:text-white mb-2">
                Check Your Email
              </h1>
              <p className="text-[#1A1A1A]/60 dark:text-slate-400 mb-6">
                {message}
              </p>
              <p className="text-sm text-[#1A1A1A]/50 dark:text-slate-500 mb-6">
                Didn&apos;t receive the email? Check your spam folder or try again.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => { setStatus('idle'); setEmail('') }}
                  className="w-full px-6 py-3 bg-[#1A1A1A]/10 dark:bg-slate-800 text-[#1A1A1A] dark:text-white rounded-lg hover:bg-[#1A1A1A]/20 dark:hover:bg-slate-700 transition-colors"
                >
                  Try a Different Email
                </button>
                <Link
                  href="/auth/signin"
                  className="block text-center text-sm text-[#1A1A1A]/60 dark:text-slate-400 hover:text-[#1A1A1A] dark:hover:text-white"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <Mail className="w-12 h-12 mx-auto text-blue-500 mb-4" />
                <h1 className="text-2xl font-bold text-[#1A1A1A] dark:text-white mb-2">
                  Forgot Password?
                </h1>
                <p className="text-[#1A1A1A]/60 dark:text-slate-400">
                  Enter your email and we&apos;ll send you a reset link
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
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

                {status === 'error' && (
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
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>

                <Link
                  href="/auth/signin"
                  className="flex items-center justify-center gap-2 text-sm text-[#1A1A1A]/60 dark:text-slate-400 hover:text-[#1A1A1A] dark:hover:text-white"
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
