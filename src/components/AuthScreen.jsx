import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthScreen() {
  const [mode, setMode]         = useState('signin')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus]     = useState(null) // { msg, type }
  const [loading, setLoading]   = useState(false)

  function showStatus(msg, type) { setStatus({ msg, type }) }
  function clearStatus()         { setStatus(null) }

  function switchTab(m) {
    setMode(m)
    clearStatus()
  }

  async function submitAuth() {
    if (!email || !password) { showStatus('Please enter email and password.', 'error'); return }
    setLoading(true)
    try {
      let result
      if (mode === 'signin') {
        result = await supabase.auth.signInWithPassword({ email, password })
      } else {
        result = await supabase.auth.signUp({ email, password })
      }
      if (result.error) throw result.error
      if (mode === 'signup' && !result.data.session) {
        showStatus('✓ Account created! Check your email to confirm, then sign in.', 'ok')
        switchTab('signin')
      }
      // onAuthStateChange in App handles the rest
    } catch (e) {
      showStatus(e.message, 'error')
    }
    setLoading(false)
  }

  async function sendMagicLink() {
    if (!email) { showStatus('Enter your email first.', 'error'); return }
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) { showStatus(error.message, 'error'); return }
    showStatus('✓ Magic link sent! Check your email.', 'ok')
  }

  const statusStyle = status ? {
    ok:    { background:'rgba(201,168,76,0.1)',   color:'var(--gold)',   border:'1px solid rgba(201,168,76,0.3)' },
    error: { background:'rgba(192,57,43,0.1)',    color:'#e74c3c',       border:'1px solid rgba(192,57,43,0.3)' },
  }[status.type] : {}

  return (
    <div id="authScreen">
      <div className="auth-box">
        <div className="auth-logo">
          <div className="auth-logo-text">The Vault</div>
          <div className="auth-logo-sub">Watch Collection</div>
        </div>
        <div className="auth-body">
          <div className="auth-tabs">
            <button className={`auth-tab${mode === 'signin' ? ' active' : ''}`} onClick={() => switchTab('signin')}>Sign In</button>
            <button className={`auth-tab${mode === 'signup' ? ' active' : ''}`} onClick={() => switchTab('signup')}>Create Account</button>
          </div>

          {status && (
            <div className="auth-status" style={statusStyle}>{status.msg}</div>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitAuth()}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitAuth()}
            />
          </div>

          <button
            className="btn-submit"
            style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
            onClick={submitAuth}
            disabled={loading}
          >
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button
              onClick={sendMagicLink}
              style={{ background:'none', border:'none', color:'var(--text-dim)', fontSize:'11px', cursor:'pointer', letterSpacing:'.05em', textDecoration:'underline' }}
            >
              Send magic link instead
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
