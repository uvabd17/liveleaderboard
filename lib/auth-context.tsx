'use client'
import React from 'react'

export type UserRole = 'public' | 'judge' | 'admin'

interface AuthContextType {
  role: UserRole
  setRole: (role: UserRole) => void
}

export const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = React.useState<UserRole>('public')

  React.useEffect(() => {
    const stored = localStorage?.getItem('user-role') as UserRole
    if (stored && ['public', 'judge', 'admin'].includes(stored)) {
      setRole(stored)
    }
  }, [])

  const updateRole = (newRole: UserRole) => {
    setRole(newRole)
    localStorage?.setItem('user-role', newRole)
  }

  return (
    <AuthContext.Provider value={{ role, setRole: updateRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
