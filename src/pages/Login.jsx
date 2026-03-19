import { useState } from 'react'

export default function Login({ onSignIn }) {
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
              placeholder="you@legalleads.com"
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
        </div>
      </div>
    </div>
  )
}
