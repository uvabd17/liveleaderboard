"use client"
import React from 'react'
import QRCode from 'qrcode'
import Card from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function KioskPage() {
  const [qr, setQr] = React.useState<string>('')
  const [kind, setKind] = React.useState<'team'|'individual'>('team')
  const [lastIssuedAt, setLastIssuedAt] = React.useState<number>(0)
  const [status, setStatus] = React.useState<'idle'|'issuing'|'error'|'issued'>('idle')
  const [message, setMessage] = React.useState<string>('')

  async function issue() {
    try {
      setStatus('issuing')
      setMessage('')
      const res = await fetch('/api/kiosk', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data?.token) throw new Error(data?.error || 'Failed to issue token')
      const url = `${window.location.origin}/register?token=${encodeURIComponent(data.token)}&kind=${kind}`
      const dataUrl = await QRCode.toDataURL(url, { margin: 1, scale: 8, color: { dark: '#0b1221ff', light: '#ffffffff' } })
      setQr(dataUrl)
      setLastIssuedAt(Date.now())
      setStatus('issued')
    } catch (e: any) {
      setStatus('error')
      setMessage(e?.message || 'Something went wrong')
    }
  }

  React.useEffect(() => { issue() }, [])

  return (
    <Card style={{maxWidth:720}}>
      <h2>Kiosk Mode</h2>
      <div className="small">Auto-issues a fresh single-use token for each registrant. Switch type and click Issue Token when needed.</div>
      <div role="status" aria-live="polite" className="small" style={{marginTop:6, color: status==='error' ? 'var(--bad)' : '#9aa'}}>
        {status==='issuing' ? 'Issuing token…' : status==='issued' ? 'Token issued. Ready to scan.' : (status==='error' ? message : '')}
      </div>
      <div style={{display:'flex', gap:8, marginTop:12}}>
        <label className="small" htmlFor="kind" style={{position:'absolute', left:-9999}}>Registration type</label>
        <select id="kind" aria-label="Registration type" value={kind} onChange={e=>setKind(e.target.value as any)} style={{padding:10, borderRadius:8, background:'#0e1730', color:'var(--text)'}}>
          <option value="team">Team</option>
          <option value="individual">Individual</option>
        </select>
        <Button onClick={issue} disabled={status==='issuing'}>{status==='issuing' ? 'Issuing…' : 'Issue Token'}</Button>
      </div>
      {qr && (
        <div style={{display:'flex', gap:16, alignItems:'center', marginTop:12}}>
          <img src={qr} alt={`Registration QR Code for ${kind}`} style={{ width: 280, height: 280, background: '#fff', padding: 8, borderRadius: 8 }} />
          <div>
            <div className="small">Scan to open registration. Token is single-use.</div>
            <div className="small">Last issued: {lastIssuedAt ? new Date(lastIssuedAt).toLocaleTimeString() : '—'}</div>
            <div className="small" style={{marginTop:6}}>Tip: If someone needs to switch to individual/team, change the type and reissue a token.</div>
            <div className="small" style={{marginTop:6, color:'#9aa'}}>How to: Staff should set the correct type, tap Issue Token, and ask participants to scan and complete the form. Confirm they see the success badge.</div>
          </div>
        </div>
      )}
    </Card>
  )
}
