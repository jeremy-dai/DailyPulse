'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/utils/supabase/client'

type Flow = 'login' | 'signup'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [flow, setFlow] = useState<Flow>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  function setStatus(msg: string, error = false) {
    setMessage(msg)
    setIsError(error)
  }

  function switchFlow(f: Flow) {
    setFlow(f)
    setMessage('')
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { full_name: displayName },
      },
    })

    if (error) {
      setStatus(error.message, true)
    } else {
      if (data.user && displayName.trim()) {
        await supabase
          .from('profiles')
          .upsert({ id: data.user.id, email, name: displayName.trim() })
      }
      setStatus('Check your email for a confirmation link!')
    }
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
    <div className="flex min-h-screen bg-[#0a0a0b]">
      {/* ── Left brand panel ── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
        {/* Animated mesh gradient */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-transparent to-cyan-500/10" />
          <div className="absolute top-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-emerald-500/8 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-cyan-500/8 blur-[100px] animate-pulse [animation-delay:2s]" />
          <div className="absolute top-[40%] left-[30%] h-[300px] w-[300px] rounded-full bg-emerald-400/5 blur-[80px] animate-pulse [animation-delay:4s]" />
        </div>

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(255 255 255)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e\")",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-start w-full p-12 xl:p-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400 shadow-lg shadow-emerald-500/20">
              <PulseIcon className="h-4.5 w-4.5 text-black" />
            </div>
            <span className="text-lg font-semibold text-white tracking-tight">DailyPulse</span>
          </div>

          {/* Hero */}
          <div className="max-w-lg mx-auto text-center flex-1 flex flex-col justify-center">
            <h1 className="text-5xl xl:text-6xl font-bold tracking-tight text-white leading-[1.1]">
              Know your team&apos;s pulse,{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                every day.
              </span>
            </h1>
            <p className="mt-5 text-lg text-zinc-400 leading-relaxed max-w-md">
              A lightweight daily check-in tool that keeps distributed teams aligned — without the meeting overhead.
            </p>

            <div className="mt-10 flex flex-col gap-4">
              {[
                { icon: <ZapIcon />, label: 'Daily status in under 30 seconds' },
                { icon: <UsersIcon />, label: 'See your whole team at a glance' },
                { icon: <BellIcon />, label: 'Smart nudges, not noise' },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-3 group">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] border border-white/[0.06] text-emerald-400 transition-colors group-hover:bg-emerald-400/10">
                    {icon}
                  </div>
                  <span className="text-sm text-zinc-300">{label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-10 lg:p-16 bg-[#0f0f11] lg:border-l border-white/[0.06]">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="mb-10 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400 shadow-lg shadow-emerald-500/20">
                <PulseIcon className="h-4.5 w-4.5 text-black" />
              </div>
              <span className="text-lg font-semibold text-white tracking-tight">DailyPulse</span>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              {flow === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              {flow === 'login'
                ? 'Enter your credentials to access your dashboard.'
                : 'Start your free account and get your team aligned.'}
            </p>
          </div>

          {/* Google */}
          <button
            onClick={handleGoogleLogin}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-white/[0.06] hover:border-white/[0.12] active:scale-[0.98]"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/[0.06]" />
            <span className="text-xs text-zinc-600 uppercase tracking-wider">or</span>
            <div className="h-px flex-1 bg-white/[0.06]" />
          </div>

          {/* Email form */}
          <form className="space-y-4" onSubmit={flow === 'login' ? handleLogin : handleSignUp}>
            {flow === 'signup' && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Display name
                </label>
                <input
                  type="text"
                  placeholder="Jeremy"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={loading}
                  className={inputCls}
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Email</label>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className={inputCls}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className={inputCls}
              />
            </div>

            {flow === 'login' && (
              <div className="flex justify-end">
                <button type="button" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-400 py-2.5 text-sm font-semibold text-black transition-all hover:bg-emerald-300 active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-emerald-500/20"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner />
                  {flow === 'login' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : (
                flow === 'login' ? 'Sign in' : 'Create account'
              )}
            </button>
          </form>

          {/* Status */}
          {message && (
            <div className={`mt-4 flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs ${
              isError
                ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            }`}>
              <span className="mt-0.5 shrink-0">{isError ? '!' : '\u2713'}</span>
              <span>{message}</span>
            </div>
          )}

          {/* Switch flow */}
          <p className="mt-6 text-center text-sm text-zinc-500">
            {flow === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => switchFlow(flow === 'login' ? 'signup' : 'login')}
              className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              {flow === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>

          {/* Terms */}
          <p className="mt-8 text-center text-[11px] text-zinc-600 leading-relaxed">
            By continuing, you agree to our{' '}
            <span className="text-zinc-500 hover:text-zinc-400 cursor-pointer transition-colors">Terms of Service</span>
            {' '}and{' '}
            <span className="text-zinc-500 hover:text-zinc-400 cursor-pointer transition-colors">Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  )
}

const inputCls =
  'w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-white outline-none transition-all placeholder:text-zinc-600 focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/10 focus:bg-white/[0.05] disabled:opacity-50'

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function PulseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  )
}

function ZapIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}
