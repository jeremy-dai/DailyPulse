'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/app/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn, getInitials } from '@/lib/utils'
import type { Profile, DailyLog, WorkStatus } from '@/types/supabase'

import { motion } from 'framer-motion'

type StatusTone = 'in_office' | 'wfh' | 'off' | 'unknown'

const STATUS_COLORS: Record<StatusTone, { bg: string, text: string, border: string, ring: string, fallback: string, dot: string, inputOutline: string }> = {
  in_office: { bg: 'bg-[var(--status-emerald-bg)]/20', text: 'text-[var(--status-emerald-text)]', border: 'border-[var(--status-emerald-border)]/50', ring: 'ring-[var(--status-emerald-bg)]/80', fallback: 'bg-[var(--status-emerald-bg)]/20 text-[var(--status-emerald-text)]', dot: 'bg-[var(--status-emerald-dot)]', inputOutline: 'border-[var(--status-emerald-border)]/50 focus:border-[var(--status-emerald-border)]/80 focus:ring-[var(--status-emerald-bg)]/20' },
  wfh: { bg: 'bg-[var(--status-sky-bg)]/20', text: 'text-[var(--status-sky-text)]', border: 'border-[var(--status-sky-border)]/50', ring: 'ring-[var(--status-sky-bg)]/80', fallback: 'bg-[var(--status-sky-bg)]/20 text-[var(--status-sky-text)]', dot: 'bg-[var(--status-sky-dot)]', inputOutline: 'border-[var(--status-sky-border)]/50 focus:border-[var(--status-sky-border)]/80 focus:ring-[var(--status-sky-bg)]/20' },
  off: { bg: 'bg-[var(--status-zinc-bg)]/20', text: 'text-[var(--status-zinc-text)]', border: 'border-[var(--status-zinc-border)]/50', ring: 'ring-[var(--status-zinc-bg)]/80', fallback: 'bg-[var(--status-zinc-bg)]/20 text-[var(--status-zinc-text)]', dot: 'bg-[var(--status-zinc-dot)]', inputOutline: 'border-[var(--status-zinc-border)]/50 focus:border-[var(--status-zinc-border)]/80 focus:ring-[var(--status-zinc-bg)]/20' },
  unknown: { bg: 'bg-[var(--status-rose-bg)]/20', text: 'text-[var(--status-rose-text)]', border: 'border-[var(--status-rose-border)]/50', ring: 'ring-[var(--status-rose-bg)]/80', fallback: 'bg-[var(--status-rose-bg)]/20 text-[var(--status-rose-text)]', dot: 'bg-[var(--status-rose-dot)]', inputOutline: 'border-[var(--status-rose-border)]/50 focus:border-[var(--status-rose-border)]/80 focus:ring-[var(--status-rose-bg)]/20' },
}

const STATUS_LABELS: Record<WorkStatus, string> = {
  in_office: 'In Office',
  wfh: 'Work From Home',
  off: 'Off',
  sick: 'Sick',
  vacation: 'Vacation',
}

const getStatusTone = (status: WorkStatus | null): StatusTone => {
  if (!status) return 'unknown'
  if (status === 'in_office' || status === 'wfh') return status
  return 'off'
}

interface Props {
  date: string
  initialProfiles: Profile[]
  logs: DailyLog[]
  onLogUpsert: (log: DailyLog) => void
}

