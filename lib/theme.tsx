'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface BrandColors {
  primary: string
  secondary: string
  accent: string
}

interface ThemeContextType {
  eventColors: BrandColors | null
  orgColors: BrandColors | null
  useBrandColors: boolean
  setEventColors: (colors: BrandColors | null) => void
  setOrgColors: (colors: BrandColors | null) => void
  setUseBrandColors: (use: boolean) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [eventColors, setEventColors] = useState<BrandColors | null>(null)
  const [orgColors, setOrgColors] = useState<BrandColors | null>(null)
  const [useBrandColors, setUseBrandColors] = useState(false) // Default: use system theme

  // Apply colors to CSS variables
  useEffect(() => {
    const root = document.documentElement
    const colors = useBrandColors ? (eventColors || orgColors) : null
    
    if (colors) {
      root.style.setProperty('--brand-primary', colors.primary)
      root.style.setProperty('--brand-secondary', colors.secondary)
      root.style.setProperty('--brand-accent', colors.accent)
      
      // Generate lighter/darker variants
      root.style.setProperty('--brand-primary-light', adjustBrightness(colors.primary, 20))
      root.style.setProperty('--brand-primary-dark', adjustBrightness(colors.primary, -20))
      root.style.setProperty('--brand-secondary-light', adjustBrightness(colors.secondary, 20))
      root.style.setProperty('--brand-secondary-dark', adjustBrightness(colors.secondary, -20))
      root.classList.add('brand-theme')
    } else {
      // Reset to defaults
      root.style.removeProperty('--brand-primary')
      root.style.removeProperty('--brand-secondary')
      root.style.removeProperty('--brand-accent')
      root.style.removeProperty('--brand-primary-light')
      root.style.removeProperty('--brand-primary-dark')
      root.style.removeProperty('--brand-secondary-light')
      root.style.removeProperty('--brand-secondary-dark')
      root.classList.remove('brand-theme')
    }
  }, [eventColors, orgColors, useBrandColors])

  return (
    <ThemeContext.Provider value={{ eventColors, orgColors, useBrandColors, setEventColors, setOrgColors, setUseBrandColors }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + percent))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent))
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent))
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}


