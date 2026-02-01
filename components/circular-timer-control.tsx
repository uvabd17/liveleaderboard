'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Volume2, VolumeX } from 'lucide-react'

interface CircularTimerControlProps {
  round: {
    name: string
    roundDurationMinutes: number
    judgingOpen?: boolean
    judgingWindowMinutes?: number | null
    judgingOpenedAt?: string | null
    timerStartedAt?: string | null
    timerPausedAt?: string | null
    timerRunning?: boolean
  }
  roundIdx: number
  currentRoundIdx: number
  onStartTimer: () => void
  onPauseTimer: () => void
  onResumeTimer: () => void
  onStopTimer: () => void
  loading?: boolean
  warningMinutes?: number // Default: 5 minutes
  criticalMinutes?: number // Default: 1 minute
}

export function CircularTimerControl({
  round,
  roundIdx,
  currentRoundIdx,
  onStartTimer,
  onPauseTimer,
  onResumeTimer,
  onStopTimer,
  loading = false,
  warningMinutes = 5,
  criticalMinutes = 1
}: CircularTimerControlProps) {
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [hasPlayedWarning, setHasPlayedWarning] = useState(false)
  const [hasPlayedCritical, setHasPlayedCritical] = useState(false)
  const [hasPlayedFinish, setHasPlayedFinish] = useState(false)
  const audioContext = useRef<AudioContext | null>(null)
  const prevTimerStartedAt = useRef<string | null>(null)

  // Initialize audio context on user interaction
  const initAudio = useCallback(() => {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return audioContext.current
  }, [])

  // Play sound using Web Audio API
  const playSound = useCallback((type: 'warning' | 'critical' | 'finish') => {
    if (!soundEnabled) return
    
    try {
      const ctx = initAudio()
      if (ctx.state === 'suspended') {
        ctx.resume()
      }
      
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      // Different sounds for different alerts
      if (type === 'warning') {
        // Two-tone warning beep
        oscillator.frequency.setValueAtTime(880, ctx.currentTime) // A5
        oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.1) // E5
        oscillator.type = 'sine'
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
        oscillator.start(ctx.currentTime)
        oscillator.stop(ctx.currentTime + 0.3)
      } else if (type === 'critical') {
        // Rapid beeps for critical
        oscillator.frequency.setValueAtTime(1000, ctx.currentTime)
        oscillator.type = 'square'
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
        for (let i = 0; i < 3; i++) {
          gainNode.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.15)
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.1)
        }
        oscillator.start(ctx.currentTime)
        oscillator.stop(ctx.currentTime + 0.5)
      } else if (type === 'finish') {
        // Long tone for finish
        oscillator.frequency.setValueAtTime(440, ctx.currentTime) // A4
        oscillator.type = 'sine'
        gainNode.gain.setValueAtTime(0.4, ctx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5)
        oscillator.start(ctx.currentTime)
        oscillator.stop(ctx.currentTime + 1.5)
      }
    } catch (e) {
      console.warn('Audio playback failed:', e)
    }
  }, [soundEnabled, initAudio])

  // Reset sound flags when timer restarts or is stopped
  useEffect(() => {
    // If timer was stopped (timerStartedAt became null), reset all flags
    if (!round.timerStartedAt && prevTimerStartedAt.current) {
      setHasPlayedWarning(false)
      setHasPlayedCritical(false)
      setHasPlayedFinish(false)
    }
    // If timer was restarted (new timerStartedAt value), reset all flags
    else if (round.timerStartedAt && round.timerStartedAt !== prevTimerStartedAt.current) {
      setHasPlayedWarning(false)
      setHasPlayedCritical(false)
      setHasPlayedFinish(false)
    }
    prevTimerStartedAt.current = round.timerStartedAt || null
  }, [round.timerStartedAt])

  // Update current time every second for live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Calculate timer state
  const computeTimeLeft = () => {
    const total = round.roundDurationMinutes * 60
    if (!round.timerStartedAt) return { total, left: total, running: false, paused: false }

    const startedAt = new Date(round.timerStartedAt).getTime()
    const pausedAt = round.timerPausedAt ? new Date(round.timerPausedAt).getTime() : null

    if (pausedAt) {
      // Timer is paused - calculate time left at pause time
      const elapsed = Math.floor((pausedAt - startedAt) / 1000)
      const left = Math.max(0, total - elapsed)
      return { total, left, running: false, paused: true }
    } else {
      // Timer is running
      const elapsed = Math.floor((currentTime - startedAt) / 1000)
      const left = Math.max(0, total - elapsed)
      return { total, left, running: left > 0, paused: false }
    }
  }

  const timerState = computeTimeLeft()
  const formatTime = (seconds: number) => {
    if (seconds <= 0) return '00:00'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const progress = timerState.total > 0 ? ((timerState.total - timerState.left) / timerState.total) * 100 : 0
  const isCurrentRound = roundIdx === currentRoundIdx
  const isRunning = timerState.running
  const isPaused = timerState.paused
  const isFinished = timerState.left === 0 && round.timerStartedAt && !isPaused
  const isCritical = isRunning && timerState.left <= criticalMinutes * 60
  const isWarning = isRunning && !isCritical && timerState.left <= warningMinutes * 60

  // Track previous time left to detect threshold crossings on resume
  const prevTimeLeftRef = useRef<number | null>(null)

  // Sound triggers
  useEffect(() => {
    const warningThreshold = warningMinutes * 60
    const criticalThreshold = criticalMinutes * 60
    const currentTimeLeft = timerState.left
    const prevTimeLeft = prevTimeLeftRef.current

    // Only process sounds when timer is running
    if (!isRunning) {
      // Store current time when paused so we can check on resume
      if (isPaused) {
        prevTimeLeftRef.current = currentTimeLeft
      }
      return
    }

    // Check if we resumed and crossed a threshold while paused
    // (e.g., paused at 5:30, resumed at 4:30 after time adjustment)
    const crossedWarningWhilePaused = prevTimeLeft !== null && 
      prevTimeLeft > warningThreshold && currentTimeLeft <= warningThreshold
    const crossedCriticalWhilePaused = prevTimeLeft !== null && 
      prevTimeLeft > criticalThreshold && currentTimeLeft <= criticalThreshold

    // Warning sound at warningMinutes
    if ((currentTimeLeft <= warningThreshold && currentTimeLeft > criticalThreshold && !hasPlayedWarning) ||
        (crossedWarningWhilePaused && !hasPlayedWarning)) {
      playSound('warning')
      setHasPlayedWarning(true)
    }

    // Critical sound at criticalMinutes
    if ((currentTimeLeft <= criticalThreshold && currentTimeLeft > 0 && !hasPlayedCritical) ||
        (crossedCriticalWhilePaused && !hasPlayedCritical)) {
      playSound('critical')
      setHasPlayedCritical(true)
    }

    // Update previous time reference
    prevTimeLeftRef.current = currentTimeLeft
  }, [timerState.left, isRunning, isPaused, hasPlayedWarning, hasPlayedCritical, warningMinutes, criticalMinutes, playSound])

  // Finish sound when timer reaches 0
  useEffect(() => {
    if (isFinished && !hasPlayedFinish) {
      playSound('finish')
      setHasPlayedFinish(true)
    }
  }, [isFinished, hasPlayedFinish, playSound])

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Timer Display Circle */}
      <div className="relative w-32 h-32">
        {/* Background Circle */}
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 128 128">
          <circle
            cx="64"
            cy="64"
            r="60"
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            className="text-charcoal/10 dark:text-white/10"
          />
          {/* Progress Circle */}
          <circle
            cx="64"
            cy="64"
            r="60"
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 60}`}
            strokeDashoffset={`${2 * Math.PI * 60 * (1 - progress / 100)}`}
            strokeLinecap="round"
            className={`transition-all duration-1000 ${isRunning ? 'text-charcoal dark:text-white' :
              isPaused ? 'text-amber-500' :
                'text-charcoal/30 dark:text-white/30'
              }`}
          />
        </svg>

        {/* Timer Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`font-mono text-2xl font-bold transition-all duration-300 ${isCritical ? 'text-rose-500 scale-110' :
            isWarning ? 'text-amber-500' :
              isRunning ? 'text-charcoal dark:text-white' :
                isPaused ? 'text-amber-500' :
                  'text-charcoal/40 dark:text-white/40'
            }`}>
            {formatTime(timerState.left)}
          </div>
        </div>
      </div>

      {/* Round Info */}
      <div className="text-center">
        <div className="text-sm font-medium text-charcoal dark:text-white">{round.name}</div>
        <div className="text-xs text-charcoal/50 dark:text-white/50">
          Round {roundIdx + 1} • {round.roundDurationMinutes}m
        </div>
      </div>

      {/* Control Buttons - Horizontal Layout */}
      <div className="flex gap-2 justify-center">
        {/* Start Button */}
        <Button
          onClick={onStartTimer}
          disabled={loading || isRunning}
          className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${isRunning
            ? 'bg-charcoal/10 text-charcoal/30 dark:bg-white/10 dark:text-white/30 cursor-not-allowed'
            : 'bg-charcoal text-cream hover:bg-charcoal/90 dark:bg-white dark:text-charcoal dark:hover:bg-white/90'
            }`}
        >
          Start
        </Button>

        {/* Pause Button */}
        <Button
          onClick={onPauseTimer}
          disabled={loading || !isRunning}
          className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${!isRunning
            ? 'bg-charcoal/10 text-charcoal/30 dark:bg-white/10 dark:text-white/30 cursor-not-allowed'
            : 'bg-amber-500 text-white hover:bg-amber-600'
            }`}
        >
          Pause
        </Button>

        {/* Resume Button */}
        <Button
          onClick={onResumeTimer}
          disabled={loading || !isPaused}
          className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${!isPaused
            ? 'bg-charcoal/10 text-charcoal/30 dark:bg-white/10 dark:text-white/30 cursor-not-allowed'
            : 'bg-emerald-500 text-white hover:bg-emerald-600'
            }`}
        >
          Resume
        </Button>

        {/* Stop Button */}
        <Button
          onClick={onStopTimer}
          disabled={loading || (!isRunning && !isPaused)}
          className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${(!isRunning && !isPaused)
            ? 'bg-charcoal/10 text-charcoal/30 dark:bg-white/10 dark:text-white/30 cursor-not-allowed'
            : 'bg-rose-500 text-white hover:bg-rose-600'
            }`}
        >
          Stop
        </Button>

        {/* Sound Toggle */}
        <Button
          onClick={() => {
            setSoundEnabled(!soundEnabled)
            // Initialize audio context on first click
            if (!soundEnabled) initAudio()
          }}
          className={`px-3 py-2 rounded-full transition-all ${
            soundEnabled
              ? 'bg-charcoal/10 hover:bg-charcoal/20 text-charcoal dark:bg-white/10 dark:hover:bg-white/20 dark:text-white'
              : 'bg-charcoal/5 text-charcoal/30 dark:bg-white/5 dark:text-white/30'
          }`}
          title={soundEnabled ? 'Sound enabled' : 'Sound muted'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </Button>
      </div>

      {/* Warning/Critical Status */}
      {(isWarning || isCritical || isFinished) && (
        <div className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${
          isFinished ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' :
          isCritical ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 animate-pulse' :
          'bg-amber-50 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
        }`}>
          <span>{isFinished ? '✓' : isCritical ? '!' : '⏱'}</span>
          <span>
            {isFinished ? 'Time\'s up' :
             isCritical ? 'Final minute' :
             `${Math.ceil(timerState.left / 60)} min left`}
          </span>
        </div>
      )}

      {/* Judging Status */}
      {round.judgingOpen && (
        <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 text-sm">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span>Judging Open</span>
        </div>
      )}
    </div>
  )
}