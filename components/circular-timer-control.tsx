'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

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
}

export function CircularTimerControl({
  round,
  roundIdx,
  currentRoundIdx,
  onStartTimer,
  onPauseTimer,
  onResumeTimer,
  onStopTimer,
  loading = false
}: CircularTimerControlProps) {
  const [currentTime, setCurrentTime] = useState(Date.now())

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
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const progress = timerState.total > 0 ? ((timerState.total - timerState.left) / timerState.total) * 100 : 0
  const isCurrentRound = roundIdx === currentRoundIdx
  const isRunning = timerState.running
  const isPaused = timerState.paused

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
            strokeWidth="8"
            fill="none"
            className="text-slate-600"
          />
          {/* Progress Circle */}
          <circle
            cx="64"
            cy="64"
            r="60"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 60}`}
            strokeDashoffset={`${2 * Math.PI * 60 * (1 - progress / 100)}`}
            className={`transition-all duration-1000 ${
              isRunning ? 'text-blue-500' :
              isPaused ? 'text-yellow-500' :
              'text-slate-500'
            }`}
          />
        </svg>

        {/* Timer Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`text-lg font-mono font-bold ${
            isRunning ? 'text-blue-400' :
            isPaused ? 'text-yellow-400' :
            'text-slate-400'
          }`}>
            {formatTime(timerState.left)}
          </div>
        </div>
      </div>

      {/* Round Info */}
      <div className="text-center">
        <div className="text-sm font-medium text-white">{round.name}</div>
        <div className="text-xs text-slate-400">
          Round {roundIdx + 1} • {round.roundDurationMinutes}m
        </div>
      </div>

      {/* Control Buttons - Horizontal Layout */}
      <div className="flex gap-2 justify-center">
        {/* Start Button */}
        <Button
          onClick={onStartTimer}
          disabled={loading || isRunning || !isCurrentRound}
          className={`px-4 py-2 text-sm font-medium rounded ${
            isRunning
              ? 'bg-blue-900 text-blue-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          Start
        </Button>

        {/* Pause Button */}
        <Button
          onClick={onPauseTimer}
          disabled={loading || !isRunning || !isCurrentRound}
          className={`px-4 py-2 text-sm font-medium rounded ${
            !isRunning
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-yellow-600 hover:bg-yellow-700 text-white'
          }`}
        >
          Pause
        </Button>

        {/* Resume Button */}
        <Button
          onClick={onResumeTimer}
          disabled={loading || !isPaused || !isCurrentRound}
          className={`px-4 py-2 text-sm font-medium rounded ${
            !isPaused
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          Resume
        </Button>

        {/* Stop Button */}
        <Button
          onClick={onStopTimer}
          disabled={loading || (!isRunning && !isPaused) || !isCurrentRound}
          className={`px-4 py-2 text-sm font-medium rounded ${
            (!isRunning && !isPaused)
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          Stop
        </Button>
      </div>

      {/* Judging Status */}
      {round.judgingOpen && (
        <div className="flex items-center space-x-2 text-green-400 text-sm">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>Judging Open</span>
        </div>
      )}
    </div>
  )
}