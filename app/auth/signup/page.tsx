'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Trophy } from 'lucide-react'

export default function SignUpPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    organizationName: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
        router.push('/dashboard')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-lg relative z-10 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Trophy className="w-6 h-6 text-charcoal" />
            <span className="font-display text-lg font-semibold text-charcoal">Live Leaderboard</span>
          </Link>
          <h1 className="font-display text-3xl font-semibold text-charcoal mb-2">Create your account</h1>
          <p className="text-charcoal/50">Join thousands of event organizers</p>
        </div>

        {/* Card */}
        <div className="card p-8 md:p-10">
          {/* Promo Badge */}
          <div className="mb-6 flex justify-center">
            <span className="badge-minimal">
              Start your free trial today
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">Organization</label>
                <input
                  id="organizationName"
                  type="text"
                  value={formData.organizationName}
                  onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                  required
                  className="input w-full"
                  placeholder="Acme Inc"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">Full Name</label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input w-full"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">Email address</label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="input w-full"
                placeholder="name@company.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">Password</label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={8}
                className="input w-full"
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
              />
              <p className="text-xs text-charcoal/40 mt-2">Must be at least 8 characters</p>
            </div>

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

          <p className="mt-6 text-center text-xs text-charcoal/40">
            By joining, you agree to our <Link href="/legal/terms" className="text-charcoal/60 underline hover:text-charcoal">Terms</Link> and <Link href="/legal/privacy" className="text-charcoal/60 underline hover:text-charcoal">Privacy Policy</Link>.
          </p>
        </div>

        <div className="mt-8 text-center pb-8">
          <p className="text-charcoal/50 text-sm">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-charcoal font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
