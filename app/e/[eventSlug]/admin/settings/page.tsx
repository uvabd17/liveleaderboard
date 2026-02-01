'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { toast } from 'react-hot-toast'
import {
  Save,
  ArrowLeft,
  Shield,
  Zap,
  Globe,
  Users,
  Layers,
  Target,
  Timer,
  HelpCircle,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  Settings,
  Palette
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { extractColorsFromImage } from '@/lib/color-extraction'

// --- Types ---

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
  leaderboardMode?: string
  tieBreakerRule?: 'speed' | 'consistency' | 'max-points' | 'alphabetical'
}

type FeatureOption = {
  key: keyof EventFeatures
  label: string
  description: string
  icon: React.ReactNode
  mode?: 'locked-on' | 'auto' | 'toggle'
  helper?: string
}

const FEATURE_OPTIONS: FeatureOption[] = [
  {
    key: 'judgeEvaluations',
    label: 'Judge Evaluations',
    description: 'Enable judges to score participants using custom rubrics.',
    icon: <Shield className="w-5 h-5 text-emerald-400" />,
    mode: 'locked-on',
    helper: 'Required for competitive events.',
  },
  {
    key: 'liveScoring',
    label: 'Live Scoring Updates',
    description: 'Stream scores to the leaderboard in real-time.',
    icon: <Zap className="w-5 h-5 text-yellow-400" />,
    mode: 'locked-on',
    helper: 'Always enabled for best experience.',
  },
  {
    key: 'publicLeaderboard',
    label: 'Public Leaderboard',
    description: 'Allow anyone with the link to view the leaderboard.',
    icon: <Globe className="w-5 h-5 text-blue-400" />,
    mode: 'locked-on',
    helper: 'Control visibility via registration status.',
  },
  {
    key: 'teamRegistration',
    label: 'Team Registration',
    description: 'Allow teams to register alongside individuals.',
    icon: <Users className="w-5 h-5 text-indigo-400" />,
    mode: 'locked-on',
    helper: 'Flexible registration enabled.',
  },
  {
    key: 'multiRound',
    label: 'Multi-Round Judging',
    description: 'Automatically managed based on your round configuration.',
    icon: <Layers className="w-5 h-5 text-purple-400" />,
    mode: 'auto',
    helper: 'Active when rounds > 1.',
  },
  {
    key: 'elimination',
    label: 'Elimination Rounds',
    description: 'Drop lowest performers between rounds.',
    icon: <Target className="w-5 h-5 text-rose-400" />,
    mode: 'toggle',
    helper: 'Configure inside round settings.',
  },
  {
    key: 'timedRounds',
    label: 'Timed Rounds',
    description: 'Enforce time limits for rounds and judging.',
    icon: <Timer className="w-5 h-5 text-orange-400" />,
    mode: 'toggle',
  },
]

const PRESET_LOGOS = [
  { id: 'trophy', label: 'Trophy', value: '🏆' },
  { id: 'crown', label: 'Crown', value: '👑' },
  { id: 'star', label: 'Star', value: '⭐' },
  { id: 'target', label: 'Target', value: '🎯' },
  { id: 'rocket', label: 'Rocket', value: '🚀' },
  { id: 'flag', label: 'Flag', value: '🏁' },
  { id: 'bolt', label: 'Bolt', value: '⚡' },
  { id: 'fire', label: 'Fire', value: '🔥' },
]

// --- Components ---

