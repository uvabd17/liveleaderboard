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
  const [rounds, setRounds] = useState<Array<{ number: number; name: string; durationMinutes: number | null; eliminationCount: number | null }>>(
    [{ number: 1, name: 'Round 1', durationMinutes: null, eliminationCount: null }]
  )

  const progressPercent = (step / 4) * 100

  // Keep rounds array in sync with numberOfRounds
  useEffect(() => {
    setRounds((prev) => {
      const desired = basicInfo.numberOfRounds
      const next = [...prev]
      if (next.length < desired) {
        for (let i = next.length; i < desired; i++) {
          next.push({ number: i + 1, name: `Round ${i + 1}`, durationMinutes: null, eliminationCount: null })
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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c899a439-8621-4806-a624-02a438efe8c1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'event-creation-wizard.tsx:189',message:'Logo upload started',data:{fileName:file.name,fileSize:file.size,fileType:file.type},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c899a439-8621-4806-a624-02a438efe8c1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'event-creation-wizard.tsx:202',message:'FileReader loaded, starting color extraction',data:{dataUrlLength:dataUrl?.length,dataUrlPrefix:dataUrl?.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      setLogoData(dataUrl)
      setLogoPreview(dataUrl)
      
      // Extract colors from logo
      try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c899a439-8621-4806-a624-02a438efe8c1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'event-creation-wizard.tsx:208',message:'Calling extractColorsFromImage',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        const colors = await extractColorsFromImage(dataUrl)
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c899a439-8621-4806-a624-02a438efe8c1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'event-creation-wizard.tsx:210',message:'Color extraction succeeded',data:{primary:colors.primary,secondary:colors.secondary,accent:colors.accent},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        setExtractedColors(colors)
        toast.success('Logo uploaded and colors extracted!')
      } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c899a439-8621-4806-a624-02a438efe8c1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'event-creation-wizard.tsx:214',message:'Color extraction failed',data:{error:error instanceof Error?error.message:String(error),errorStack:error instanceof Error?error.stack:undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        console.error('Color extraction failed:', error)
        // Continue without color extraction
      }
    }
    reader.onerror = () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c899a439-8621-4806-a624-02a438efe8c1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'event-creation-wizard.tsx:217',message:'FileReader error',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
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
    
    const requestBody = {
      ...eventBasicInfo,
      visibility: 'public',
      logoUrl: logoUrlToSend,
      brandColors: extractedColors,
      features,
      rules: {
        rubric: criteria,
        rounds: rounds.map((r, idx) => ({
          number: idx + 1,
          name: r.name || `Round ${idx + 1}`,
          durationMinutes: r.durationMinutes ?? null,
          eliminationCount: r.eliminationCount ?? null,
          eliminationType: r.eliminationCount ? 'count' : null,
        })),
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
    })
    
    // Test JSON serialization before sending
    let requestBodyJson: string
    try {
      requestBodyJson = JSON.stringify(requestBody)
      console.log('[DEBUG] JSON serialization successful, size:', requestBodyJson.length)
    } catch (jsonError) {
      console.error('[DEBUG] JSON serialization failed:', jsonError)
      toast.error('Failed to prepare event data. Please check your inputs.')
      setLoading(false)
      return
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c899a439-8621-4806-a624-02a438efe8c1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'event-creation-wizard.tsx:274',message:'handleSubmit called, preparing request',data:{hasName:!!basicInfo.name,hasLogo:!!logoUrlToSend,hasColors:!!extractedColors,hasFeatures:!!features,criteriaCount:criteria.length,numberOfRounds:basicInfo.numberOfRounds,requestBodyKeys:Object.keys(requestBody),requestBodySize:requestBodyJson.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    try {
      console.log('[DEBUG] Sending POST request to /api/events')
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c899a439-8621-4806-a624-02a438efe8c1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'event-creation-wizard.tsx:277',message:'Sending POST to /api/events',data:{bodySize:requestBodyJson.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBodyJson,
      })

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c899a439-8621-4806-a624-02a438efe8c1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'event-creation-wizard.tsx:292',message:'Response received',data:{status:response.status,statusText:response.statusText,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      if (response.ok) {
        const data = await response.json()
        console.log('[CLIENT] Event created successfully:', data)
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c899a439-8621-4806-a624-02a438efe8c1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'event-creation-wizard.tsx:295',message:'Event created successfully',data:{eventId:data.event?.id,eventName:data.event?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        toast.success(`Event "${data.event.name}" created successfully!`)
        onSuccess()
        onClose()
      } else {
        let error
        const responseText = await response.text()
        console.error('[CLIENT] Event creation failed - Response status:', response.status)
        console.error('[CLIENT] Response text:', responseText)
        try {
          error = JSON.parse(responseText)
        } catch (e) {
          error = { error: `HTTP ${response.status}: ${response.statusText}`, details: responseText }
        }
        console.error('[CLIENT] Event creation failed - Parsed error:', error)
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c899a439-8621-4806-a624-02a438efe8c1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'event-creation-wizard.tsx:299',message:'Event creation failed',data:{status:response.status,error:error.error,errorDetails:error,responseText},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        const errorMsg = error.details || error.error || 'Failed to create event'
        toast.error(errorMsg)
      }
    } catch (error) {
      console.error('[DEBUG] Exception in handleSubmit:', error)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c899a439-8621-4806-a624-02a438efe8c1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'event-creation-wizard.tsx:302',message:'Exception in handleSubmit',data:{error:error instanceof Error?error.message:String(error),errorStack:error instanceof Error?error.stack:undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
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
    presentation: '🎨',
    competitive: '🏆',
    judgeExperience: '⚖️',
    leaderboardVisibility: '👁️',
    operations: '⚙️',
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
      <div className="bg-slate-800 rounded-lg max-w-4xl w-full my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex-shrink-0">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">Create New Event</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-2xl w-8 h-8 flex items-center justify-center"
              aria-label="Close wizard"
            >
              ×
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <div className="text-sm text-slate-400 mt-2">
            Step {step} of 4
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white mb-4">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Event Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={basicInfo.name}
                  onChange={(e) => setBasicInfo({ ...basicInfo, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Spring Hackathon 2025"
                  aria-label="Event name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  value={basicInfo.description}
                  onChange={(e) => setBasicInfo({ ...basicInfo, description: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                  placeholder="Brief description of your event..."
                  aria-label="Event description"
                />
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Event Logo (Optional)
                </label>
                <div className="flex items-center gap-4">
                  {logoPreview && (
                    <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-slate-600">
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
                      className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white hover:bg-slate-600 transition-colors"
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
                        className="ml-2 px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-1">Upload a logo to customize your event branding. Max 5MB.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Start Date
                  </label>
                  <input
                    type="datetime-local"
                    value={basicInfo.startAt}
                    onChange={(e) => setBasicInfo({ ...basicInfo, startAt: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Start date"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    End Date
                  </label>
                  <input
                    type="datetime-local"
                    value={basicInfo.endAt}
                    onChange={(e) => setBasicInfo({ ...basicInfo, endAt: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="End date"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Number of Rounds
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={basicInfo.numberOfRounds}
                  onChange={(e) => setBasicInfo({ ...basicInfo, numberOfRounds: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1"
                  aria-label="Number of rounds"
                />
                <p className="text-xs text-slate-400 mt-1">Specify how many rounds this competition will have</p>
              </div>
            </div>
          )}

          {/* Step 2: Features */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Features & Customization</h3>
                <p className="text-slate-400 mb-4">Choose a preset or customize features manually</p>
                
                {/* Presets */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {Object.keys(FEATURE_PRESETS).map((key) => (
                    <button
                      key={key}
                      onClick={() => applyPreset(key)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedPreset === key
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-slate-600 bg-slate-700 hover:border-slate-500'
                      }`}
                    >
                      <div className="text-lg font-medium text-white capitalize mb-1">{key}</div>
                      <div className="text-xs text-slate-400">Quick setup</div>
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
                    <div key={category} className="border border-slate-700 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl">{categoryIcons[category]}</span>
                        <h4 className="text-lg font-semibold text-white">{categoryNames[category]}</h4>
                      </div>
                      
                      <div className="space-y-3">
                        {highPriority.map((meta) => {
                          const value = getFeatureValue(features, meta.id)
                          const isEnabled = typeof value === 'boolean' ? value : value?.enabled
                          
                          return (
                            <div
                              key={meta.id}
                              className={`p-3 rounded-lg border ${
                                isEnabled ? 'bg-blue-500/10 border-blue-500/30' : 'bg-slate-700/50 border-slate-600'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h5 className="font-medium text-white">{meta.name}</h5>
                                  </div>
                                  <p className="text-sm text-slate-400">{meta.description}</p>
                                  
                                  {/* Configuration options */}
                                  {isEnabled && meta.configurable && (
                                    <div className="mt-3 pt-3 border-t border-slate-600">
                                      {meta.configurable.type === 'select' && (
                                        <select
                                          value={typeof value === 'object' && value !== null ? (value as any).topN || (value as any).detail : ''}
                                          onChange={(e) => {
                                            const configKey = meta.id.includes('podiumWinners') ? 'topN' : 'detail'
                                            updateFeatureConfig(meta.id, configKey, meta.configurable?.type === 'select' && meta.configurable.options?.find(o => o.value.toString() === e.target.value)?.value || e.target.value)
                                          }}
                                          className="px-3 py-1.5 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                          className="px-3 py-1.5 bg-slate-600 border border-slate-500 rounded text-white text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                    className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                  />
                                </label>
                              </div>
                            </div>
                          )
                        })}
                        
                        {mediumPriority.length > 0 && (
                          <details className="mt-4">
                            <summary className="text-sm text-slate-400 cursor-pointer hover:text-slate-300">
                              Show {mediumPriority.length} medium priority features
                            </summary>
                            <div className="mt-3 space-y-3">
                              {mediumPriority.map((meta) => {
                                const value = getFeatureValue(features, meta.id)
                                const isEnabled = typeof value === 'boolean' ? value : value?.enabled
                                
                                return (
                                  <div
                                    key={meta.id}
                                    className={`p-3 rounded-lg border ${
                                      isEnabled ? 'bg-blue-500/10 border-blue-500/30' : 'bg-slate-700/50 border-slate-600'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1">
                                        <h5 className="font-medium text-white mb-1">{meta.name}</h5>
                                        <p className="text-sm text-slate-400">{meta.description}</p>
                                      </div>
                                      <label className="flex items-center cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={isEnabled}
                                          onChange={() => toggleFeature(meta.id)}
                                          className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-2 focus:ring-blue-500"
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
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white mb-4">Rounds & Scoring</h3>

              <div className="bg-slate-700 p-4 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-semibold">Round Configuration</div>
                    <div className="text-sm text-slate-300">Name each round and set timers or eliminations now.</div>
                  </div>
                </div>
                <div className="space-y-3">
                  {rounds.map((r, idx) => (
                    <div key={r.number} className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-slate-800/60 p-3 rounded border border-slate-600">
                      <div className="md:col-span-2">
                        <label className="text-xs text-slate-300 mb-1 block">Round Name</label>
                        <input
                          value={r.name}
                          onChange={(e) => {
                            const next = [...rounds]
                            next[idx] = { ...next[idx], name: e.target.value }
                            setRounds(next)
                          }}
                          className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-300 mb-1 block">Timer (minutes)</label>
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
                          className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white"
                          placeholder="e.g. 10"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-300 mb-1 block">Eliminate (count)</label>
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
                          className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white"
                          placeholder="0 = none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <h4 className="text-lg font-semibold text-white mt-6">Scoring Rubric</h4>
              
              {criteria.map((criterion, index) => (
                <div key={index} className="bg-slate-700 p-4 rounded-lg space-y-3">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={criterion.name}
                      onChange={(e) => {
                        const newCriteria = [...criteria]
                        newCriteria[index].name = e.target.value
                        setCriteria(newCriteria)
                      }}
                      className="flex-1 px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Criterion name"
                      aria-label={`Criterion ${index + 1} name`}
                    />
                    <input
                      type="number"
                      value={criterion.maxPoints}
                      onChange={(e) => {
                        const newCriteria = [...criteria]
                        newCriteria[index].maxPoints = parseInt(e.target.value) || 0
                        setCriteria(newCriteria)
                      }}
                      className="w-24 px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="100"
                      min="0"
                      aria-label={`Criterion ${index + 1} max points`}
                    />
                    {criteria.length > 1 && (
                      <button
                        onClick={() => setCriteria(criteria.filter((_, i) => i !== index))}
                        className="px-3 py-2 bg-red-600/20 text-red-400 rounded hover:bg-red-600/30"
                        aria-label={`Remove criterion ${index + 1}`}
                      >
                        ×
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
                    className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Description (optional)"
                    aria-label={`Criterion ${index + 1} description`}
                  />
                  <div>
                    <div className="text-xs text-slate-300 mb-2">Rounds where this applies</div>
                    <div className="flex flex-wrap gap-2">
                      {rounds.map((r) => {
                        const checked = criterion.rounds?.includes(r.number)
                        return (
                          <label key={r.number} className="flex items-center gap-2 px-2 py-1 rounded bg-slate-600 border border-slate-500 text-sm text-white cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!checked}
                              onChange={() => {
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
                              className="w-4 h-4"
                            />
                            <span>Round {r.number}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={() => setCriteria([...criteria, { name: '', maxPoints: 100, weight: 1, description: '', rounds: rounds.map(r => r.number) }])}
                className="w-full py-2 border-2 border-dashed border-slate-600 rounded-lg text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-colors"
                aria-label="Add criterion"
              >
                + Add Criterion
              </button>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white mb-4">Review & Launch</h3>
              
              <div className="bg-slate-700 rounded-lg p-4 space-y-3">
                <div>
                  <div className="text-sm text-slate-400">Event Name</div>
                  <div className="text-white font-medium">{basicInfo.name}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Public URL</div>
                  <div className="text-blue-400 font-mono text-sm">
                    /e/{basicInfo.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
                  </div>
                </div>
                {logoPreview && (
                  <div>
                    <div className="text-sm text-slate-400 mb-2">Logo</div>
                    <div className="w-16 h-16 rounded overflow-hidden border border-slate-600">
                      <img src={logoPreview} alt="Event logo" className="w-full h-full object-contain" />
                    </div>
                  </div>
                )}
                {extractedColors && (
                  <div>
                    <div className="text-sm text-slate-400 mb-2">Brand Colors</div>
                    <div className="flex gap-2">
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded border-2 border-slate-600" style={{ backgroundColor: extractedColors.primary }} />
                        <span className="text-xs text-slate-400 mt-1">Primary</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded border-2 border-slate-600" style={{ backgroundColor: extractedColors.secondary }} />
                        <span className="text-xs text-slate-400 mt-1">Secondary</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded border-2 border-slate-600" style={{ backgroundColor: extractedColors.accent }} />
                        <span className="text-xs text-slate-400 mt-1">Accent</span>
                      </div>
                    </div>
                  </div>
                )}
                {selectedPreset && (
                  <div>
                    <div className="text-sm text-slate-400">Template</div>
                    <div className="text-white capitalize">{selectedPreset}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-slate-400">Number of Rounds</div>
                  <div className="text-white">{basicInfo.numberOfRounds}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Scoring Criteria</div>
                  <div className="text-white">{criteria.length} criteria</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Features Enabled</div>
                  <div className="text-white">
                    {featureMetadata.filter(meta => {
                      const value = getFeatureValue(features, meta.id)
                      return typeof value === 'boolean' ? value : value?.enabled
                    }).length} of {featureMetadata.length}
                  </div>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500 rounded-lg p-4">
                <div className="text-blue-400 font-medium mb-2">✓ Ready to Launch</div>
                <div className="text-sm text-slate-300">
                  Your event will be created with a unique public URL. You'll be able to generate QR codes
                  and invite judges after creation.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 flex justify-between flex-shrink-0">
          <button
            onClick={step === 1 ? onClose : handleBack}
            className="px-6 py-3 text-slate-300 hover:text-white transition-colors"
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
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              style={{ minHeight: '48px' }}
              aria-label="Next step"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              style={{ minHeight: '48px' }}
              aria-label="Create event"
            >
              {loading ? 'Creating...' : '🚀 Create Event'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
