'use client'

import { useState } from 'react'
import { signIn, getProviders } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { Logo } from '@/components/brand/logo'
import { FloatingInput } from '@/components/ui/floating-input'

// Google icon SVG component
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
)

export default function SignInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [hasGoogleProvider, setHasGoogleProvider] = useState(true) // Default to true, will be validated on click

  // Check for error in URL params
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam === 'EMAIL_NOT_VERIFIED') {
      setError('Please verify your email before signing in. Check your inbox for a verification link.')
    } else if (errorParam) {
      setError('An error occurred during sign in. Please try again.')
    }

    // Check if Google provider is available
    getProviders().then(providers => {
      if (providers?.google) {
        setHasGoogleProvider(true)
      }
    })
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        if (result.error === 'EMAIL_NOT_VERIFIED') {
          setError('Please verify your email before signing in. Check your inbox.')
        } else {
          setError('Invalid email or password')
        }
      } else {
        // Set user role as admin after successful login
        if (typeof window !== 'undefined') {
          localStorage.setItem('user-role', 'admin')
        }
        const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
        router.push(callbackUrl)
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    try {
      const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
      await signIn('google', { callbackUrl })
    } catch (err) {
      setError('Failed to sign in with Google')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Logo size={24} variant="icon" />
            <span className="font-display text-lg font-semibold text-charcoal dark:text-white">Live Leaderboard</span>
          </Link>
          <h1 className="font-display text-3xl font-semibold text-charcoal dark:text-white mb-2">Welcome back</h1>
          <p className="text-charcoal/50 dark:text-white/50">Sign in to manage your events</p>
        </div>

        {/* Card */}
        <div className="card p-8 bg-white dark:bg-slate-900">
          {/* Google Sign In */}
          {hasGoogleProvider && (
            <>
              <button
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full h-12 rounded-full border border-charcoal/10 dark:border-white/10 bg-white dark:bg-transparent hover:bg-charcoal/5 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-3 text-charcoal dark:text-white font-medium disabled:opacity-50"
              >
                {googleLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <GoogleIcon />
                    Continue with Google
                  </>
                )}
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-charcoal/10 dark:border-white/10" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white dark:bg-slate-900 text-charcoal/40 dark:text-white/40">or continue with email</span>
                </div>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 px-4 py-3 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <FloatingInput
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <div>
              <FloatingInput
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <div className="mt-2 text-right">
                <Link href="/auth/forgot-password" className="text-xs text-charcoal/50 dark:text-white/50 hover:text-charcoal dark:hover:text-white transition-colors">
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full h-12 rounded-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-charcoal/5 dark:border-white/5 text-center">
            <p className="text-charcoal/50 dark:text-white/50 text-sm">
              New to Live Leaderboard?{' '}
              <Link href="/auth/signup" className="text-charcoal dark:text-white font-medium hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
