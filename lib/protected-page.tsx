'use client'
import React from 'react'
import { useAuth, type UserRole } from './auth-context'
import Card from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ProtectedPageProps {
  requiredRole: UserRole
  children: React.ReactNode
}

export function ProtectedPage({ requiredRole, children }: ProtectedPageProps) {
  const { role } = useAuth()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const roleHierarchy: Record<UserRole, number> = {
    'public': 0,
    'judge': 1,
    'admin': 2,
  }

  // Special handling: Judge console is ONLY for judges. Admins may access the judge console
  // only after they've registered as a judge via a judge invite/QR. We check a local
  // flag `user-role-judge` which is set when a user accepts a judge invite.
  if (requiredRole === 'judge' && role === 'admin') {
    try {
      const isJudgeFlag = localStorage?.getItem('user-role-judge')
      if (isJudgeFlag !== 'true') {
        return (
          <Card className="" style={{ gridColumn: 'span 12', textAlign: 'center', padding: '40px 20px' }}>
            <div className="text-6xl mb-4">⚖️</div>
            <h2 className="text-2xl font-bold text-white mb-2">Judge Console Access Restricted</h2>
            <p className="text-slate-400 mb-4">
              The judge console is only available to judges. Admins should use the admin dashboard to manage events.
            </p>
            <p className="text-sm text-slate-500 mb-6">
              If you need to access the judge console, please use a judge access code.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
              <Button onClick={() => window.location.href = '/judge/access'}>
                Access as Judge
              </Button>
              <Button variant="secondary" onClick={() => window.location.href = '/dashboard'}>
                Go to Admin Dashboard
              </Button>
            </div>
          </Card>
        )
      }
    } catch (e) {
      return (
        <Card className="" style={{ gridColumn: 'span 12', textAlign: 'center', padding: '40px 20px' }}>
          <div className="text-6xl mb-4">⚖️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Judge Console Access Restricted</h2>
          <p className="text-slate-400 mb-4">
            The judge console is only available to judges. Admins should use the admin dashboard to manage events.
          </p>
          <p className="text-sm text-slate-500 mb-6">
            If you need to access the judge console, please use a judge access code.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
            <Button onClick={() => window.location.href = '/judge/access'}>
              Access as Judge
            </Button>
            <Button variant="secondary" onClick={() => window.location.href = '/dashboard'}>
              Go to Admin Dashboard
            </Button>
          </div>
        </Card>
      )
    }
  }

  if (roleHierarchy[role] < roleHierarchy[requiredRole]) {
    return (
      <Card className="" style={{ gridColumn: 'span 12', textAlign: 'center', padding: '40px 20px' }}>
        <h2>Access Denied</h2>
        <p className="small">You need {requiredRole} access to view this page.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
          {role !== 'judge' && requiredRole === 'judge' && (
            <Button variant="secondary" onClick={() => {
              window.location.href = '/judge/access'
            }}>Access as Judge</Button>
          )}
          {role !== 'admin' && requiredRole === 'admin' && (
            <Button variant="secondary" onClick={() => {
              window.location.href = '/auth/signin'
            }}>Sign In as Admin</Button>
          )}
        </div>
      </Card>
    )
  }

  return <>{children}</>
}