function ScrollFade({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [fade, setFade] = useState(false)

  const check = () => {
    const el = ref.current
    if (!el) return
    setFade(el.scrollHeight > el.clientHeight + 2 && el.scrollTop + el.clientHeight < el.scrollHeight - 2)
  }

  useEffect(() => {
    check()
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="relative h-16">
      <div ref={ref} className="h-full overflow-y-auto" onScroll={check}>
        {children}
      </div>
      {fade && (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-t from-card to-transparent" />
      )}
    </div>
  )
}

export default function DailyLogs({ date, initialProfiles, logs, onLogUpsert }: Props) {
  const supabase = createClient()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const isComposing = useRef(false)
  const inputValueRef = useRef('')
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const shouldUpdateInputRef = useRef(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id)
    })
  }, [supabase])

  // Update input value when current user changes or logs update
  useEffect(() => {
    if (currentUserId && shouldUpdateInputRef.current) {
      const log = logs.find((l) => l.user_id === currentUserId)
      const next = log?.activities ?? ''
      setInputValue(next)
      inputValueRef.current = next
    }
  }, [currentUserId, logs])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  const save = async (activitiesOverride?: string) => {
    if (!currentUserId) return
    const activities = activitiesOverride ?? inputValueRef.current

    shouldUpdateInputRef.current = false
    setSaveStatus('saving')
    const log = logs.find((l) => l.user_id === currentUserId)

    try {
      if (log) {
        const now = new Date().toISOString()
        const { data } = await supabase
          .from('daily_logs')
          .update({
            activities,
            updated_at: now,
            ...(activities && !log.activities_at ? { activities_at: now } : {}),
          })
          .eq('id', log.id)
          .select()
          .single()
        if (data) {
          onLogUpsert(data)
          setSaveStatus('saved')
          setLastSaved(new Date())
        }
      } else {
        const now = new Date().toISOString()
        const { data } = await supabase
          .from('daily_logs')
          .upsert(
            { user_id: currentUserId, date, activities, ...(activities ? { activities_at: now } : {}) },
            { onConflict: 'user_id,date' }
          )
          .select()
          .single()
        if (data) {
          onLogUpsert(data)
          setSaveStatus('saved')
          setLastSaved(new Date())
        }
      }
    } catch (error) {
      console.error('Save error:', error)
      setSaveStatus('error')
    } finally {
      shouldUpdateInputRef.current = true
    }

    // Reset status after 3 seconds
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      setSaveStatus('idle')
    }, 3000)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing.current) {
      e.preventDefault()
      const v = e.currentTarget.value
      inputValueRef.current = v
      void save(v)
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    if (isComposing.current || !currentUserId) return
    // Read from the DOM: blur can run before React commits the last onChange, so state may be stale.
    const value = e.currentTarget.value
    inputValueRef.current = value
    const log = logs.find((l) => l.user_id === currentUserId)
    const persisted = log?.activities ?? ''
    if (value === persisted) return
    void save(value)
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  const getSaveStatusColor = () => {
    switch (saveStatus) {
      case 'saving': return 'text-[var(--status-amber-text)]'
      case 'saved': return 'text-[var(--status-emerald-text)]'
      case 'error': return 'text-[var(--status-rose-text)]'
      default: return 'text-muted-foreground'
    }
  }

  const getSaveStatusIcon = () => {
    switch (saveStatus) {
      case 'saving': return '⏳'
      case 'saved': return '✅'
      case 'error': return '❌'
      default: return lastSaved ? '💾' : ''
    }
  }

  const sortedOtherProfiles = initialProfiles
    .filter((p) => p.id !== currentUserId && logs.some((l) => l.user_id === p.id && l.activities_at))
    .sort((a, b) => {
      const logA = logs.find((l) => l.user_id === a.id && l.activities_at)
      const logB = logs.find((l) => l.user_id === b.id && l.activities_at)
      if (logA && logB) return new Date(logA.activities_at!).getTime() - new Date(logB.activities_at!).getTime()
      if (logA) return -1
      if (logB) return 1
      return 0
    })

  const orderedProfiles = currentUserId
    ? [
        ...initialProfiles.filter((p) => p.id === currentUserId),
        ...sortedOtherProfiles,
      ]
    : sortedOtherProfiles

  return (
    <div className="p-3 md:p-4 w-full max-w-[1800px] mx-auto">
      <div className="mb-2 flex items-center gap-2">
        <div className="h-4 w-1 bg-primary rounded-full" />
        <h2 className="text-sm font-bold tracking-tight">Team Daily Tasks</h2>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-2">
        {orderedProfiles.map((profile) => {
          const log = logs.find((l) => l.user_id === profile.id)
          const isOwn = currentUserId === profile.id
          const initials = getInitials(profile.name ?? profile.email)
          const tone = STATUS_COLORS[getStatusTone(log?.status ?? null)]
          return (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -1, scale: 1.005 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className=""
            >
              <Card className={cn(
                'group relative overflow-hidden border bg-card shadow-sm transition-all duration-300 hover:shadow-md flex flex-col w-full',
                tone.border,
                isOwn && 'shadow-primary/10'
              )} size="sm">
                <CardHeader className="relative z-10 flex flex-row items-start gap-2 pb-1 pt-2 px-2.5 min-h-0">
                  <div className="relative shrink-0 mt-0.5">
                    <Avatar className={cn('h-9 w-9 ring-2 shadow-sm', tone.ring, !log && 'animate-pulse')}>
                      <AvatarFallback className={cn('font-medium text-xs', tone.fallback)}>{initials}</AvatarFallback>
                    </Avatar>
                    {!log && (
                      <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[var(--status-rose-dot)] animate-pulse ring-2 ring-card"></div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <CardTitle className="truncate text-xs font-semibold text-foreground leading-tight">{profile.email}</CardTitle>
                      {isOwn && (
                        <Badge className="border-0 bg-primary text-black shadow-none font-bold uppercase tracking-wider text-[9px] px-1.5 py-0 whitespace-nowrap rounded-full shrink-0">
                          You
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      {!log ? (
                        <Badge className="border-0 bg-[var(--status-rose-bg)]/20 text-[var(--status-rose-text)] shadow-none font-bold uppercase tracking-wider text-[9px] px-1.5 py-0 whitespace-nowrap rounded-full animate-pulse ring-1 ring-[var(--status-rose-border)]/30">
                          Not Logged
                        </Badge>
                      ) : (
                        <Badge className={`${tone.bg} ${tone.text} border-0 shadow-none font-bold uppercase tracking-wider text-[9px] px-1.5 py-0 whitespace-nowrap rounded-full`}>
                          {STATUS_LABELS[log.status]}
                        </Badge>
                      )}
                      {isOwn && (
                        <span className={`text-[9px] font-medium tabular-nums ${getSaveStatusColor()}`}>
                          {saveStatus === 'saving' && 'Saving…'}
                          {saveStatus === 'saved' && 'Saved'}
                          {saveStatus === 'error' && 'Save failed'}
                          {saveStatus === 'idle' && lastSaved && `Saved ${formatTimeAgo(lastSaved)}`}
                          {saveStatus === 'idle' && !lastSaved && 'Not saved yet'}
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative z-10 px-2.5 pb-2 pt-0">
                  <div className={cn('border-t mb-1.5', tone.border)} />
                  <ScrollFade>
                    {isOwn ? (
                      <textarea
                        className="w-full h-full resize-none bg-transparent px-0 py-0 text-xs leading-5 outline-none placeholder:text-muted-foreground/60"
                        placeholder="What are you working on today?"
                        value={inputValue}
                        onChange={(e) => {
                          const v = e.target.value
                          inputValueRef.current = v
                          setInputValue(v)
                        }}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        onCompositionStart={() => { isComposing.current = true }}
                        onCompositionEnd={() => { isComposing.current = false }}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap text-xs leading-5 text-foreground/90">
                        {log?.activities?.trim()
                          ? log.activities
                          : <span className="text-muted-foreground italic">No tasks logged yet.</span>}
                      </p>
                    )}
                  </ScrollFade>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
