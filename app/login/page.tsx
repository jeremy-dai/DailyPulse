'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/utils/supabase/client'
import { GridBackground } from '@/components/ui/grid-background'

type Tab = 'email' | 'google'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  function setStatus(msg: string, error = false) {
    setMessage(msg)
    setIsError(error)
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    if (error) setStatus(error.message, true)
    else setStatus('Check your email for a confirmation link!')
    setLoading(false)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) setStatus(error.message, true)
    else router.push('/')
    setLoading(false)
  }

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <GridBackground className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md rounded-2xl bg-background/60 backdrop-blur-xl p-8 shadow-sm border border-border/50">
        <h1 className="mb-6 text-center text-2xl font-bold tracking-tight text-foreground">
          DailyPulse
        </h1>

        {/* Tab switcher */}
        <div className="mb-6 flex rounded-xl bg-muted/50 p-1">
          {(['email', 'google'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-200 ${
                tab === t
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'email' ? 'Email / Password' : 'Google OAuth'}
            </button>
          ))}
        </div>

        {tab === 'email' && (
          <form className="space-y-4">
            <input
              type="email"
              placeholder="you@kawo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full rounded-xl border border-border/50 bg-background/50 px-4 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 disabled:opacity-50 transition-all placeholder:text-muted-foreground"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full rounded-xl border border-border/50 bg-background/50 px-4 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 disabled:opacity-50 transition-all placeholder:text-muted-foreground"
            />
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleLogin}
                disabled={loading}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? 'Loading…' : 'Log in'}
              </button>
              <button
                type="button"
                onClick={handleSignUp}
                disabled={loading}
                className="flex-1 rounded-xl border border-border/50 bg-background/50 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-muted/50 disabled:opacity-50"
              >
                {loading ? 'Loading…' : 'Sign up'}
              </button>
            </div>
          </form>
        )}

        {tab === 'google' && (
          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Enable Google OAuth in Supabase → Auth → Providers first.
            </p>
            <button
              onClick={handleGoogleLogin}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-border/50 bg-background/50 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-muted/50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>
          </div>
        )}

        {message && (
          <p
            className={`mt-4 text-center text-sm ${
              isError ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </GridBackground>
  )
}
