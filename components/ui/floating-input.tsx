'use client'

import * as React from "react"
import { cn } from "@/lib/utils"

// ═══════════════════════════════════════════════════════════════
// FLOATING LABEL INPUT SYSTEM
// Minimal, elegant floating labels with smooth animations
// ═══════════════════════════════════════════════════════════════

export interface FloatingInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}

const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ className, type, label, error, hint, id, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const [hasValue, setHasValue] = React.useState(false)
    const inputId = id || React.useId()

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true)
      props.onFocus?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)
      setHasValue(!!e.target.value)
      props.onBlur?.(e)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(!!e.target.value)
      props.onChange?.(e)
    }

    // Check initial value
    React.useEffect(() => {
      if (props.value || props.defaultValue) {
        setHasValue(true)
      }
    }, [props.value, props.defaultValue])

    const isActive = isFocused || hasValue

    return (
      <div className="relative w-full">
        <div className="relative">
          <input
            type={type}
            id={inputId}
            className={cn(
              // Base styles
              "peer w-full px-4 pt-6 pb-2 text-base bg-transparent rounded-lg",
              "border transition-all duration-150",
              // Light mode
              "border-charcoal/20 text-charcoal placeholder-transparent",
              "focus:border-charcoal focus:outline-none focus:ring-0",
              // Dark mode
              "dark:border-white/20 dark:text-white",
              "dark:focus:border-white",
              // Error state
              error && "border-red-500 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400",
              // Disabled
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-charcoal/5 dark:disabled:bg-white/5",
              className
            )}
            placeholder={label}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
          <label
            htmlFor={inputId}
            className={cn(
              // Base styles
              "absolute left-4 transition-all duration-150 pointer-events-none",
              "text-charcoal/50 dark:text-white/50",
              // Floating state
              isActive
                ? "top-2 text-xs font-medium text-charcoal/70 dark:text-white/70"
                : "top-1/2 -translate-y-1/2 text-base",
              // Focus state color
              isFocused && !error && "text-charcoal dark:text-white",
              // Error state
              error && "text-red-500 dark:text-red-400"
            )}
          >
            {label}
            {props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        </div>
        {/* Error message */}
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs text-red-500 dark:text-red-400">
            {error}
          </p>
        )}
        {/* Hint text */}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-charcoal/40 dark:text-white/40">
            {hint}
          </p>
        )}
      </div>
    )
  }
)
FloatingInput.displayName = "FloatingInput"

// ═══════════════════════════════════════════════════════════════
// FLOATING LABEL TEXTAREA
// ═══════════════════════════════════════════════════════════════

export interface FloatingTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  hint?: string
}

const FloatingTextarea = React.forwardRef<HTMLTextAreaElement, FloatingTextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const [hasValue, setHasValue] = React.useState(false)
    const inputId = id || React.useId()

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(true)
      props.onFocus?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(false)
      setHasValue(!!e.target.value)
      props.onBlur?.(e)
    }

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setHasValue(!!e.target.value)
      props.onChange?.(e)
    }

    React.useEffect(() => {
      if (props.value || props.defaultValue) {
        setHasValue(true)
      }
    }, [props.value, props.defaultValue])

    const isActive = isFocused || hasValue

    return (
      <div className="relative w-full">
        <div className="relative">
          <textarea
            id={inputId}
            className={cn(
              // Base styles
              "peer w-full px-4 pt-6 pb-2 text-base bg-transparent rounded-lg resize-none",
              "border transition-all duration-150 min-h-[100px]",
              // Light mode
              "border-charcoal/20 text-charcoal placeholder-transparent",
              "focus:border-charcoal focus:outline-none focus:ring-0",
              // Dark mode
              "dark:border-white/20 dark:text-white",
              "dark:focus:border-white",
              // Error state
              error && "border-red-500 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400",
              // Disabled
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-charcoal/5 dark:disabled:bg-white/5",
              className
            )}
            placeholder={label}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
          <label
            htmlFor={inputId}
            className={cn(
              // Base styles
              "absolute left-4 transition-all duration-150 pointer-events-none",
              "text-charcoal/50 dark:text-white/50",
              // Floating state - always at top for textarea
              isActive
                ? "top-2 text-xs font-medium text-charcoal/70 dark:text-white/70"
                : "top-4 text-base",
              // Focus state color
              isFocused && !error && "text-charcoal dark:text-white",
              // Error state
              error && "text-red-500 dark:text-red-400"
            )}
          >
            {label}
            {props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        </div>
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs text-red-500 dark:text-red-400">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-charcoal/40 dark:text-white/40">
            {hint}
          </p>
        )}
      </div>
    )
  }
)
FloatingTextarea.displayName = "FloatingTextarea"

