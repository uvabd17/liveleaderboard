'use client'

import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './auth-context'
import { ThemeProvider as BrandThemeProvider } from './theme'
import { ThemeProvider as DarkModeProvider } from '@/components/theme-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthProvider>
        <DarkModeProvider>
          <BrandThemeProvider>
            {children}
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1E293B',
                  color: '#F1F5F9',
                  border: '1px solid #334155',
                },
              }}
            />
          </BrandThemeProvider>
        </DarkModeProvider>
      </AuthProvider>
    </SessionProvider>
  )
}
