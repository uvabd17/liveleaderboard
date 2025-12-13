'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import Card from '@/components/ui/card'
import toast from 'react-hot-toast'

type EventFeatures = {
  judgeEvaluations?: boolean
  liveScoring?: boolean
  publicLeaderboard?: boolean
  teamRegistration?: boolean
  multiRound?: boolean
  elimination?: boolean
  timedRounds?: boolean
}

type RoundConfig = {
  number: number
  name: string
  duration?: number
  eliminationCount?: number
  eliminationType?: 'bottom' | 'top' | 'custom'
}

type EventSettings = {
  judgingMode?: 'blinded' | 'aggregateVisible'
  sseUpdateInterval?: number
  enableNotifications?: boolean
  sessionTimeout?: number
  allowExport?: boolean
  exportFormats?: string[]
  autoSaveScores?: boolean
  requireJudgeComments?: boolean
}

type EventRules = {
  registrationClosed?: boolean
  rounds?: RoundConfig[]
  timerSettings?: {
    showPublicTimer?: boolean
    warningThreshold?: number
  }
  settings?: EventSettings
}

type FeatureOption = {
  key: keyof EventFeatures
  label: string
  description: string
  icon: string
  mode?: 'locked-on' | 'auto' | 'toggle'
  helper?: string
}

const FEATURE_OPTIONS: FeatureOption[] = [
  {
    key: 'judgeEvaluations',
    label: 'Judge Evaluations',
    description: 'Always on when rubrics exist; judges can score participants.',
    icon: '⚖️',
    mode: 'locked-on',
    helper: 'Enabled by default when an event has a rubric.',
  },
  {
    key: 'liveScoring',
    label: 'Live Scoring Updates',
    description: 'Leaderboard is live by default.',
    icon: '⚡',
    mode: 'locked-on',
    helper: 'Real-time SSE updates are always enabled.',
  },
  {
    key: 'publicLeaderboard',
    label: 'Public Leaderboard',
    description: 'Leaderboard can be viewed publicly.',
    icon: '🌐',
    mode: 'locked-on',
    helper: 'Public view is on by default; hide via “hide leaderboard until registration closed” if needed.',
  },
  {
    key: 'teamRegistration',
    label: 'Team Registration',
    description: 'Allow teams and individuals to register.',
    icon: '👥',
    mode: 'locked-on',
    helper: 'Both teams and individuals are allowed by default.',
  },
  {
    key: 'multiRound',
    label: 'Multi-Round Judging',
    description: 'Automatic when you define more than one round.',
    icon: '🔄',
    mode: 'auto',
    helper: 'Turns on when rounds > 1 in event creation.',
  },
  {
    key: 'elimination',
    label: 'Elimination Rounds',
    description: 'Eliminate lowest-performing teams between rounds.',
    icon: '🎯',
    mode: 'toggle',
    helper: 'Configure who gets eliminated each round in the rounds panel.',
  },
  {
    key: 'timedRounds',
    label: 'Timed Rounds',
    description: 'Set time limits per round and judging window.',
    icon: '⏱️',
    mode: 'toggle',
    helper: 'Round timers are set during event creation for each round.',
  },
]