// ═══════════════════════════════════════════════════════════════
// NUMBER STEPPER INPUT
// [ - ]  value  [ + ] with hold-to-repeat
// ═══════════════════════════════════════════════════════════════

export interface NumberStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  error?: string
  disabled?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const NumberStepper = React.forwardRef<HTMLDivElement, NumberStepperProps>(
  ({ value, onChange, min = 0, max = 999, step = 1, label, error, disabled, className, size = 'md' }, ref) => {
    const intervalRef = React.useRef<NodeJS.Timeout | null>(null)
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

    const increment = React.useCallback(() => {
      onChange(Math.min(max, value + step))
    }, [value, max, step, onChange])

    const decrement = React.useCallback(() => {
      onChange(Math.max(min, value - step))
    }, [value, min, step, onChange])

    const startHold = (action: () => void) => {
      if (disabled) return
      action()
      // Start repeating after 300ms delay, then every 100ms (fast)
      timeoutRef.current = setTimeout(() => {
        intervalRef.current = setInterval(action, 100)
      }, 300)
    }

    const stopHold = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    // Cleanup on unmount
    React.useEffect(() => {
      return () => stopHold()
    }, [])

    const sizeClasses = {
      sm: { button: 'w-8 h-8 text-sm', value: 'w-12 text-sm', wrapper: 'gap-1' },
      md: { button: 'w-10 h-10 text-base', value: 'w-16 text-lg', wrapper: 'gap-2' },
      lg: { button: 'w-12 h-12 text-lg', value: 'w-20 text-xl', wrapper: 'gap-3' },
    }

    const sizes = sizeClasses[size]

    return (
      <div ref={ref} className={cn("flex flex-col", className)}>
        {label && (
          <label className="text-sm font-medium text-charcoal/70 dark:text-white/70 mb-2">
            {label}
          </label>
        )}
        <div className={cn("flex items-center", sizes.wrapper)}>
          {/* Decrement button */}
          <button
            type="button"
            onMouseDown={() => startHold(decrement)}
            onMouseUp={stopHold}
            onMouseLeave={stopHold}
            onTouchStart={() => startHold(decrement)}
            onTouchEnd={stopHold}
            disabled={disabled || value <= min}
            className={cn(
              sizes.button,
              "flex items-center justify-center rounded-lg",
              "border border-charcoal/20 dark:border-white/20",
              "bg-transparent hover:bg-charcoal/5 dark:hover:bg-white/5",
              "text-charcoal dark:text-white",
              "transition-all duration-150 select-none",
              "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            )}
            aria-label="Decrease"
          >
            −
          </button>

          {/* Value display */}
          <div
            className={cn(
              sizes.value,
              "text-center font-semibold",
              "text-charcoal dark:text-white"
            )}
          >
            {value}
          </div>

          {/* Increment button */}
          <button
            type="button"
            onMouseDown={() => startHold(increment)}
            onMouseUp={stopHold}
            onMouseLeave={stopHold}
            onTouchStart={() => startHold(increment)}
            onTouchEnd={stopHold}
            disabled={disabled || value >= max}
            className={cn(
              sizes.button,
              "flex items-center justify-center rounded-lg",
              "border border-charcoal/20 dark:border-white/20",
              "bg-transparent hover:bg-charcoal/5 dark:hover:bg-white/5",
              "text-charcoal dark:text-white",
              "transition-all duration-150 select-none",
              "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            )}
            aria-label="Increase"
          >
            +
          </button>
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{error}</p>
        )}
      </div>
    )
  }
)
NumberStepper.displayName = "NumberStepper"

// ═══════════════════════════════════════════════════════════════
// SCORE INPUT
// Stepper with optional visual progress bar
// ═══════════════════════════════════════════════════════════════

export interface ScoreInputProps extends Omit<NumberStepperProps, 'size'> {
  showBar?: boolean
  barColor?: string
}

const ScoreInput = React.forwardRef<HTMLDivElement, ScoreInputProps>(
  ({ value, onChange, min = 0, max = 100, step = 1, label, error, disabled, className, showBar = true, barColor }, ref) => {
    const percentage = ((value - min) / (max - min)) * 100

    return (
      <div ref={ref} className={cn("flex flex-col", className)}>
        {label && (
          <label className="text-sm font-medium text-charcoal/70 dark:text-white/70 mb-2">
            {label}
          </label>
        )}
        
        <NumberStepper
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          size="lg"
        />

        {/* Visual progress bar */}
        {showBar && (
          <div className="mt-3 h-2 rounded-full bg-charcoal/10 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-150"
              style={{
                width: `${percentage}%`,
                backgroundColor: barColor || (percentage > 66 ? '#188A4A' : percentage > 33 ? '#E5A800' : '#EF4444')
              }}
            />
          </div>
        )}

        {error && (
          <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{error}</p>
        )}
      </div>
    )
  }
)
ScoreInput.displayName = "ScoreInput"

// ═══════════════════════════════════════════════════════════════
// FLOATING SELECT
// Floating label for select dropdowns
// ═══════════════════════════════════════════════════════════════

export interface FloatingSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  hint?: string
  options: Array<{ value: string; label: string }>
}

const FloatingSelect = React.forwardRef<HTMLSelectElement, FloatingSelectProps>(
  ({ className, label, error, hint, id, options, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const inputId = id || React.useId()
    const hasValue = !!props.value

    return (
      <div className="relative w-full">
        <div className="relative">
          <select
            id={inputId}
            className={cn(
              // Base styles
              "peer w-full px-4 pt-6 pb-2 text-base bg-transparent rounded-lg appearance-none",
              "border transition-all duration-150",
              // Light mode
              "border-charcoal/20 text-charcoal",
              "focus:border-charcoal focus:outline-none focus:ring-0",
              // Dark mode
              "dark:border-white/20 dark:text-white dark:bg-transparent",
              "dark:focus:border-white",
              // Error state
              error && "border-red-500 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400",
              // Disabled
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-charcoal/5 dark:disabled:bg-white/5",
              className
            )}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          >
            <option value="" disabled className="text-charcoal/50">
              Select...
            </option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="text-charcoal dark:text-white bg-white dark:bg-slate-800">
                {opt.label}
              </option>
            ))}
          </select>
          <label
            htmlFor={inputId}
            className={cn(
              // Base styles
              "absolute left-4 transition-all duration-150 pointer-events-none",
              "text-charcoal/50 dark:text-white/50",
              // Always floating for select
              "top-2 text-xs font-medium",
              // Focus state color
              isFocused && !error && "text-charcoal dark:text-white",
              // Error state
              error && "text-red-500 dark:text-red-400"
            )}
          >
            {label}
            {props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          {/* Dropdown arrow */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-charcoal/50 dark:text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs text-red-500 dark:text-red-400">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-charcoal/40 dark:text-white/40">
            {hint}
          </p>
        )}
      </div>
    )
  }
)
FloatingSelect.displayName = "FloatingSelect"

export { FloatingInput, FloatingTextarea, NumberStepper, ScoreInput, FloatingSelect }
