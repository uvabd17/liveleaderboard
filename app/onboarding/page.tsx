'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Logo } from '@/components/brand/logo'
import { FloatingInput } from '@/components/ui/floating-input'
import { Loader2, User, Building2, ArrowRight, Check } from 'lucide-react'

type AccountType = 'individual' | 'organization' | null

export default function OnboardingPage() {
  const router = useRouter()
  const { data: session, status, update } = useSession()
  const [step, setStep] = useState(1)
  const [accountType, setAccountType] = useState<AccountType>(null)
  const [organizationName, setOrganizationName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  // Show loading while session loads
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-cream dark:bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-charcoal dark:text-white" />
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  const userName = session.user.name || session.user.email?.split('@')[0] || 'User'

  const handleAccountTypeSelect = (type: AccountType) => {
    setAccountType(type)
    if (type === 'individual') {
      // Skip to completion for individuals
      setStep(3)
    } else {
      // Go to org name step
      setStep(2)
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountType,
          organizationName: accountType === 'individual' 
            ? `${userName}'s Events` 
            : organizationName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to complete onboarding')
        setLoading(false)
        return
      }

      // Update the session to reflect onboarding completion
      await update()
      
      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err) {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-lg relative z-10 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <Logo size={28} variant="icon" />
            <span className="font-display text-lg font-semibold text-charcoal dark:text-white">
              Live Leaderboard
            </span>
          </div>
          <h1 className="font-display text-3xl font-semibold text-charcoal dark:text-white mb-2">
            Welcome, {userName}!
          </h1>
          <p className="text-charcoal/50 dark:text-white/50">
            Let's get you set up in just a moment
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s < step
                  ? 'w-8 bg-charcoal dark:bg-white'
                  : s === step
                  ? 'w-8 bg-charcoal/50 dark:bg-white/50'
                  : 'w-4 bg-charcoal/20 dark:bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="card p-8 md:p-10 bg-white dark:bg-slate-900">
          {/* Step 1: Account Type Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-charcoal dark:text-white mb-2">
                  How will you use Live Leaderboard?
                </h2>
                <p className="text-sm text-charcoal/50 dark:text-white/50">
                  Choose the option that best describes you
                </p>
              </div>

              <div className="grid gap-4">
                {/* Individual Option */}
                <button
                  onClick={() => handleAccountTypeSelect('individual')}
                  className="group relative p-6 rounded-xl border-2 border-charcoal/10 dark:border-white/10 hover:border-charcoal dark:hover:border-white transition-all text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-charcoal/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-charcoal group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-colors">
                      <User className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-charcoal dark:text-white mb-1">
                        Individual
                      </h3>
                      <p className="text-sm text-charcoal/50 dark:text-white/50">
                        I'm organizing events on my own or for personal projects
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-charcoal/30 dark:text-white/30 group-hover:text-charcoal dark:group-hover:text-white transition-colors" />
                  </div>
                </button>

                {/* Organization Option */}
                <button
                  onClick={() => handleAccountTypeSelect('organization')}
                  className="group relative p-6 rounded-xl border-2 border-charcoal/10 dark:border-white/10 hover:border-charcoal dark:hover:border-white transition-all text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-charcoal/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-charcoal group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-colors">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-charcoal dark:text-white mb-1">
                        Organization
                      </h3>
                      <p className="text-sm text-charcoal/50 dark:text-white/50">
                        I represent a company, school, or organization
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-charcoal/30 dark:text-white/30 group-hover:text-charcoal dark:group-hover:text-white transition-colors" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Organization Name (only for organizations) */}
          {step === 2 && accountType === 'organization' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-charcoal dark:text-white mb-2">
                  What's your organization called?
                </h2>
                <p className="text-sm text-charcoal/50 dark:text-white/50">
                  This will be shown to participants and judges
                </p>
              </div>

              <FloatingInput
                label="Organization Name"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Enter organization name"
                required
              />

              {error && (
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 px-4 py-3 rounded-xl text-sm font-medium">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 h-12 rounded-full border border-charcoal/20 dark:border-white/20 text-charcoal dark:text-white hover:bg-charcoal/5 dark:hover:bg-white/5 transition-colors font-medium"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!organizationName.trim()}
                  className="flex-1 h-12 rounded-full bg-charcoal dark:bg-white text-white dark:text-black hover:bg-charcoal/90 dark:hover:bg-white/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-xl font-semibold text-charcoal dark:text-white mb-2">
                  You're all set!
                </h2>
                <p className="text-sm text-charcoal/50 dark:text-white/50">
                  {accountType === 'individual'
                    ? `Your events will appear under "${userName}'s Events"`
                    : `Your events will appear under "${organizationName}"`}
                </p>
              </div>

              {/* Summary */}
              <div className="p-4 rounded-xl bg-charcoal/5 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  {accountType === 'individual' ? (
                    <User className="w-5 h-5 text-charcoal/50 dark:text-white/50" />
                  ) : (
                    <Building2 className="w-5 h-5 text-charcoal/50 dark:text-white/50" />
                  )}
                  <div>
                    <p className="text-xs text-charcoal/50 dark:text-white/50">Account Type</p>
                    <p className="font-medium text-charcoal dark:text-white capitalize">
                      {accountType}
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 px-4 py-3 rounded-xl text-sm font-medium">
                  {error}
                </div>
              )}

              <button
                onClick={handleComplete}
                disabled={loading}
                className="w-full h-12 rounded-full bg-charcoal dark:bg-white text-white dark:text-black hover:bg-charcoal/90 dark:hover:bg-white/90 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Get Started
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                onClick={() => setStep(accountType === 'individual' ? 1 : 2)}
                className="w-full text-sm text-charcoal/50 dark:text-white/50 hover:text-charcoal dark:hover:text-white transition-colors"
              >
                Go back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