const GlassCard = ({ children, className, id, title, icon }: { children: React.ReactNode, className?: string, id?: string, title?: string, icon?: React.ReactNode }) => (
  <div id={id} className={cn("group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition-all hover:border-white/20", className)}>
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none" />
    <div className="relative p-6">
      {title && (
        <div className="flex items-center gap-3 mb-6">
          {icon && <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-white shadow-inner">{icon}</div>}
          <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">{title}</h3>
        </div>
      )}
      {children}
    </div>
  </div>
)

const SectionNav = ({ active, id, label, icon, onClick }: { active: boolean, id: string, label: string, icon: React.ReactNode, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group",
      active
        ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-[0_0_20px_rgba(37,99,235,0.2)]"
        : "text-slate-400 hover:text-white hover:bg-white/5 hover:border hover:border-white/10"
    )}
  >
    <div className={cn("transition-colors", active ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300")}>
      {icon}
    </div>
    <span className="font-medium tracking-wide">{label}</span>
    {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_10px_currentColor]" />}
  </button>
)

const Toggle = ({ checked, onChange, disabled }: { checked: boolean, onChange: () => void, disabled?: boolean }) => (
  <button
    onClick={onChange}
    disabled={disabled}
    className={cn(
      "relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-slate-900",
      checked ? "bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]" : "bg-slate-700/50",
      disabled && "opacity-50 cursor-not-allowed grayscale"
    )}
  >
    <span
      className={cn(
        "inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-300",
        checked ? "translate-x-6" : "translate-x-1"
      )}
    />
  </button>
)

export default function EventSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const eventSlug = params.eventSlug as string

  // State
  const [activeSection, setActiveSection] = useState<string>('general')
  const [features, setFeatures] = useState<EventFeatures>({})
  const [rules, setRules] = useState<EventRules>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // Refs for scrolling
  const sectionRefs: Record<string, React.RefObject<HTMLDivElement>> = {
    general: useRef(null),
    features: useRef(null),
    branding: useRef(null),
    advanced: useRef(null),
  }

  // Load Data
  useEffect(() => {
    loadSettings()
  }, [eventSlug])

  // Scroll Spy
  useEffect(() => {
    const handleScroll = () => {
      const offsets = Object.entries(sectionRefs).map(([key, ref]) => ({
        key,
        offset: ref.current ? Math.abs(ref.current.getBoundingClientRect().top - 100) : Infinity
      }))
      const sorted = offsets.sort((a, b) => a.offset - b.offset)
      if (sorted.length > 0) setActiveSection(sorted[0].key)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  async function loadSettings() {
    setLoading(true)
    try {
      const res = await fetch(`/api/event/settings?eventSlug=${eventSlug}`)
      if (res.ok) {
        const data = await res.json()
        const roundsCount = Array.isArray(data.rules?.rounds) ? data.rules.rounds.length : 0
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
      }

      const eventRes = await fetch(`/api/events/${eventSlug}`)
      if (eventRes.ok) {
        const eventData = await eventRes.json()
        if (eventData.event?.logoUrl) setLogoPreview(eventData.event.logoUrl)
      }
    } catch {
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
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
        toast.custom((t) => (
          <div className="bg-emerald-900/90 border border-emerald-500/30 text-emerald-100 px-4 py-3 rounded-xl shadow-2xl backdrop-blur flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="font-medium">Settings saved successfully!</span>
          </div>
        ))
        setHasChanges(false)
      } else {
        throw new Error('Failed to save')
      }
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const scrollTo = (key: string) => {
    setActiveSection(key)
    sectionRefs[key]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // --- Handlers ---

  function handleFeatureToggle(key: string) {
    setFeatures(prev => {
      const next = { ...prev, [key]: !prev[key as keyof EventFeatures] }
      setHasChanges(true)
      return next
    })
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    try {
      const fd = new FormData()
      fd.append('logo', file)
      const res = await fetch(`/api/event/logo?eventSlug=${eventSlug}`, { method: 'POST', body: fd })
      if (res.ok) {
        const data = await res.json()
        setLogoPreview(data.url)
        setHasChanges(true)
        toast.success('Logo uploaded')

        // Dynamic Branding: Extract colors
        try {
          const colors = await extractColorsFromImage(data.url)
          setRules(prev => ({ ...prev, brandColors: colors }))
        } catch (e) {
          console.error('Color extraction failed', e)
        }
      }
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploadingLogo(false)
    }
  }

  // Handle preset logo selection (simulated as an upload or setting URL directly if API supports)
  // For now we will just use the emoji as a placeholder URL or handle it on backend? 
  // Since the current backend expects a URL, we will assume these are available as static assets or just data URIs in a real app.
  // To keep it simple and creating "high quality" feel, we'll assume we are setting a flag or a special URL.
  // Actually, let's just assume the user wants the emoji as the "logo" and the view handles it.
  // But strictly adhering to "logoUrl", let's use a dummy placebo for now or better:
  // We will generate a simple SVG data URI for these presets on the fly.
  const selectPreset = (emoji: string) => {
    // secure SVG data URI
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${emoji}</text></svg>`
    const dataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
    setLogoPreview(dataUrl)
    setHasChanges(true)

    // Dynamic Branding: Extract colors from preset
    try {
      extractColorsFromImage(dataUrl).then(colors => {
        setRules(prev => ({ ...prev, brandColors: colors }))
      })
    } catch (e) { }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#1A1A1A] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1A1A1A] dark:border-blue-500"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] dark:from-slate-900 dark:via-slate-950 dark:to-black text-[#1A1A1A] dark:text-slate-200 selection:bg-[#1A1A1A]/10 dark:selection:bg-blue-500/30">

      {/* Floating Save Bar */}
      <div className={cn(
        "fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-out",
        hasChanges ? "translate-y-0 opacity-100" : "translate-y-32 opacity-0"
      )}>
        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-2xl p-2 pl-6 pr-2 flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
              </span>
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            </div>
            <span className="text-sm font-medium text-slate-200">Unsaved changes</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => loadSettings()} // Reset
              className="text-slate-400 hover:text-white hover:bg-white/5 rounded-xl"
            >
              Reset
            </Button>
            <Button
              onClick={saveSettings}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] border border-blue-400/20"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 md:p-8 flex gap-12">
        {/* Sidebar */}
        <div className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-8 space-y-8">
            <div className="px-4">
              <Link
                href={`/e/${eventSlug}/admin`}
                className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-400 transition-colors group mb-6"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Settings</h1>
              <p className="text-slate-500 text-sm font-medium">Manage event configuration</p>
            </div>

            <nav className="space-y-2">
              <SectionNav
                id="general"
                label="General Basics"
                icon={<Settings className="w-5 h-5" />}
                active={activeSection === 'general'}
                onClick={() => scrollTo('general')}
              />
              <SectionNav
                id="features"
                label="Features & Rules"
                icon={<Zap className="w-5 h-5" />}
                active={activeSection === 'features'}
                onClick={() => scrollTo('features')}
              />
              <SectionNav
                id="branding"
                label="Visual Identity"
                icon={<Palette className="w-5 h-5" />}
                active={activeSection === 'branding'}
                onClick={() => scrollTo('branding')}
              />
              <SectionNav
                id="advanced"
                label="Advanced System"
                icon={<Layers className="w-5 h-5" />}
                active={activeSection === 'advanced'}
                onClick={() => scrollTo('advanced')}
              />
            </nav>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-semibold text-indigo-100 text-sm">Need Help?</h4>
                  <p className="text-xs text-indigo-300/80 leading-relaxed">
                    Check out our comprehensive guide for detailed explanations of all settings.
                  </p>
                  <a
                    href="/USER_GUIDE.md"
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    View Guide <ChevronRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-12 pb-32">

          {/* General Section */}
          <div ref={sectionRefs.general} className="space-y-6 pt-2">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-[#1A1A1A] dark:text-white mb-2">General Basics</h2>
                <p className="text-[#1A1A1A]/60 dark:text-slate-400">Core configuration for your event.</p>
              </div>
              <div className="px-4 py-2 rounded-full bg-[#1A1A1A]/5 dark:bg-slate-900/50 border border-[#1A1A1A]/10 dark:border-slate-800 text-[#1A1A1A]/60 dark:text-slate-400 font-mono text-sm">
                /e/{eventSlug}
              </div>
            </div>

            <GlassCard className="p-0">
              <div className="grid grid-cols-1 divide-y divide-[#1A1A1A]/5 dark:divide-white/5">
                <div className="p-6">
                  <label className="block text-sm font-medium text-[#1A1A1A]/70 dark:text-slate-300 mb-4">Event Status</label>
                  <div className="flex items-center justify-between bg-[#1A1A1A]/5 dark:bg-slate-950/30 p-4 rounded-xl border border-[#1A1A1A]/5 dark:border-white/5">
                    <div className="space-y-1">
                      <div className="font-medium text-[#1A1A1A] dark:text-white">Registration Status</div>
                      <div className="text-sm text-[#1A1A1A]/50 dark:text-slate-500">
                        {rules.registrationClosed ? 'Registration is currently closed.' : 'New participants can register.'}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("text-xs font-bold px-2 py-1 rounded uppercase tracking-wider", rules.registrationClosed ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500")}>
                        {rules.registrationClosed ? 'Closed' : 'Open'}
                      </span>
                      <Toggle
                        checked={!rules.registrationClosed}
                        onChange={() => {
                          setRules(prev => ({ ...prev, registrationClosed: !prev.registrationClosed }))
                          setHasChanges(true)
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Features Section */}
          <div ref={sectionRefs.features} className="space-y-6 pt-12 border-t border-white/5">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Features & Rules</h2>
              <p className="text-slate-400">Toggle and configure event capabilities.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {FEATURE_OPTIONS.map((f) => (
                <GlassCard key={f.key} className="hover:bg-[#1A1A1A]/5 dark:hover:bg-white/10 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-[#FAF9F6] dark:bg-slate-950 border border-[#1A1A1A]/10 dark:border-white/5 shadow-inner">
                      {f.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-white truncate">{f.label}</h3>
                        <Toggle
                          checked={!!features[f.key as keyof EventFeatures]}
                          disabled={f.mode === 'locked-on' || f.mode === 'auto'}
                          onChange={() => handleFeatureToggle(f.key)}
                        />
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed mb-2">{f.description}</p>
                      {f.mode === 'locked-on' && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/20">
                          <Shield className="w-3 h-3" /> Core Feature
                        </div>
                      )}
                      {f.mode === 'auto' && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-purple-500/10 text-purple-400 text-xs font-medium border border-purple-500/20">
                          <Zap className="w-3 h-3" /> Auto-Managed
                        </div>
                      )}
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>

            <GlassCard title="Leaderboard Rules" icon={<Target className="w-5 h-5" />}>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Tie-Breaking Protocol</label>
                  <p className="text-xs text-slate-500 mb-4">How should the engine resolve identical total scores?</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { id: 'alphabetical', label: 'Alphabetical', desc: 'Sort by name (default)' },
                      { id: 'speed', label: 'Speed / Time', desc: 'Fastest cumulative duration' },
                      { id: 'max-points', label: 'Max Points', desc: 'Who has more maximum score criteria' },
                      { id: 'consistency', label: 'Consistency', desc: 'Lowest variance between judge scores' },
                    ].map((rule) => (
                      <button
                        key={rule.id}
                        type="button"
                        onClick={() => {
                          setRules(p => ({ ...p, tieBreakerRule: rule.id as any }))
                          setHasChanges(true)
                        }}
                        className={cn(
                          "flex flex-col items-start p-4 rounded-xl border text-left transition-all",
                          rules.tieBreakerRule === rule.id
                            ? "bg-blue-600/10 border-blue-500 text-[#1A1A1A] dark:text-white"
                            : "bg-[#FAF9F6] dark:bg-slate-950/30 border-[#1A1A1A]/10 dark:border-white/5 text-[#1A1A1A]/60 dark:text-slate-400 hover:border-[#1A1A1A]/20 dark:hover:border-white/10"
                        )}
                      >
                        <span className="text-sm font-bold uppercase tracking-widest">{rule.label}</span>
                        <span className="text-[10px] opacity-60 mt-1">{rule.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>

            {features.timedRounds && (
              <GlassCard title="Timer Configuration" icon={<Timer className="w-5 h-5 font-bold" />}>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Show Public Timer</span>
                    <Toggle
                      checked={rules.timerSettings?.showPublicTimer || false}
                      onChange={() => {
                        setRules(p => ({ ...p, timerSettings: { ...p.timerSettings, showPublicTimer: !p.timerSettings?.showPublicTimer } }))
                        setHasChanges(true)
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <label className="text-slate-300">Warning Threshold (Minutes)</label>
                      <span className="text-slate-500">{rules.timerSettings?.warningThreshold || 5} min</span>
                    </div>
                    <input
                      type="range"
                      min="1" max="60" step="1"
                      value={rules.timerSettings?.warningThreshold || 5}
                      onChange={(e) => {
                        setRules(p => ({ ...p, timerSettings: { ...p.timerSettings, warningThreshold: Number(e.target.value) } }))
                        setHasChanges(true)
                      }}
                      className="w-full h-2 rounded-lg appearance-none bg-slate-800 accent-blue-500"
                    />
                  </div>
                </div>
              </GlassCard>
            )}
          </div>

          {/* Branding Section */}
          <div ref={sectionRefs.branding} className="space-y-6 pt-12 border-t border-white/5">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Visual Identity</h2>
              <p className="text-slate-400">Manage your event's visual presence and branding.</p>
            </div>

            <GlassCard>
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="relative group w-full md:w-64 aspect-video bg-[#FAF9F6] dark:bg-slate-950 rounded-xl border border-[#1A1A1A]/10 dark:border-white/10 overflow-hidden flex items-center justify-center">
                  {logoPreview ? (
                    <>
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-4" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button onClick={() => document.getElementById('logo-upload')?.click()} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors">
                          <ImageIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => { if (confirm('Remove logo?')) { setLogoPreview(null); setHasChanges(true); } }} className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-lg text-red-500 hover:text-red-200 transition-colors">
                          <AlertTriangle className="w-5 h-5" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div
                      onClick={() => document.getElementById('logo-upload')?.click()}
                      className="flex flex-col items-center gap-3 text-slate-500 cursor-pointer hover:text-slate-300 transition-colors"
                    >
                      <div className="p-3 rounded-full bg-slate-900 border border-slate-800">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-medium">Upload Logo</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-white">Event Logo</h4>
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-500/20">Override</span>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      This logo is specific to <strong>{eventSlug}</strong>. It overrides the default Organization branding.
                      <br />
                      <span className="opacity-60 text-xs">If removed, the Organization logo will be displayed.</span>
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quick Select</div>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_LOGOS.map(p => (
                        <button
                          key={p.id}
                          onClick={() => selectPreset(p.value)}
                          className="w-10 h-10 flex items-center justify-center text-xl bg-slate-900 border border-white/5 rounded-lg hover:bg-white/10 hover:border-white/20 transition-all hover:scale-105"
                          title={p.label}
                        >
                          {p.value}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button onClick={() => document.getElementById('logo-upload')?.click()} variant="outline" className="border-slate-700 bg-transparent text-slate-300 hover:text-white hover:bg-white/5">
                      Upload Custom File
                    </Button>
                    <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Advanced Section */}
          <div ref={sectionRefs.advanced} className="space-y-6 pt-12 border-t border-white/5">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Advanced System</h2>
              <p className="text-slate-400">Fine-tune scoring calculations and system performance.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Judging Mode */}
              <GlassCard title="Judging Visibility" icon={<Users className="w-5 h-5" />}>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setRules(p => ({ ...p, settings: { ...p.settings, judgingMode: 'aggregateVisible' } }))
                      setHasChanges(true)
                    }}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border transition-all",
                      rules.settings?.judgingMode !== 'blinded'
                        ? "bg-blue-600/10 border-blue-500/50 shadow-[0_0_20px_rgba(37,99,235,0.1)]"
                        : "bg-slate-900/50 border-white/5 hover:bg-slate-900"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn("font-semibold", rules.settings?.judgingMode !== 'blinded' ? "text-blue-400" : "text-slate-300")}>Open / Aggregate</span>
                      {rules.settings?.judgingMode !== 'blinded' && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                    </div>
                    <p className="text-xs text-slate-500">Judges can see total scores from all judges.</p>
                  </button>

                  <button
                    onClick={() => {
                      setRules(p => ({ ...p, settings: { ...p.settings, judgingMode: 'blinded' } }))
                      setHasChanges(true)
                    }}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border transition-all",
                      rules.settings?.judgingMode === 'blinded'
                        ? "bg-blue-600/10 border-blue-500/50 shadow-[0_0_20px_rgba(37,99,235,0.1)]"
                        : "bg-slate-900/50 border-white/5 hover:bg-slate-900"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn("font-semibold", rules.settings?.judgingMode === 'blinded' ? "text-blue-400" : "text-slate-300")}>Blinded</span>
                      {rules.settings?.judgingMode === 'blinded' && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                    </div>
                    <p className="text-xs text-slate-500">Judges score independently. No peer visibility.</p>
                  </button>
                </div>
              </GlassCard>

              <GlassCard title="Performance" icon={<Zap className="w-5 h-5" />}>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Real-time Update Rate</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        value={rules.settings?.sseUpdateInterval || 1000}
                        onChange={(e) => {
                          setRules(p => ({ ...p, settings: { ...p.settings, sseUpdateInterval: Number(e.target.value) } }))
                          setHasChanges(true)
                        }}
                        className="bg-[#FAF9F6] dark:bg-slate-950 border border-[#1A1A1A]/10 dark:border-white/10 rounded-lg px-4 py-2 w-32 text-center font-mono text-sm text-[#1A1A1A] dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                      <span className="text-slate-500 text-sm">ms</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Lower = faster updates, higher server load.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Ranking Mode</label>
                    <select
                      value={rules.leaderboardMode || 'score'}
                      onChange={(e) => {
                        setRules(p => ({ ...p, leaderboardMode: e.target.value }))
                        setHasChanges(true)
                      }}
                      className="w-full bg-[#FAF9F6] dark:bg-slate-950 border border-[#1A1A1A]/10 dark:border-white/10 rounded-lg px-4 py-2 text-sm text-[#1A1A1A] dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="score">Pure Score (Highest Wins)</option>
                      <option value="speed+score">Speed + Score (Fastest High Score)</option>
                    </select>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
