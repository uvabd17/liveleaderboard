'use client'

import { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'
import { EventFeatures, defaultFeatures, featureMetadata, getFeatureValue, setFeatureValue } from '@/lib/features'
import { extractColorsFromImage } from '@/lib/color-extraction'

interface EventWizardProps {
  onClose: () => void
  onSuccess: () => void
}

type WizardStep = 1 | 2 | 3 | 4

const FEATURE_PRESETS: Record<string, Partial<EventFeatures>> = {
  academic: {
    presentation: {
      teamAvatars: true,
      stageDisplay: true,
      customThemes: false,
      podiumWinners: { enabled: true, topN: 3 },
    },
    competitive: {
      publicVoting: { enabled: false, weight: 20 },
      liveReactions: false,
      badgesAchievements: true,
      momentumIndicators: true,
    },
    judgeExperience: {
      judgeComments: true,
      bulkScoring: false,
      scoreHistory: true,
    },
    leaderboardVisibility: {
      scoreBreakdown: { enabled: true, detail: 'per-criterion' },
      activityFeed: false,
      historicalComparison: true,
    },
    operations: {
      scheduledActions: false,
      i18n: { enabled: false, languages: ['en'] },
      embedSupport: true,
      teamMessaging: false,
      predictiveRankings: false,
      printViews: true,
      participantProfiles: false,
      exportOnDemand: false,
      hideLeaderboardUntilRegistrationClosed: false,
    },
  },
  hackathon: {
    presentation: {
      teamAvatars: true,
      stageDisplay: true,
      customThemes: true,
      podiumWinners: { enabled: true, topN: 5 },
    },
    competitive: {
      publicVoting: { enabled: true, weight: 15 },
      liveReactions: true,
      badgesAchievements: true,
      momentumIndicators: true,
    },
    judgeExperience: {
      judgeComments: true,
      bulkScoring: true,
      scoreHistory: true,
    },
    leaderboardVisibility: {
      scoreBreakdown: { enabled: true, detail: 'total' },
      activityFeed: true,
      historicalComparison: false,
    },
    operations: {
      scheduledActions: true,
      i18n: { enabled: false, languages: ['en'] },
      embedSupport: true,
      teamMessaging: true,
      predictiveRankings: false,
      printViews: false,
      participantProfiles: true,
      exportOnDemand: true,
      hideLeaderboardUntilRegistrationClosed: false,
    },
  },
  public: {
    presentation: {
      teamAvatars: false,
      stageDisplay: true,
      customThemes: false,
      podiumWinners: { enabled: true, topN: 3 },
    },
    competitive: {
      publicVoting: { enabled: true, weight: 30 },
      liveReactions: true,
      badgesAchievements: false,
      momentumIndicators: true,
    },
    judgeExperience: {
      judgeComments: false,
      bulkScoring: false,
      scoreHistory: false,
    },
    leaderboardVisibility: {
      scoreBreakdown: { enabled: false, detail: 'total' },
      activityFeed: true,
      historicalComparison: false,
    },
    operations: {
      scheduledActions: false,
      i18n: { enabled: false, languages: ['en'] },
      embedSupport: true,
      teamMessaging: false,
      predictiveRankings: false,
      printViews: false,
      participantProfiles: false,
      exportOnDemand: false,
      hideLeaderboardUntilRegistrationClosed: false,
    },
  },
  professional: {
    presentation: {
      teamAvatars: true,
      stageDisplay: true,
      customThemes: true,
      podiumWinners: { enabled: true, topN: 3 },
    },
    competitive: {
      publicVoting: { enabled: false, weight: 20 },
      liveReactions: false,
      badgesAchievements: false,
      momentumIndicators: false,
    },
    judgeExperience: {
      judgeComments: true,
      bulkScoring: true,
      scoreHistory: true,
    },
    leaderboardVisibility: {
      scoreBreakdown: { enabled: true, detail: 'per-judge' },
      activityFeed: false,
      historicalComparison: true,
    },
    operations: {
      scheduledActions: true,
      i18n: { enabled: true, languages: ['en', 'es', 'fr'] },
      embedSupport: true,
      teamMessaging: true,
      predictiveRankings: false,
      printViews: true,
      participantProfiles: true,
      exportOnDemand: true,
      hideLeaderboardUntilRegistrationClosed: true,
    },
  },
}

export function EventCreationWizard({ onClose, onSuccess }: EventWizardProps) {
  const [step, setStep] = useState<WizardStep>(1)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step 1: Basic Info
  const [basicInfo, setBasicInfo] = useState({
    name: '',
    description: '',
    startAt: '',
    endAt: '',
    timezone: 'UTC',
    numberOfRounds: 1,
  })
  const [logoData, setLogoData] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [extractedColors, setExtractedColors] = useState<{ primary: string; secondary: string; accent: string } | null>(null)

  // Step 2: Features
  const [features, setFeatures] = useState<EventFeatures>(defaultFeatures)
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)

  // Step 3: Rubric
  const [criteria, setCriteria] = useState([
    { name: 'Criterion 1', maxPoints: 100, weight: 1, description: '', rounds: [1] }
  ])
  const [rounds, setRounds] = useState<Array<{ number: number; name: string; durationMinutes: number | null; durationUnit: 'min' | 'sec' | 'hr'; eliminationCount: number | null }>>(
    [{ number: 1, name: 'Round 1', durationMinutes: null, durationUnit: 'min', eliminationCount: null }]
  )

  const progressPercent = (step / 4) * 100

  // Keep rounds array in sync with numberOfRounds
  useEffect(() => {
    setRounds((prev) => {
      const desired = basicInfo.numberOfRounds
      const next = [...prev]
      if (next.length < desired) {
        for (let i = next.length; i < desired; i++) {
          next.push({ number: i + 1, name: `Round ${i + 1}`, durationMinutes: null, durationUnit: 'min', eliminationCount: null })
        }
      } else if (next.length > desired) {
        next.length = desired
      }
      return next
    })
  }, [basicInfo.numberOfRounds])

  // Keep criterion round assignments within bounds
  useEffect(() => {
    setCriteria((prev) =>
      prev.map((c) => {
        const allowedRounds = rounds.map((r) => r.number)
        const nextRounds = (c.rounds && Array.isArray(c.rounds) ? c.rounds : allowedRounds).filter((r) =>
          allowedRounds.includes(r)
        )
        return { ...c, rounds: nextRounds.length ? nextRounds : allowedRounds }
      })
    )
  }, [rounds])

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    const reader = new FileReader()
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string
      setLogoData(dataUrl)
      setLogoPreview(dataUrl)
      
      // Extract colors from logo
      try {
        const colors = await extractColorsFromImage(dataUrl)
        setExtractedColors(colors)
        toast.success('Logo uploaded and colors extracted!')
      } catch (error) {
        console.error('Color extraction failed:', error)
        // Continue without color extraction
      }
    }
    reader.onerror = () => {
      // silently handle file reader errors
    }
    reader.readAsDataURL(file)
  }

  const applyPreset = (presetKey: string) => {
    const preset = FEATURE_PRESETS[presetKey]
    if (preset) {
      const merged = mergeFeatures(defaultFeatures, preset)
      setFeatures(merged)
      setSelectedPreset(presetKey)
    }
  }

  const mergeFeatures = (base: EventFeatures, override: Partial<EventFeatures>): EventFeatures => {
    return {
      presentation: { ...base.presentation, ...override.presentation },
      competitive: {
        ...base.competitive,
        ...override.competitive,
        publicVoting: override.competitive?.publicVoting || base.competitive.publicVoting,
      },
      judgeExperience: { ...base.judgeExperience, ...override.judgeExperience },
      leaderboardVisibility: {
        ...base.leaderboardVisibility,
        ...override.leaderboardVisibility,
        scoreBreakdown: override.leaderboardVisibility?.scoreBreakdown || base.leaderboardVisibility.scoreBreakdown,
      },
      operations: {
        ...base.operations,
        ...override.operations,
        i18n: override.operations?.i18n || base.operations.i18n,
      },
    }
  }

  const toggleFeature = (path: string) => {
    const currentValue = getFeatureValue(features, path)
    if (typeof currentValue === 'boolean') {
      setFeatures(setFeatureValue(features, path, !currentValue))
    } else if (currentValue && typeof currentValue === 'object' && 'enabled' in currentValue) {
      setFeatures(setFeatureValue(features, path, { ...currentValue, enabled: !currentValue.enabled }))
    }
  }

  const updateFeatureConfig = (path: string, configKey: string, value: any) => {
    const currentValue = getFeatureValue(features, path)
    if (currentValue && typeof currentValue === 'object') {
      setFeatures(setFeatureValue(features, path, { ...currentValue, [configKey]: value }))
    }
  }

  const handleNext = () => {
    if (step < 4) setStep((step + 1) as WizardStep)
  }

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as WizardStep)
  }

  // Helper to convert duration to minutes based on unit
  const convertToMinutes = (value: number | null, unit: 'min' | 'sec' | 'hr'): number | null => {
    if (value === null || value === 0) return null
    switch (unit) {
      case 'sec': return Math.round(value / 60 * 100) / 100 // Convert seconds to minutes
      case 'hr': return value * 60 // Convert hours to minutes
      case 'min':
      default: return value
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    
    // Limit logo data URL size - if too large, don't send it (store separately later)
    let logoUrlToSend = logoData
    if (logoData && logoData.length > 500000) { // ~500KB limit
      console.warn('Logo data URL too large, truncating for initial creation')
      logoUrlToSend = null
    }
    
    // Extract numberOfRounds from basicInfo before spreading (don't send it to API)
    const { numberOfRounds, ...eventBasicInfo } = basicInfo
    
    // Check if any round has a timer set - auto-enable timedRounds feature
    const hasAnyTimer = rounds.some(r => r.durationMinutes !== null && r.durationMinutes > 0)
    
    // Prepare rounds data with converted durations
    const roundsData = rounds.map((r, idx) => ({
      number: idx + 1,
      name: r.name || `Round ${idx + 1}`,
      durationMinutes: convertToMinutes(r.durationMinutes, r.durationUnit || 'min'),
      eliminationCount: r.eliminationCount ?? null,
      eliminationType: r.eliminationCount ? 'count' : null,
    }))
    
    const requestBody = {
      ...eventBasicInfo,
      visibility: 'public',
      logoUrl: logoUrlToSend,
      brandColors: extractedColors,
      features: {
        ...features,
        // Auto-enable timedRounds if any round has a timer
        timedRounds: hasAnyTimer ? true : (features as any)?.timedRounds,
      },
      rules: {
        rubric: criteria,
        rounds: roundsData,
        // Include timerSettings if any round has a timer
        ...(hasAnyTimer && {
          timerSettings: {
            showPublicTimer: true,
            warningThreshold: 60,
          }
        }),
      }
    }
    
    console.log('[DEBUG] Submitting event creation:', {
      hasName: !!basicInfo.name,
      name: basicInfo.name,
      hasLogo: !!logoUrlToSend,
      logoSize: logoUrlToSend?.length,
      hasColors: !!extractedColors,
      hasFeatures: !!features,
      criteriaCount: criteria.length,
      numberOfRounds: basicInfo.numberOfRounds,
      hasAnyTimer,
      roundsData,
    })
    
    // Test JSON serialization before sending
    let requestBodyJson: string
    try {
      requestBodyJson = JSON.stringify(requestBody)
    } catch (jsonError) {
      console.error('JSON serialization failed:', jsonError)
      toast.error('Failed to prepare event data. Please check your inputs.')
      setLoading(false)
      return
    }
    
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBodyJson,
      })

      if (response.ok) {
        const data = await response.json()
        
        // Also sync rounds with timers to the rounds API for immediate availability
        if (hasAnyTimer && data.event?.slug) {
          try {
            await fetch('/api/rounds', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'configure-multiple',
                eventSlug: data.event.slug,
                rounds: roundsData.map(r => ({
                  number: r.number,
                  name: r.name,
                  roundDurationMinutes: r.durationMinutes,
                })),
              }),
            })
            console.log('[DEBUG] Rounds synced to /api/rounds')
          } catch (roundsError) {
            console.warn('[DEBUG] Failed to sync rounds:', roundsError)
            // Don't fail the whole creation, rounds can be set up later
          }
        }
        
        toast.success(`Event "${data.event.name}" created successfully!`)
        onSuccess()
        onClose()
      } else {
        let error
        const responseText = await response.text()
        try {
          error = JSON.parse(responseText)
        } catch (e) {
          error = { error: `HTTP ${response.status}: ${response.statusText}`, details: responseText }
        }
        const errorMsg = error.details || error.error || 'Failed to create event'
        toast.error(errorMsg)
      }
    } catch (error) {
      console.error('Error creating event:', error)
      toast.error('An error occurred: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setLoading(false)
    }
  }

  const canProceed = () => {
    if (step === 1) return basicInfo.name.trim().length > 0
    return true
  }

  const categoryIcons: Record<string, string> = {
    presentation: 'PR',
    competitive: 'CP',
    judgeExperience: 'JX',
    leaderboardVisibility: 'LB',
    operations: 'OP',
  }

  const categoryNames: Record<string, string> = {
    presentation: 'Presentation',
    competitive: 'Competitive',
    judgeExperience: 'Judge Experience',
    leaderboardVisibility: 'Leaderboard Visibility',
    operations: 'Operations',
  }

  const featuresByCategory = featureMetadata.reduce((acc, meta) => {
    if (!acc[meta.category]) acc[meta.category] = []
    acc[meta.category].push(meta)
    return acc
  }, {} as Record<string, typeof featureMetadata>)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-cream dark:bg-gray-950 rounded-2xl max-w-4xl w-full my-8 max-h-[90vh] flex flex-col shadow-2xl border border-charcoal/10 dark:border-white/10">
        {/* Header */}
        <div className="p-6 border-b border-charcoal/10 dark:border-white/10 flex-shrink-0">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-charcoal dark:text-white">Create New Event</h2>
            <button
              onClick={onClose}
              className="text-charcoal/40 dark:text-white/40 hover:text-charcoal dark:hover:text-white text-2xl w-8 h-8 flex items-center justify-center transition-colors"
              aria-label="Close wizard"
            >
              ×
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-charcoal/10 dark:bg-white/10 rounded-full h-2">
            <div 
              className="bg-charcoal dark:bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <div className="text-sm text-charcoal/50 dark:text-white/50 mt-2">
            Step {step} of 4
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-charcoal dark:text-white mb-4">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-charcoal/70 dark:text-white/70 mb-2">
                  Event Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={basicInfo.name}
                  onChange={(e) => setBasicInfo({ ...basicInfo, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-charcoal/20 dark:border-white/20 rounded-xl text-charcoal dark:text-white placeholder-charcoal/40 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-charcoal/20 dark:focus:ring-white/20 focus:border-charcoal dark:focus:border-white transition-all"
                  placeholder="Spring Hackathon 2025"
                  aria-label="Event name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal/70 dark:text-white/70 mb-2">
                  Description
                </label>
                <textarea
                  value={basicInfo.description}
                  onChange={(e) => setBasicInfo({ ...basicInfo, description: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-charcoal/20 dark:border-white/20 rounded-xl text-charcoal dark:text-white placeholder-charcoal/40 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-charcoal/20 dark:focus:ring-white/20 h-24 resize-none transition-all"
                  placeholder="Brief description of your event..."
                  aria-label="Event description"
                />
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-charcoal/70 dark:text-white/70 mb-2">
                  Event Logo (Optional)
                </label>
                <div className="flex items-center gap-4">
                  {logoPreview && (
                    <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-charcoal/20 dark:border-white/20 bg-white dark:bg-gray-900">
                      <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      aria-label="Upload logo"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-white dark:bg-gray-900 border border-charcoal/20 dark:border-white/20 rounded-xl text-charcoal dark:text-white hover:bg-charcoal/5 dark:hover:bg-white/5 transition-colors"
                    >
                      {logoPreview ? 'Change Logo' : 'Upload Logo'}
                    </button>
                    {logoPreview && (
                      <button
                        onClick={() => {
                          setLogoPreview(null)
                          setLogoData(null)
                          setExtractedColors(null)
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }}
                        className="ml-2 px-4 py-2 bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-500/20 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-charcoal/50 dark:text-white/50 mt-1">Upload a logo to customize your event branding. Max 5MB.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal/70 dark:text-white/70 mb-2">
                    Start Date
                  </label>
                  <input
                    type="datetime-local"
                    value={basicInfo.startAt}
                    onChange={(e) => setBasicInfo({ ...basicInfo, startAt: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-charcoal/20 dark:border-white/20 rounded-xl text-charcoal dark:text-white focus:outline-none focus:ring-2 focus:ring-charcoal/20 dark:focus:ring-white/20 transition-all [color-scheme:light] dark:[color-scheme:dark]"
                    aria-label="Start date"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal/70 dark:text-white/70 mb-2">
                    End Date
                  </label>
                  <input
                    type="datetime-local"
                    value={basicInfo.endAt}
                    onChange={(e) => setBasicInfo({ ...basicInfo, endAt: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-charcoal/20 dark:border-white/20 rounded-xl text-charcoal dark:text-white focus:outline-none focus:ring-2 focus:ring-charcoal/20 dark:focus:ring-white/20 transition-all [color-scheme:light] dark:[color-scheme:dark]"
                    aria-label="End date"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal/70 dark:text-white/70 mb-3">
                  Competition Rounds
                </label>
                
                {/* Round Stepper */}
                <div className="flex items-center gap-4 mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (basicInfo.numberOfRounds > 1) {
                        setBasicInfo({ ...basicInfo, numberOfRounds: basicInfo.numberOfRounds - 1 })
                      }
                    }}
                    disabled={basicInfo.numberOfRounds <= 1}
                    className="w-12 h-12 rounded-xl bg-charcoal/10 dark:bg-white/10 hover:bg-charcoal/20 dark:hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-2xl font-bold text-charcoal dark:text-white transition-all"
                    aria-label="Remove round"
                  >
                    −
                  </button>
                  <div className="flex-1 text-center">
                    <div className="text-4xl font-black text-charcoal dark:text-white">{basicInfo.numberOfRounds}</div>
                    <div className="text-xs text-charcoal/50 dark:text-white/50 uppercase tracking-wider">Round{basicInfo.numberOfRounds !== 1 ? 's' : ''}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (basicInfo.numberOfRounds < 20) {
                        setBasicInfo({ ...basicInfo, numberOfRounds: basicInfo.numberOfRounds + 1 })
                      }
                    }}
                    disabled={basicInfo.numberOfRounds >= 20}
                    className="w-12 h-12 rounded-xl bg-charcoal dark:bg-white hover:bg-charcoal/90 dark:hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-2xl font-bold text-cream dark:text-charcoal transition-all"
                    aria-label="Add round"
                  >
                    +
                  </button>
                </div>

                {/* Round Cards with Timer Settings */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {rounds.map((round, idx) => (
                    <div 
                      key={round.number} 
                      className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 border border-charcoal/10 dark:border-white/10 rounded-xl"
                    >
                      <div className="w-10 h-10 rounded-lg bg-charcoal/10 dark:bg-white/10 flex items-center justify-center font-bold text-charcoal dark:text-white flex-shrink-0">
                        {round.number}
                      </div>
                      <input
                        type="text"
                        value={round.name}
                        onChange={(e) => {
                          const next = [...rounds]
                          next[idx] = { ...next[idx], name: e.target.value }
                          setRounds(next)
                        }}
                        className="flex-1 px-3 py-2 bg-transparent border-none text-charcoal dark:text-white font-medium focus:outline-none focus:ring-0"
                        placeholder={`Round ${round.number}`}
                      />
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 px-2 py-1 bg-charcoal/5 dark:bg-white/5 rounded-lg">
                          <svg className="w-4 h-4 text-charcoal/50 dark:text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <input
                            type="number"
                            min={0}
                            max={999}
                            value={round.durationMinutes ?? ''}
                            onChange={(e) => {
                              const next = [...rounds]
                              const val = e.target.value === '' ? null : Math.max(0, parseInt(e.target.value) || 0)
                              next[idx] = { ...next[idx], durationMinutes: val }
                              setRounds(next)
                            }}
                            className="w-12 px-1 py-0.5 bg-transparent text-charcoal dark:text-white text-sm text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="--"
                          />
                          <select
                            value={round.durationUnit || 'min'}
                            onChange={(e) => {
                              const next = [...rounds]
                              next[idx] = { ...next[idx], durationUnit: e.target.value as 'min' | 'sec' | 'hr' }
                              setRounds(next)
                            }}
                            className="bg-transparent text-xs text-charcoal/70 dark:text-white/70 focus:outline-none cursor-pointer border-none"
                          >
                            <option value="sec">sec</option>
                            <option value="min">min</option>
                            <option value="hr">hr</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-charcoal/50 dark:text-white/50 mt-2">Add a timer to each round. Choose seconds, minutes, or hours.</p>
              </div>
            </div>
          )}

          {/* Step 2: Features */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-charcoal dark:text-white mb-2">Features & Customization</h3>
                <p className="text-charcoal/50 dark:text-white/50 mb-4">Choose a preset or customize features manually</p>
                
                {/* Presets */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {Object.keys(FEATURE_PRESETS).map((key) => (
                    <button
                      key={key}
                      onClick={() => applyPreset(key)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        selectedPreset === key
                          ? 'border-charcoal dark:border-white bg-charcoal/5 dark:bg-white/5'
                          : 'border-charcoal/20 dark:border-white/20 bg-white dark:bg-gray-900 hover:border-charcoal/40 dark:hover:border-white/40'
                      }`}
                    >
                      <div className="text-lg font-medium text-charcoal dark:text-white capitalize mb-1">{key}</div>
                      <div className="text-xs text-charcoal/50 dark:text-white/50">Quick setup</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Features by Category */}
              <div className="space-y-6 max-h-[500px] overflow-y-auto">
                {Object.entries(featuresByCategory).map(([category, metas]) => {
                  const highPriority = metas.filter(m => m.priority === 'high')
                  const mediumPriority = metas.filter(m => m.priority === 'medium')
                  
                  return (
                    <div key={category} className="border border-charcoal/10 dark:border-white/10 rounded-xl p-4 bg-white dark:bg-gray-900">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="w-8 h-8 rounded-lg bg-charcoal/10 dark:bg-white/10 flex items-center justify-center text-xs font-bold text-charcoal/60 dark:text-white/60">{categoryIcons[category]}</span>
                        <h4 className="text-lg font-semibold text-charcoal dark:text-white">{categoryNames[category]}</h4>
                      </div>
                      
                      <div className="space-y-3">
                        {highPriority.map((meta) => {
                          const value = getFeatureValue(features, meta.id)
                          const isEnabled = typeof value === 'boolean' ? value : value?.enabled
                          
                          return (
                            <div
                              key={meta.id}
                              className={`p-3 rounded-xl border ${
                                isEnabled ? 'bg-charcoal/5 dark:bg-white/5 border-charcoal/20 dark:border-white/20' : 'bg-charcoal/[0.02] dark:bg-white/[0.02] border-charcoal/10 dark:border-white/10'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h5 className="font-medium text-charcoal dark:text-white">{meta.name}</h5>
                                  </div>
                                  <p className="text-sm text-charcoal/50 dark:text-white/50">{meta.description}</p>
                                  
                                  {/* Configuration options */}
                                  {isEnabled && meta.configurable && (
                                    <div className="mt-3 pt-3 border-t border-charcoal/10 dark:border-white/10">
                                      {meta.configurable.type === 'select' && (
                                        <select
                                          value={typeof value === 'object' && value !== null ? (value as any).topN || (value as any).detail : ''}
                                          onChange={(e) => {
                                            const configKey = meta.id.includes('podiumWinners') ? 'topN' : 'detail'
                                            updateFeatureConfig(meta.id, configKey, meta.configurable?.type === 'select' && meta.configurable.options?.find(o => o.value.toString() === e.target.value)?.value || e.target.value)
                                          }}
                                          className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-charcoal/20 dark:border-white/20 rounded-lg text-charcoal dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-charcoal dark:focus:ring-white"
                                        >
                                          {meta.configurable.options?.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                              {opt.label}
                                            </option>
                                          ))}
                                        </select>
                                      )}
                                      {meta.configurable.type === 'number' && (
                                        <input
                                          type="number"
                                          min={meta.configurable.min}
                                          max={meta.configurable.max}
                                          value={typeof value === 'object' && value !== null ? (value as any).weight || 0 : 0}
                                          onChange={(e) => updateFeatureConfig(meta.id, 'weight', parseInt(e.target.value) || 0)}
                                          className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-charcoal/20 dark:border-white/20 rounded-lg text-charcoal dark:text-white text-sm w-24 focus:outline-none focus:ring-2 focus:ring-charcoal dark:focus:ring-white"
                                        />
                                      )}
                                    </div>
                                  )}
                                </div>
                                <label className="flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isEnabled}
                                    onChange={() => toggleFeature(meta.id)}
                                    className="w-5 h-5 rounded border-charcoal/30 dark:border-white/30 bg-white dark:bg-gray-800 text-charcoal dark:text-white focus:ring-2 focus:ring-charcoal dark:focus:ring-white"
                                  />
                                </label>
                              </div>
                            </div>
                          )
                        })}
                        
                        {mediumPriority.length > 0 && (
                          <details className="mt-4">
                            <summary className="text-sm text-charcoal/60 dark:text-white/60 cursor-pointer hover:text-charcoal dark:hover:text-white">
                              Show {mediumPriority.length} medium priority features
                            </summary>
                            <div className="mt-3 space-y-3">
                              {mediumPriority.map((meta) => {
                                const value = getFeatureValue(features, meta.id)
                                const isEnabled = typeof value === 'boolean' ? value : value?.enabled
                                
                                return (
                                  <div
                                    key={meta.id}
                                    className={`p-3 rounded-xl border ${
                                      isEnabled ? 'bg-charcoal/5 dark:bg-white/5 border-charcoal/30 dark:border-white/30' : 'bg-white/50 dark:bg-gray-800/50 border-charcoal/10 dark:border-white/10'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1">
                                        <h5 className="font-medium text-charcoal dark:text-white mb-1">{meta.name}</h5>
                                        <p className="text-sm text-charcoal/60 dark:text-white/60">{meta.description}</p>
                                      </div>
                                      <label className="flex items-center cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={isEnabled}
                                          onChange={() => toggleFeature(meta.id)}
                                          className="w-5 h-5 rounded border-charcoal/30 dark:border-white/30 bg-white dark:bg-gray-800 text-charcoal dark:text-white focus:ring-2 focus:ring-charcoal dark:focus:ring-white"
                                        />
                                      </label>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 3: Rubric */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Round Summary Cards */}
              <div>
                <h3 className="text-xl font-semibold text-charcoal dark:text-white mb-2">Round Configuration</h3>
                <p className="text-sm text-charcoal/60 dark:text-white/60 mb-4">Fine-tune each round with eliminations and advanced settings</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {rounds.map((r, idx) => {
                    const hasTimer = r.durationMinutes !== null && r.durationMinutes > 0
                    const hasElimination = r.eliminationCount !== null && r.eliminationCount > 0
                    
                    return (
                      <div 
                        key={r.number} 
                        className="relative p-4 bg-white dark:bg-gray-900 border border-charcoal/10 dark:border-white/10 rounded-2xl hover:border-charcoal/30 dark:hover:border-white/30 transition-all"
                      >
                        {/* Round Header */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-charcoal dark:bg-white flex items-center justify-center font-bold text-cream dark:text-charcoal text-lg">
                            {r.number}
                          </div>
                          <input
                            type="text"
                            value={r.name}
                            onChange={(e) => {
                              const next = [...rounds]
                              next[idx] = { ...next[idx], name: e.target.value }
                              setRounds(next)
                            }}
                            className="flex-1 px-2 py-1 bg-transparent text-charcoal dark:text-white font-semibold text-lg focus:outline-none focus:bg-charcoal/5 dark:focus:bg-white/5 rounded-lg transition-colors"
                            placeholder={`Round ${r.number}`}
                          />
                        </div>

                        {/* Timer Control */}
                        <div className="flex items-center justify-between p-3 bg-charcoal/5 dark:bg-white/5 rounded-xl mb-2">
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-charcoal/60 dark:text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm text-charcoal/70 dark:text-white/70">Timer</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              value={r.durationMinutes ?? ''}
                              onChange={(e) => {
                                const next = [...rounds]
                                const val = e.target.value === '' ? null : Math.max(0, parseInt(e.target.value) || 0)
                                next[idx] = { ...next[idx], durationMinutes: val }
                                setRounds(next)
                              }}
                              className="w-16 px-2 py-1 bg-white dark:bg-gray-800 border border-charcoal/20 dark:border-white/20 rounded-lg text-charcoal dark:text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-charcoal/20 dark:focus:ring-white/20"
                              placeholder="--"
                            />
                            <span className="text-xs text-charcoal/50 dark:text-white/50">min</span>
                          </div>
                        </div>

                        {/* Elimination Control */}
                        <div className="flex items-center justify-between p-3 bg-charcoal/5 dark:bg-white/5 rounded-xl">
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-charcoal/60 dark:text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                            </svg>
                            <span className="text-sm text-charcoal/70 dark:text-white/70">Eliminate</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              value={r.eliminationCount ?? ''}
                              onChange={(e) => {
                                const next = [...rounds]
                                const val = e.target.value === '' ? null : Math.max(0, parseInt(e.target.value) || 0)
                                next[idx] = { ...next[idx], eliminationCount: val }
                                setRounds(next)
                              }}
                              className="w-16 px-2 py-1 bg-white dark:bg-gray-800 border border-charcoal/20 dark:border-white/20 rounded-lg text-charcoal dark:text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-charcoal/20 dark:focus:ring-white/20"
                              placeholder="0"
                            />
                            <span className="text-xs text-charcoal/50 dark:text-white/50">teams</span>
                          </div>
                        </div>

                        {/* Status Badges */}
                        {(hasTimer || hasElimination) && (
                          <div className="flex gap-2 mt-3">
                            {hasTimer && (
                              <span className="px-2 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium rounded-lg">
                                {r.durationMinutes}min timer
                              </span>
                            )}
                            {hasElimination && (
                              <span className="px-2 py-1 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-medium rounded-lg">
                                -{r.eliminationCount} teams
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Scoring Criteria Section */}
              <div className="border-t border-charcoal/10 dark:border-white/10 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-charcoal dark:text-white">Scoring Criteria</h4>
                    <p className="text-sm text-charcoal/60 dark:text-white/60">Define what judges will score</p>
                  </div>
                  <button
                    onClick={() => setCriteria([...criteria, { name: '', maxPoints: 100, weight: 1, description: '', rounds: rounds.map(r => r.number) }])}
                    className="px-4 py-2 bg-charcoal dark:bg-white text-cream dark:text-charcoal rounded-xl font-medium hover:bg-charcoal/90 dark:hover:bg-white/90 transition-colors"
                  >
                    + Add Criterion
                  </button>
                </div>
              
                <div className="space-y-3">
                  {criteria.map((criterion, index) => (
                    <div key={index} className="p-4 bg-white dark:bg-gray-900 border border-charcoal/10 dark:border-white/10 rounded-xl">
                      <div className="flex items-start gap-3">
                        {/* Criterion Number */}
                        <div className="w-8 h-8 rounded-lg bg-charcoal/10 dark:bg-white/10 flex items-center justify-center font-bold text-charcoal dark:text-white text-sm flex-shrink-0 mt-1">
                          {index + 1}
                        </div>
                        
                        {/* Main Content */}
                        <div className="flex-1 space-y-3">
                          <div className="flex gap-3">
                            <input
                              type="text"
                              value={criterion.name}
                              onChange={(e) => {
                                const newCriteria = [...criteria]
                                newCriteria[index].name = e.target.value
                                setCriteria(newCriteria)
                              }}
                              className="flex-1 px-3 py-2 bg-charcoal/5 dark:bg-white/5 border-none rounded-xl text-charcoal dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-charcoal/20 dark:focus:ring-white/20"
                              placeholder="Criterion name (e.g., Innovation)"
                            />
                            <div className="flex items-center gap-1 px-3 py-2 bg-charcoal/5 dark:bg-white/5 rounded-xl">
                              <input
                                type="number"
                                value={criterion.maxPoints}
                                onChange={(e) => {
                                  const newCriteria = [...criteria]
                                  newCriteria[index].maxPoints = parseInt(e.target.value) || 0
                                  setCriteria(newCriteria)
                                }}
                                className="w-16 bg-transparent text-charcoal dark:text-white text-center font-bold focus:outline-none"
                                min="0"
                              />
                              <span className="text-charcoal/50 dark:text-white/50 text-sm">pts</span>
                            </div>
                            {criteria.length > 1 && (
                              <button
                                onClick={() => setCriteria(criteria.filter((_, i) => i !== index))}
                                className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                          
                          <input
                            type="text"
                            value={criterion.description}
                            onChange={(e) => {
                              const newCriteria = [...criteria]
                              newCriteria[index].description = e.target.value
                              setCriteria(newCriteria)
                            }}
                            className="w-full px-3 py-2 bg-transparent border border-charcoal/10 dark:border-white/10 rounded-xl text-charcoal dark:text-white text-sm focus:outline-none focus:border-charcoal/30 dark:focus:border-white/30"
                            placeholder="Brief description for judges (optional)"
                          />

                          {/* Round Assignment - Compact Chips */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-charcoal/50 dark:text-white/50">Applies to:</span>
                            {rounds.map((r) => {
                              const checked = criterion.rounds?.includes(r.number)
                              return (
                                <button
                                  key={r.number}
                                  onClick={() => {
                                    const next = [...criteria]
                                    const currentRounds = Array.isArray(criterion.rounds) ? [...criterion.rounds] : []
                                    if (checked) {
                                      next[index].rounds = currentRounds.filter((n) => n !== r.number)
                                    } else {
                                      next[index].rounds = [...currentRounds, r.number]
                                    }
                                    if (!next[index].rounds || next[index].rounds.length === 0) {
                                      next[index].rounds = [r.number]
                                    }
                                    setCriteria(next)
                                  }}
                                  className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                                    checked 
                                      ? 'bg-charcoal dark:bg-white text-cream dark:text-charcoal' 
                                      : 'bg-charcoal/10 dark:bg-white/10 text-charcoal/60 dark:text-white/60 hover:bg-charcoal/20 dark:hover:bg-white/20'
                                  }`}
                                >
                                  R{r.number}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {criteria.length === 0 && (
                  <div className="text-center py-12 bg-charcoal/5 dark:bg-white/5 rounded-2xl">
                    <p className="text-charcoal/50 dark:text-white/50 mb-4">No scoring criteria yet</p>
                    <button
                      onClick={() => setCriteria([{ name: '', maxPoints: 100, weight: 1, description: '', rounds: rounds.map(r => r.number) }])}
                      className="px-6 py-3 bg-charcoal dark:bg-white text-cream dark:text-charcoal rounded-xl font-medium hover:bg-charcoal/90 dark:hover:bg-white/90 transition-colors"
                    >
                      + Add First Criterion
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-charcoal dark:text-white mb-4">Review & Launch</h3>
              
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-charcoal/10 dark:border-white/10 p-4 space-y-3">
                <div>
                  <div className="text-sm text-charcoal/60 dark:text-white/60">Event Name</div>
                  <div className="text-charcoal dark:text-white font-medium">{basicInfo.name}</div>
                </div>
                <div>
                  <div className="text-sm text-charcoal/60 dark:text-white/60">Public URL</div>
                  <div className="text-charcoal dark:text-white font-mono text-sm">
                    /e/{basicInfo.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
                  </div>
                </div>
                {logoPreview && (
                  <div>
                    <div className="text-sm text-charcoal/60 dark:text-white/60 mb-2">Logo</div>
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-charcoal/10 dark:border-white/10">
                      <img src={logoPreview} alt="Event logo" className="w-full h-full object-contain" />
                    </div>
                  </div>
                )}
                {extractedColors && (
                  <div>
                    <div className="text-sm text-charcoal/60 dark:text-white/60 mb-2">Brand Colors</div>
                    <div className="flex gap-2">
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-lg border-2 border-charcoal/10 dark:border-white/10" style={{ backgroundColor: extractedColors.primary }} />
                        <span className="text-xs text-charcoal/60 dark:text-white/60 mt-1">Primary</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-lg border-2 border-charcoal/10 dark:border-white/10" style={{ backgroundColor: extractedColors.secondary }} />
                        <span className="text-xs text-charcoal/60 dark:text-white/60 mt-1">Secondary</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-lg border-2 border-charcoal/10 dark:border-white/10" style={{ backgroundColor: extractedColors.accent }} />
                        <span className="text-xs text-charcoal/60 dark:text-white/60 mt-1">Accent</span>
                      </div>
                    </div>
                  </div>
                )}
                {selectedPreset && (
                  <div>
                    <div className="text-sm text-charcoal/60 dark:text-white/60">Template</div>
                    <div className="text-charcoal dark:text-white capitalize">{selectedPreset}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-charcoal/60 dark:text-white/60">Number of Rounds</div>
                  <div className="text-charcoal dark:text-white">{basicInfo.numberOfRounds}</div>
                </div>
                <div>
                  <div className="text-sm text-charcoal/60 dark:text-white/60">Scoring Criteria</div>
                  <div className="text-charcoal dark:text-white">{criteria.length} criteria</div>
                </div>
                <div>
                  <div className="text-sm text-charcoal/60 dark:text-white/60">Features Enabled</div>
                  <div className="text-charcoal dark:text-white">
                    {featureMetadata.filter(meta => {
                      const value = getFeatureValue(features, meta.id)
                      return typeof value === 'boolean' ? value : value?.enabled
                    }).length} of {featureMetadata.length}
                  </div>
                </div>
              </div>

              <div className="bg-green-500/10 dark:bg-green-500/10 border border-green-500/30 dark:border-green-500/30 rounded-xl p-4">
                <div className="text-green-700 dark:text-green-400 font-medium mb-2">✓ Ready to Launch</div>
                <div className="text-sm text-charcoal/80 dark:text-white/80">
                  Your event will be created with a unique public URL. You'll be able to generate QR codes
                  and invite judges after creation.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-charcoal/10 dark:border-white/10 flex justify-between flex-shrink-0">
          <button
            onClick={step === 1 ? onClose : handleBack}
            className="px-6 py-3 text-charcoal/60 dark:text-white/60 hover:text-charcoal dark:hover:text-white transition-colors"
            disabled={loading}
            style={{ minHeight: '48px' }}
            aria-label={step === 1 ? 'Cancel' : 'Back'}
          >
            {step === 1 ? 'Cancel' : '← Back'}
          </button>
          
          {step < 4 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="px-6 py-3 bg-charcoal dark:bg-white hover:bg-charcoal/90 dark:hover:bg-white/90 disabled:bg-charcoal/30 dark:disabled:bg-white/30 disabled:cursor-not-allowed text-cream dark:text-charcoal rounded-xl font-medium transition-colors"
              style={{ minHeight: '48px' }}
              aria-label="Next step"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
              style={{ minHeight: '48px' }}
              aria-label="Create event"
            >
              {loading ? 'Creating...' : 'Create Event'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
