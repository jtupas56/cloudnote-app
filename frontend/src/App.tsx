import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import './App.css'
import { supabase } from './lib/supabase'

type AuthMode = 'sign-in' | 'sign-up'
type BackendAccount = { id: string; email: string | null }

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function isBackendAccount(value: unknown): value is BackendAccount {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'email' in value &&
    (typeof value.email === 'string' || value.email === null)
  )
}

function responseDetail(value: unknown) {
  return typeof value === 'object' &&
    value !== null &&
    'detail' in value &&
    typeof value.detail === 'string'
    ? value.detail
    : null
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(Boolean(supabase))
  const [backendAccount, setBackendAccount] = useState<BackendAccount | null>(null)
  const [backendError, setBackendError] = useState<string | null>(null)
  const [checkingBackend, setCheckingBackend] = useState(false)

  useEffect(() => {
    if (!supabase) {
      return
    }

    const client = supabase
    let active = true
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user ?? null)
    })

    async function loadSession() {
      try {
        const { data, error: sessionError } = await client.auth.getSession()
        if (!active) return
        if (sessionError) throw sessionError
        setUser(data.session?.user ?? null)
      } catch (caughtError) {
        if (active) setError(errorMessage(caughtError, 'Could not load your session.'))
      } finally {
        if (active) setInitializing(false)
      }
    }

    void loadSession()
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return

    setError(null)
    setNotice(null)
    setLoading(true)

    try {
      const request =
        mode === 'sign-up'
          ? supabase.auth.signUp({
              email,
              password,
              options: { emailRedirectTo: window.location.origin },
            })
          : supabase.auth.signInWithPassword({
              email,
              password,
            })
      const { data, error } = await request
      if (error) throw error
      if (mode === 'sign-up' && !data.session) {
        setNotice('Check your email for a confirmation link to finish signing up.')
      }
    } catch (caughtError) {
      setError(errorMessage(caughtError, 'The authentication request could not be completed.'))
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    if (!supabase) return

    setError(null)
    setLoading(true)
    try {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError
      setBackendAccount(null)
      setBackendError(null)
    } catch (caughtError) {
      setError(errorMessage(caughtError, 'Could not sign out.'))
    } finally {
      setLoading(false)
    }
  }

  async function verifyBackendAccount() {
    if (!supabase) return

    setCheckingBackend(true)
    setBackendAccount(null)
    setBackendError(null)
    try {
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      const accessToken = data.session?.access_token
      if (!accessToken) throw new Error('Sign in before checking the backend.')

      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const result: unknown = await response.json()
      if (!response.ok)
        throw new Error(responseDetail(result) ?? 'The backend could not verify the account.')
      if (!isBackendAccount(result)) throw new Error('The backend returned an invalid account.')
      setBackendAccount(result)
    } catch (caughtError) {
      setBackendError(errorMessage(caughtError, 'The backend account check failed.'))
    } finally {
      setCheckingBackend(false)
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode)
    setError(null)
    setNotice(null)
  }

  return (
    <main className="app">
      <p className="eyebrow">Cloudnote</p>
      <p className="description">
        {user
          ? 'Your account is ready.'
          : 'Sign in or create an account with your email and password.'}
      </p>

      {!supabase ? (
        <section className="status error-message" role="alert">
          Supabase is not configured. Add VITE_SUPABASE_URL and
          VITE_SUPABASE_PUBLISHABLE_KEY to frontend/.env.local, then restart
          the frontend.
        </section>
      ) : initializing ? (
        <section className="status" aria-live="polite">
          <p>Loading your account…</p>
        </section>
      ) : user ? (
        <section className="status account-panel" aria-live="polite">
          <p className="account-email">{user.email}</p>
          <button
            className="submit-button"
            type="button"
            onClick={() => void verifyBackendAccount()}
            disabled={checkingBackend}
          >
            {checkingBackend ? 'Checking backend…' : 'Test FastAPI account lookup'}
          </button>
          {backendAccount && (
            <p className="success-message" role="status">
              FastAPI verified: {backendAccount.email} (ID: {backendAccount.id})
            </p>
          )}
          {backendError && (
            <p className="error-message" role="alert">
              {backendError}
            </p>
          )}
          <button
            className="submit-button"
            type="button"
            onClick={() => void handleSignOut()}
            disabled={loading}
          >
            {loading ? 'Signing out…' : 'Sign out'}
          </button>
        </section>
      ) : (
        <section className="auth-panel">
          <div className="mode-switch" aria-label="Authentication mode">
            <button
              className={mode === 'sign-in' ? 'mode-button active' : 'mode-button'}
              type="button"
              onClick={() => changeMode('sign-in')}
              aria-pressed={mode === 'sign-in'}
            >
              Sign in
            </button>
            <button
              className={mode === 'sign-up' ? 'mode-button active' : 'mode-button'}
              type="button"
              onClick={() => changeMode('sign-up')}
              aria-pressed={mode === 'sign-up'}
            >
              Create account
            </button>
          </div>

          <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
            <label htmlFor="email">Email</label>
            <input
              autoComplete="email"
              id="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />

            <label htmlFor="password">Password</label>
            <input
              autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
              id="password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />

            {error && (
              <p className="form-message error-message" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="form-message success-message" role="status">
                {notice}
              </p>
            )}

            <button className="submit-button" type="submit" disabled={loading}>
              {loading
                ? 'Please wait…'
                : mode === 'sign-up'
                  ? 'Create account'
                  : 'Sign in'}
            </button>
          </form>

          <p className="mode-prompt">
            {mode === 'sign-in' ? 'New to Cloudnote?' : 'Already have an account?'}{' '}
            <button
              className="text-button"
              type="button"
              onClick={() =>
                changeMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')
              }
            >
              {mode === 'sign-in' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </section>
      )}
    </main>
  )
}

export default App
