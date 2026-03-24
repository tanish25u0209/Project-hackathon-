import { useState } from 'react'
import { loginUser, registerUser } from '../api'
import './PageShared.css'
import './AuthPage.css'

export default function AuthPage({ onAuthSuccess }) {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const action = mode === 'login' ? loginUser : registerUser
      const result = await action({ username, password })
      onAuthSuccess(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card card card--glow animate-fadeUp">
        <div className="auth-header">
          <h1 className="auth-title">TeamSynth AI</h1>
          <p className="auth-subtitle">Sign in to access project-based file storage</p>
        </div>

        <div className="auth-switch">
          <button
            className={`btn btn--sm ${mode === 'login' ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setMode('login')}
            type="button"
          >
            Login
          </button>
          <button
            className={`btn btn--sm ${mode === 'register' ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setMode('register')}
            type="button"
          >
            Register
          </button>
        </div>

        <form className="auth-form" onSubmit={onSubmit}>
          <input
            className="input"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            minLength={1}
            maxLength={50}
          />
          <input
            className="input"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            type="password"
            required
            minLength={6}
            maxLength={100}
          />

          {error && <p className="auth-error">{error}</p>}

          <button className="btn btn--primary" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
