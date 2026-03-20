import { useState } from 'react'

export default function Login({ onSignIn, onDemo }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    setStatus(null)

    const { error } = await onSignIn(email)

    if (error) {
      setStatus({ type: 'error', message: error.message })
    } else {
      setStatus({ type: 'success', message: 'Check your email for a login link.' })
    }
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-icon">LL</div>
          <h1>LegalLeads Operations</h1>
          <p>Sign in with your team email</p>
        </div>

        <div className="login-form">
          <div>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="you@lucrativelegal.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
              autoFocus
            />
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px' }}
            onClick={handleSubmit}
            disabled={loading || !email}
          >
            {loading ? 'Sending...' : 'Send magic link'}
          </button>

          {status && (
            <div className={`login-status ${status.type}`}>
              {status.message}
            </div>
          )}

          {/* Divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            margin: '8px 0',
          }}>
            <div style={{ flex: 1, height: 1, background: 'var(--slate-200)' }} />
            <span style={{ fontSize: 12, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--slate-200)' }} />
          </div>

          {/* Demo Button */}
          <button
            onClick={onDemo}
            style={{
              width: '100%', padding: '12px',
              background: 'transparent',
              border: '2px solid var(--brand-200)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--brand-600)',
              fontSize: 14, fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 150ms ease',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => { e.target.style.background = 'var(--brand-50)'; e.target.style.borderColor = 'var(--brand-400)' }}
            onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'var(--brand-200)' }}
          >
            View Demo Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}