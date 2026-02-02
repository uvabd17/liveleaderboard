'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, getProviders } from 'next-auth/react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
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

export default function SignUpPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [hasGoogleProvider, setHasGoogleProvider] = useState(true)

  useEffect(() => {
    getProviders().then(providers => {
      if (providers?.google) {
        setHasGoogleProvider(true)
      }
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create account')
        setLoading(false)
        return
      }

      // Auto sign in after signup
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        setError('Account created but sign in failed. Please sign in manually.')
        setTimeout(() => router.push('/auth/signin'), 2000)
      } else {
        // Redirect to onboarding
        router.push('/onboarding')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    try {
      await signIn('google', { callbackUrl: '/onboarding' })
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
          <h1 className="font-display text-3xl font-semibold text-charcoal dark:text-white mb-2">Create your account</h1>
          <p className="text-charcoal/50 dark:text-white/50">Join thousands of event organizers</p>
        </div>

        {/* Card */}
        <div className="card p-8 bg-white dark:bg-slate-900">
          {/* Google Sign Up */}
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
              label="Full Name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              autoComplete="name"
            />

            <FloatingInput
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              autoComplete="email"
            />

            <FloatingInput
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              hint="Must be at least 8 characters"
              autoComplete="new-password"
            />

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full h-12 rounded-full flex items-center justify-center gap-2 mt-6"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Get Started Free'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-charcoal/40 dark:text-white/40">
            By joining, you agree to our <Link href="/legal/terms" className="text-charcoal/60 dark:text-white/60 underline hover:text-charcoal dark:hover:text-white">Terms</Link> and <Link href="/legal/privacy" className="text-charcoal/60 dark:text-white/60 underline hover:text-charcoal dark:hover:text-white">Privacy Policy</Link>.
          </p>
        </div>

        <div className="mt-8 text-center pb-8">
          <p className="text-charcoal/50 dark:text-white/50 text-sm">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-charcoal dark:text-white font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
