'use client'
import React from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token')

  const [name, setName] = React.useState('')
  const [kind, setKind] = React.useState<'team' | 'individual'>('team')
  const [loading, setLoading] = React.useState(false)
  const [successData, setSuccessData] = React.useState<{ accessCode?: string, name: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return toast.error('Missing token')
    if (name.trim().length < 2) return toast.error('Enter a valid name')
    setLoading(true)
    try {
      const res = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, name, kind }) })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error || 'Registration failed')
        setLoading(false)
        return
      }
      toast.success('Registered!')
      setSuccessData(data.participant)
    } catch (e) {
      console.error(e)
      toast.error('Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#1A1A1A] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center relative">
      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#1A1A1A]/5 dark:bg-purple-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#1A1A1A]/5 dark:bg-blue-500/10 rounded-full blur-[120px]" />
      </div>



      <div className="card max-w-md w-full p-8 relative z-10 animate-fade-in-up border border-[#1A1A1A]/10 dark:border-white/10">
        {successData ? (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
              <span className="text-2xl">🎉</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1A1A1A] dark:text-white mb-2">Registration Complete!</h1>
              <p className="text-[#1A1A1A]/70 dark:text-slate-300 text-sm">
                You have successfully registered as <span className="text-[#1A1A1A] dark:text-white font-bold">{successData.name}</span>.
              </p>
            </div>

            {successData.accessCode && (
              <div className="bg-[#1A1A1A]/5 dark:bg-white/5 border border-[#1A1A1A]/10 dark:border-white/10 rounded-xl p-6 space-y-2">
                <div className="text-xs font-mono uppercase tracking-widest text-[#1A1A1A]/50 dark:text-slate-500">Your Participant Access Code</div>
                <div className="text-4xl font-black font-mono text-blue-600 dark:text-blue-400 tracking-wider select-all cursor-pointer" onClick={() => {
                  navigator.clipboard.writeText(successData.accessCode || '')
                  toast.success('Copied to clipboard')
                }}>
                  {successData.accessCode}
                </div>
                <div className="text-[10px] text-[#1A1A1A]/50 dark:text-slate-500">Save this code! You will need it to submit files.</div>
              </div>
            )}

            <div className="pt-4 grid gap-3">
              <a
                href={window.location.pathname.replace('/register', '/portal')}
                className="block w-full py-3 bg-[#1A1A1A] dark:bg-blue-600 hover:bg-[#1A1A1A]/80 dark:hover:bg-blue-500 rounded-lg text-white font-bold text-sm uppercase tracking-widest transition-colors"
              >
                Go to Participant Portal
              </a>
              <button
                onClick={() => router.push(window.location.pathname.replace('/register', ''))}
                className="block w-full py-3 bg-[#1A1A1A]/5 dark:bg-white/5 hover:bg-[#1A1A1A]/10 dark:hover:bg-white/10 border border-[#1A1A1A]/5 dark:border-white/5 rounded-lg text-[#1A1A1A]/60 dark:text-slate-400 font-bold text-sm hover:text-[#1A1A1A] dark:hover:text-white transition-colors"
              >
                Return to Standings
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-[#1A1A1A] dark:text-white mb-2">Participant Registration</h1>
              <p className="text-[#1A1A1A]/70 dark:text-slate-300 text-sm">
                Enter your details to register for this event.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A]/70 dark:text-slate-300 mb-2">Participant Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Team Rocket"
                  className="input w-full"
                  required
                />
                <p className="text-xs text-[#1A1A1A]/50 dark:text-slate-400 mt-2">Must be at least 2 characters and unique</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A]/70 dark:text-slate-300 mb-2">Registration Type</label>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as any)}
                  className="input w-full appearance-none"
                >
                  <option value="team" className="bg-[#FAF9F6] dark:bg-slate-800 text-[#1A1A1A] dark:text-white">Team</option>
                  <option value="individual" className="bg-[#FAF9F6] dark:bg-slate-800 text-[#1A1A1A] dark:text-white">Individual</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full btn-primary py-3 rounded-lg font-bold text-lg shadow-lg hover:shadow-[#1A1A1A]/20 dark:hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Registering...' : 'Register Now'}
              </button>

              {!token && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-200 text-sm text-center">
                  Invalid or missing registration token.
                </div>
              )}
            </form>
          </>
        )}
      </div>
    </div >
  )
}