export default function EventSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const eventSlug = params.eventSlug as string

  const [features, setFeatures] = useState<EventFeatures>({})
  const [rules, setRules] = useState<EventRules>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [expandedHelpSection, setExpandedHelpSection] = useState<string | null>(null)

  useEffect(() => {
    loadSettings()
  }, [eventSlug])

  async function loadSettings() {
    setLoading(true)
    try {
      const res = await fetch(`/api/event/settings?eventSlug=${eventSlug}`)
      if (res.ok) {
        const data = await res.json()
        const roundsCount = Array.isArray(data.rules?.rounds) ? data.rules.rounds.length : 0
        // Sensible defaults
        setFeatures({
          judgeEvaluations: true,
          liveScoring: true,
          publicLeaderboard: true,
          teamRegistration: true,
          multiRound: roundsCount > 1,
          elimination: data.features?.elimination ?? false,
          timedRounds: data.features?.timedRounds ?? false,
        })
        setRules(data.rules || {})
      } else {
        toast.error('Failed to load settings')
      }
      
      // Load event data for logo
      const eventRes = await fetch(`/api/events/${eventSlug}`)
      if (eventRes.ok) {
        const eventData = await eventRes.json()
        if (eventData.event?.logoUrl) {
          setLogoPreview(eventData.event.logoUrl)
        }
      }
    } catch (err) {
      toast.error('Error loading settings')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be smaller than 2MB')
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    setUploadingLogo(true)
    try {
      // Convert to data URL
      const reader = new FileReader()
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string
        setLogoPreview(dataUrl)

        // Upload to server
        const res = await fetch('/api/event/logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventSlug, logoData: dataUrl, extractColors: true })
        })

        if (res.ok) {
          toast.success('✅ Logo uploaded successfully!')
        } else {
          toast.error('Failed to upload logo')
          setLogoPreview(null)
        }
      }
      reader.readAsDataURL(file)
    } catch (err) {
      toast.error('Error uploading logo')
      setLogoPreview(null)
    } finally {
      setUploadingLogo(false)
    }
  }

  async function removeLogo() {
    if (!confirm('Remove event logo?')) return

    try {
      const res = await fetch(`/api/event/logo?eventSlug=${eventSlug}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setLogoPreview(null)
        toast.success('Logo removed')
      } else {
        toast.error('Failed to remove logo')
      }
    } catch (err) {
      toast.error('Error removing logo')
    }
  }

  async function saveSettings() {
    setSaving(true)
    try {
      const res = await fetch('/api/event/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventSlug, features, rules }),
      })

      if (res.ok) {
        toast.success('✅ Settings saved!')
        setHasChanges(false)
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to save')
      }
    } catch (err) {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  function toggleFeature(key: string) {
    const option = FEATURE_OPTIONS.find(o => o.key === key)
    if (option?.mode === 'locked-on' || option?.mode === 'auto') {
      return
    }
    setFeatures(prev => ({ ...prev, [key]: !prev[key as keyof EventFeatures] }))
    setHasChanges(true)
  }

  function updateRounds(rounds: RoundConfig[]) {
    setRules(prev => ({ ...prev, rounds }))
    setHasChanges(true)
  }

  function addRound() {
    const currentRounds = rules.rounds || []
    updateRounds([
      ...currentRounds,
      {
        number: currentRounds.length + 1,
        name: `Round ${currentRounds.length + 1}`,
        duration: 60,
        eliminationCount: 0,
        eliminationType: 'bottom',
      },
    ])
  }

  function updateRound(index: number, updates: Partial<RoundConfig>) {
    const rounds = [...(rules.rounds || [])] as RoundConfig[]
    rounds[index] = { ...rounds[index], ...updates }
    updateRounds(rounds)
  }

  function removeRound(index: number) {
    if (!confirm('Remove this round?')) return
    const rounds = (rules.rounds || []).filter((_, i) => i !== index)
    // Renumber
    rounds.forEach((r, i) => {
      r.number = i + 1
      if (!r.name.includes('Custom')) r.name = `Round ${i + 1}`
    })
    updateRounds(rounds)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/e/${eventSlug}/admin`)}
            className="text-slate-400 hover:text-white mb-4 flex items-center gap-2"
          >
            ← Back to Admin
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">Event Settings</h1>
          <p className="text-slate-400">
            Event: <span className="font-mono text-blue-400">{eventSlug}</span>
          </p>
        </div>

        {/* Help & Guide Section */}
        <Card className="mb-6 border-2 border-purple-500/50 bg-purple-500/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="text-2xl">❓</div>
              <div>
                <h2 className="text-xl font-bold text-white">Help & Guide</h2>
                <p className="text-sm text-slate-400">Get help understanding settings and features</p>
              </div>
            </div>
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              {showHelp ? '✕ Close' : '📖 Show Help'}
            </button>
          </div>

          {showHelp && (
            <div className="mt-4 space-y-3">
              {/* What are Event Features */}
              <div className="border border-slate-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedHelpSection(expandedHelpSection === 'features' ? null : 'features')}
                  className="w-full px-4 py-3 bg-slate-800/50 hover:bg-slate-800 text-left flex items-center justify-between transition-colors"
                >
                  <span className="font-semibold text-white">🎯 What are Event Features?</span>
                  <span className="text-slate-400">{expandedHelpSection === 'features' ? '▼' : '▶'}</span>
                </button>
                {expandedHelpSection === 'features' && (
                  <div className="p-4 bg-slate-900/30 text-sm text-slate-300 space-y-2">
                    <p><strong className="text-blue-400">Judge Evaluations:</strong> Enable judges to score participants using custom rubrics. Required for competitive events.</p>
                    <p><strong className="text-blue-400">Live Scoring Updates:</strong> Always on; the leaderboard streams scores in real time.</p>
                    <p><strong className="text-blue-400">Public Leaderboard:</strong> Public by default. Hide only if you explicitly turn off visibility elsewhere.</p>
                    <p><strong className="text-blue-400">Team Registration:</strong> Both teams and individuals can register by default.</p>
                    <p><strong className="text-blue-400">Multi-Round Judging:</strong> Auto-enabled when your event has more than one round.</p>
                    <p><strong className="text-blue-400">Elimination Rounds:</strong> Drop the lowest performers between rounds based on scores you configure.</p>
                    <p><strong className="text-blue-400">Timed Rounds:</strong> Configure round timers and judging windows in the rounds setup during event creation.</p>
                  </div>
                )}
              </div>

              {/* Understanding Judging Modes */}
              <div className="border border-slate-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedHelpSection(expandedHelpSection === 'judging' ? null : 'judging')}
                  className="w-full px-4 py-3 bg-slate-800/50 hover:bg-slate-800 text-left flex items-center justify-between transition-colors"
                >
                  <span className="font-semibold text-white">⚖️ Understanding Judging Modes</span>
                  <span className="text-slate-400">{expandedHelpSection === 'judging' ? '▼' : '▶'}</span>
                </button>
                {expandedHelpSection === 'judging' && (
                  <div className="p-4 bg-slate-900/30 text-sm text-slate-300 space-y-3">
                    <div>
                      <strong className="text-green-400">📊 Aggregate Visible (Default):</strong>
                      <p className="mt-1">Judges can see cumulative scores from all judges. Useful when you want transparency and collaborative judging. May introduce bias as judges see others' scores.</p>
                    </div>
                    <div>
                      <strong className="text-blue-400">🔒 Blinded:</strong>
                      <p className="mt-1">Judges score independently without seeing others' evaluations. Reduces bias and ensures fair, impartial judging. Best for professional competitions.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* How to Use Rounds & Timers */}
              <div className="border border-slate-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedHelpSection(expandedHelpSection === 'rounds' ? null : 'rounds')}
                  className="w-full px-4 py-3 bg-slate-800/50 hover:bg-slate-800 text-left flex items-center justify-between transition-colors"
                >
                  <span className="font-semibold text-white">🔄 How to Use Rounds & Timers</span>
                  <span className="text-slate-400">{expandedHelpSection === 'rounds' ? '▼' : '▶'}</span>
                </button>
                {expandedHelpSection === 'rounds' && (
                  <div className="p-4 bg-slate-900/30 text-sm text-slate-300 space-y-3">
                    <p><strong className="text-purple-400">Example: Hackathon Workflow</strong></p>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                      <li><strong>Round 1 - Initial Pitch:</strong> 5 min presentations, judges score on presentation & feasibility only.</li>
                      <li><strong>Round 2 - Demo:</strong> 10 min live demos, judges score on innovation, technical excellence, and impact.</li>
                      <li><strong>Round 3 - Q&A Finals:</strong> Top 5 teams only (elimination), comprehensive evaluation on all criteria.</li>
                    </ol>
                    <p className="mt-3"><strong>⏱️ Timers:</strong></p>
                    <ul className="list-disc list-inside ml-2 space-y-1">
                      <li><strong>Round Timer:</strong> Total duration for the round activities (e.g., 2 hours for hacking).</li>
                      <li><strong>Judging Window:</strong> Separate timer for when judges can submit scores (e.g., 30 min after round ends).</li>
                    </ul>
                    <p className="mt-3 text-yellow-400">💡 Tip: Control rounds from the Admin Dashboard → Round Control Center</p>
                  </div>
                )}
              </div>

              {/* Registration Best Practices */}
              <div className="border border-slate-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedHelpSection(expandedHelpSection === 'registration' ? null : 'registration')}
                  className="w-full px-4 py-3 bg-slate-800/50 hover:bg-slate-800 text-left flex items-center justify-between transition-colors"
                >
                  <span className="font-semibold text-white">📝 Registration Best Practices</span>
                  <span className="text-slate-400">{expandedHelpSection === 'registration' ? '▼' : '▶'}</span>
                </button>
                {expandedHelpSection === 'registration' && (
                  <div className="p-4 bg-slate-900/30 text-sm text-slate-300 space-y-2">
                    <p><strong className="text-green-400">✅ When to Keep Open:</strong></p>
                    <ul className="list-disc list-inside ml-2 mb-3">
                      <li>Before event starts and during check-in</li>
                      <li>If accepting late arrivals</li>
                      <li>During warm-up/networking phase</li>
                    </ul>
                    <p><strong className="text-red-400">🔒 When to Close:</strong></p>
                    <ul className="list-disc list-inside ml-2 mb-3">
                      <li>Before judging begins (prevents score calculation issues)</li>
                      <li>When venue capacity reached</li>
                      <li>After event officially starts</li>
                    </ul>
                    <p className="text-yellow-400">⚠️ Important: Always close registrations before opening judging to ensure accurate scoring!</p>
                  </div>
                )}
              </div>

              {/* Full Documentation Link */}
              <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">📚</div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-400 mb-1">Need More Help?</h4>
                    <p className="text-xs text-slate-300 mb-2">
                      Check out the comprehensive user guide for detailed documentation, tutorials, and troubleshooting.
                    </p>
                    <a 
                      href={`${window.location.origin}/USER_GUIDE.md`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                    >
                      📖 View Full User Guide →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

          {/* Leaderboard Mode */}
          <Card className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">Leaderboard Ranking Mode</h3>
            <div className="flex items-center gap-4">
              <select
                value={(rules as any)?.leaderboardMode || 'score'}
                onChange={e => {
                  const mode = e.target.value
                  setRules(prev => ({ ...prev, leaderboardMode: mode }))
                  setHasChanges(true)
                }}
                className="px-4 py-2 bg-slate-800 border border-slate-600 rounded text-white"
              >
                <option value="score">Score Only (default)</option>
                <option value="speed+score">Speed + Score (tie-breaker: total time)</option>
              </select>
              <div className="text-sm text-slate-400">Choose how the leaderboard ranks participants.</div>
            </div>
          </Card>

        {/* Unsaved Changes Warning */}
        {hasChanges && (
          <Card className="mb-6 border-2 border-yellow-500/50 bg-yellow-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl">⚠️</div>
                <div>
                  <h3 className="font-semibold text-yellow-400">Unsaved Changes</h3>
                  <p className="text-sm text-yellow-300/80">Remember to save your changes!</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={loadSettings}>
                  Reset
                </Button>
                <Button onClick={saveSettings} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Now'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Event Branding */}
        <Card className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">🎨 Event Branding</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Event Logo
              </label>
              {logoPreview ? (
                <div className="flex items-start gap-4">
                  <div className="relative w-32 h-32 bg-slate-800 rounded-lg overflow-hidden border-2 border-slate-600">
                    <img 
                      src={logoPreview} 
                      alt="Event logo" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => document.getElementById('logo-upload')?.click()}
                      disabled={uploadingLogo}
                    >
                      📸 Change Logo
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={removeLogo}
                      className="text-red-400 hover:text-red-300"
                    >
                      🗑️ Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => document.getElementById('logo-upload')?.click()}
                  className="w-full h-32 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-slate-500 hover:bg-slate-800/30 transition-all"
                >
                  {uploadingLogo ? (
                    <div className="text-slate-400">Uploading...</div>
                  ) : (
                    <>
                      <div className="text-4xl mb-2">📸</div>
                      <div className="text-slate-400 text-sm">Click to upload logo</div>
                      <div className="text-slate-500 text-xs mt-1">PNG, JPG up to 2MB</div>
                    </>
                  )}
                </div>
              )}
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <p className="text-xs text-slate-500 mt-2">
                💡 Tip: Your logo will be displayed on the leaderboard and can be used to extract brand colors
              </p>
            </div>
          </div>
        </Card>

        {/* Features Note */}
        <Card className="mb-6">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">ℹ️</div>
              <div>
                <h3 className="font-semibold text-blue-400 mb-1">Feature Configuration</h3>
                <p className="text-sm text-slate-300">
                  Most features are configured during event creation. Use this page to adjust advanced settings only.
                  To change basic features, you may need to edit the event or create a new one.
                </p>
              </div>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-4">🎯 Advanced Features</h2>
          <div className="space-y-3">
            {FEATURE_OPTIONS.map(option => (
              <div
                key={option.key}
                className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="text-2xl">{option.icon}</div>
                  <div>
                    <h3 className="font-semibold text-white">{option.label}</h3>
                    <p className="text-sm text-slate-400">{option.description}</p>
                    {option.helper && (
                      <p className="text-xs text-slate-500 mt-1">{option.helper}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {option.mode === 'locked-on' && (
                    <span className="text-xs px-2 py-1 rounded bg-blue-600/20 text-blue-200 border border-blue-500/40">
                      Always on
                    </span>
                  )}
                  {option.mode === 'auto' && (
                    <span className="text-xs px-2 py-1 rounded bg-purple-600/20 text-purple-200 border border-purple-500/40">
                      Auto
                    </span>
                  )}
                  <button
                    onClick={() => toggleFeature(option.key)}
                    disabled={option.mode === 'locked-on' || option.mode === 'auto'}
                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                      features[option.key as keyof EventFeatures] ? 'bg-blue-600' : 'bg-slate-600'
                    } ${option.mode === 'locked-on' || option.mode === 'auto' ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        features[option.key as keyof EventFeatures] ? 'translate-x-8' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Multi-Round Configuration - Moved to Admin Dashboard */}
        {features.multiRound && (
          <Card className="mb-6 border-2 border-blue-500/50 bg-blue-500/10">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🎯</div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-1">Round Configuration</h2>
                <p className="text-sm text-slate-300">
                  Multi-round judging turns on automatically when you add more than one round. Set timers and elimination rules in the rounds panel during creation or editing.
                </p>
              </div>
            </div>
            <div className="mt-4">
              <Link
                href={`/e/${eventSlug}/admin/rounds`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                🔄 Configure Rounds
              </Link>
            </div>
          </Card>
        )}

        {/* Timer Settings */}
        {features.timedRounds && (
          <Card className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">⏱️ Timer Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="showPublicTimer"
                  checked={rules.timerSettings?.showPublicTimer || false}
                  onChange={e =>
                    setRules(prev => ({
                      ...prev,
                      timerSettings: {
                        ...prev.timerSettings,
                        showPublicTimer: e.target.checked,
                      },
                    }))
                  }
                  className="w-4 h-4"
                />
                <label htmlFor="showPublicTimer" className="text-slate-300">
                  Show timer on public leaderboard
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Warning Threshold (minutes before end)
                </label>
                <input
                  type="number"
                  min="0"
                  value={rules.timerSettings?.warningThreshold || 5}
                  onChange={e =>
                    setRules(prev => ({
                      ...prev,
                      timerSettings: {
                        ...prev.timerSettings,
                        warningThreshold: Number(e.target.value),
                      },
                    }))
                  }
                  className="w-32 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Timer will turn yellow/red as deadline approaches
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Advanced Settings */}
        <Card className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">⚙️ Advanced Settings</h2>
          
          <div className="space-y-6">
            {/* Judging Mode */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Judging Mode
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setRules(prev => ({ ...prev, settings: { ...prev.settings, judgingMode: 'aggregateVisible' } }))
                    setHasChanges(true)
                  }}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                    (rules.settings?.judgingMode || 'aggregateVisible') === 'aggregateVisible'
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <div className="font-semibold mb-1">📊 Aggregate Visible</div>
                  <div className="text-xs opacity-80">Judges can see total scores</div>
                </button>
                <button
                  onClick={() => {
                    setRules(prev => ({ ...prev, settings: { ...prev.settings, judgingMode: 'blinded' } }))
                    setHasChanges(true)
                  }}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                    rules.settings?.judgingMode === 'blinded'
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <div className="font-semibold mb-1">🔒 Blinded</div>
                  <div className="text-xs opacity-80">Judges score independently</div>
                </button>
              </div>
            </div>

            {/* SSE Update Interval */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Real-time Update Interval (milliseconds)
              </label>
              <input
                type="number"
                min="500"
                max="10000"
                step="100"
                value={rules.settings?.sseUpdateInterval || 1000}
                onChange={e => {
                  setRules(prev => ({ 
                    ...prev, 
                    settings: { ...prev.settings, sseUpdateInterval: Number(e.target.value) } 
                  }))
                  setHasChanges(true)
                }}
                className="w-40 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
              />
              <p className="text-xs text-slate-500 mt-1">
                Lower values = faster updates but higher server load (recommended: 1000ms)
              </p>
            </div>

            {/* Session Timeout */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Judge Session Timeout (minutes)
              </label>
              <input
                type="number"
                min="5"
                max="480"
                step="5"
                value={rules.settings?.sessionTimeout || 60}
                onChange={e => {
                  setRules(prev => ({ 
                    ...prev, 
                    settings: { ...prev.settings, sessionTimeout: Number(e.target.value) } 
                  }))
                  setHasChanges(true)
                }}
                className="w-40 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
              />
              <p className="text-xs text-slate-500 mt-1">
                Inactive judges will be logged out after this duration
              </p>
            </div>

            {/* Export Settings */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Data Export
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="allowExport"
                    checked={rules.settings?.allowExport || false}
                    onChange={e => {
                      setRules(prev => ({ 
                        ...prev, 
                        settings: { ...prev.settings, allowExport: e.target.checked } 
                      }))
                      setHasChanges(true)
                    }}
                    className="w-4 h-4"
                  />
                  <label htmlFor="allowExport" className="text-slate-300">
                    Enable data export functionality
                  </label>
                </div>
                {rules.settings?.allowExport && (
                  <div className="ml-7 flex gap-3">
                    {['CSV', 'JSON', 'PDF'].map(format => (
                      <label key={format} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={rules.settings?.exportFormats?.includes(format) || false}
                          onChange={e => {
                            const current = rules.settings?.exportFormats || []
                            const updated = e.target.checked
                              ? [...current, format]
                              : current.filter(f => f !== format)
                            setRules(prev => ({ 
                              ...prev, 
                              settings: { ...prev.settings, exportFormats: updated } 
                            }))
                            setHasChanges(true)
                          }}
                          className="w-3 h-3"
                        />
                        <span className="text-slate-400">{format}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Scoring Preferences */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autoSaveScores"
                  checked={rules.settings?.autoSaveScores !== false}
                  onChange={e => {
                    setRules(prev => ({ 
                      ...prev, 
                      settings: { ...prev.settings, autoSaveScores: e.target.checked } 
                    }))
                    setHasChanges(true)
                  }}
                  className="w-4 h-4"
                />
                <label htmlFor="autoSaveScores" className="text-slate-300">
                  Auto-save scores as judges enter them (recommended)
                </label>
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="requireComments"
                  checked={rules.settings?.requireJudgeComments || false}
                  onChange={e => {
                    setRules(prev => ({ 
                      ...prev, 
                      settings: { ...prev.settings, requireJudgeComments: e.target.checked } 
                    }))
                    setHasChanges(true)
                  }}
                  className="w-4 h-4"
                />
                <label htmlFor="requireComments" className="text-slate-300">
                  Require judges to leave feedback comments
                </label>
              </div>
            </div>

            {/* Notifications */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="enableNotifications"
                checked={rules.settings?.enableNotifications || false}
                onChange={e => {
                  setRules(prev => ({ 
                    ...prev, 
                    settings: { ...prev.settings, enableNotifications: e.target.checked } 
                  }))
                  setHasChanges(true)
                }}
                className="w-4 h-4"
              />
              <label htmlFor="enableNotifications" className="text-slate-300">
                <span className="font-semibold">Enable browser notifications</span>
                <p className="text-sm text-slate-400">Get alerts for score submissions and round changes</p>
              </label>
            </div>
          </div>
        </Card>

        {/* Registration Control */}
        <Card className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">📝 Registration Control</h2>
          
          {/* Registration Status Indicator */}
          <div className={`mb-6 p-6 rounded-lg border-2 transition-all ${
            rules.registrationClosed 
              ? 'border-red-500 bg-red-500/10' 
              : 'border-green-500 bg-green-500/10'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`text-4xl ${rules.registrationClosed ? 'animate-pulse' : ''}`}>
                  {rules.registrationClosed ? '🔒' : '✅'}
                </div>
                <div>
                  <h3 className={`text-xl font-bold mb-1 ${
                    rules.registrationClosed ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {rules.registrationClosed ? 'Registrations Closed' : 'Registrations Open'}
                  </h3>
                  <p className="text-slate-300">
                    {rules.registrationClosed 
                      ? 'New participants cannot register for this event' 
                      : 'Participants can register using the registration link or QR code'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => {
                  setRules(prev => ({ ...prev, registrationClosed: !prev.registrationClosed }))
                  setHasChanges(true)
                }}
                className={`px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 ${
                  rules.registrationClosed
                    ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/50'
                    : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/50'
                }`}
              >
                {rules.registrationClosed ? '🔓 Open Registrations' : '🔒 Close Registrations'}
              </button>
            </div>
          </div>

          {/* Registration Details */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <div className="text-sm font-medium text-slate-400 mb-1">Registration Link</div>
              <div className="flex items-center gap-2">
                <code className="text-xs text-blue-400 bg-slate-900 px-2 py-1 rounded flex-1 truncate">
                  {typeof window !== 'undefined' ? `${window.location.origin}/e/${eventSlug}/register` : '...'}
                </code>
                <button
                  onClick={() => {
                    const link = `${window.location.origin}/e/${eventSlug}/register`
                    navigator.clipboard.writeText(link)
                    toast.success('Link copied!')
                  }}
                  className="text-slate-400 hover:text-white transition-colors"
                  title="Copy link"
                >
                  📋
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <div className="text-sm font-medium text-slate-400 mb-1">Quick Actions</div>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/e/${eventSlug}/register`)}
                  className="flex-1 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded transition-colors text-sm"
                >
                  👀 Preview
                </button>
                <button
                  onClick={() => router.push(`/e/${eventSlug}/admin`)}
                  className="flex-1 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded transition-colors text-sm"
                >
                  📊 View QR
                </button>
              </div>
            </div>
          </div>

          {/* Best Practices */}
          {!rules.registrationClosed && (
            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex gap-3">
                <div className="text-xl">💡</div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-blue-400 mb-1">Best Practice</h4>
                  <p className="text-xs text-slate-300">
                    Close registrations before starting the judging phase to prevent score calculation 
                    issues. You can always reopen them later if needed.
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Save Actions */}
        <Card className="bg-slate-800/50 sticky bottom-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-slate-400">
              {hasChanges ? '⚠️ You have unsaved changes' : '✓ All changes saved'}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={loadSettings} disabled={!hasChanges}>
                Reset Changes
              </Button>
              <Button onClick={saveSettings} disabled={saving || !hasChanges}>
                {saving ? 'Saving...' : '💾 Save Settings'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
