import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import './App.css'
import { supabase } from './lib/supabase'

type AuthMode = 'sign-in' | 'sign-up'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(Boolean(supabase))

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
        if (active) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : 'Could not load your session.',
          )
        }
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
      if (mode === 'sign-up') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        })
        if (signUpError) throw signUpError
        if (!data.session) {
          setNotice('Check your email for a confirmation link to finish signing up.')
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) throw signInError
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'The authentication request could not be completed.',
      )
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
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Could not sign out.',
      )
    } finally {
      setLoading(false)
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
      <h1>{user ? 'You’re signed in' : 'Your notes, in the cloud'}</h1>
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
