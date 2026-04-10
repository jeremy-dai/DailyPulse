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
  in_office: { bg: 'bg-emerald-500/20', text: 'text-emerald-200', border: 'border-emerald-500/50', ring: 'ring-emerald-500/80', fallback: 'bg-emerald-500/20 text-emerald-100', dot: 'bg-emerald-400', inputOutline: 'border-emerald-500/50 focus:border-emerald-400/80 focus:ring-emerald-500/20' },
  wfh: { bg: 'bg-sky-500/20', text: 'text-sky-200', border: 'border-sky-500/50', ring: 'ring-sky-500/80', fallback: 'bg-sky-500/20 text-sky-100', dot: 'bg-sky-400', inputOutline: 'border-sky-500/50 focus:border-sky-400/80 focus:ring-sky-500/20' },
  off: { bg: 'bg-zinc-500/20', text: 'text-zinc-200', border: 'border-zinc-500/50', ring: 'ring-zinc-500/80', fallback: 'bg-zinc-700 text-zinc-100', dot: 'bg-zinc-400', inputOutline: 'border-zinc-500/50 focus:border-zinc-400/80 focus:ring-zinc-500/20' },
  unknown: { bg: 'bg-rose-500/20', text: 'text-rose-200', border: 'border-rose-500/50', ring: 'ring-rose-500/80', fallback: 'bg-rose-500/20 text-rose-100', dot: 'bg-rose-400', inputOutline: 'border-rose-500/50 focus:border-rose-400/80 focus:ring-rose-500/20' },
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
        const { data } = await supabase
          .from('daily_logs')
          .update({ activities, updated_at: new Date().toISOString() })
          .eq('id', log.id)
          .select()
          .single()
        if (data) {
          onLogUpsert(data)
          setSaveStatus('saved')
          setLastSaved(new Date())
        }
      } else {
        const { data } = await supabase
          .from('daily_logs')
          .upsert({ user_id: currentUserId, date, activities }, { onConflict: 'user_id,date' })
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
      case 'saving': return 'text-yellow-300'
      case 'saved': return 'text-emerald-300'
      case 'error': return 'text-red-300'
      default: return 'text-zinc-400'
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

  const STATUS_ORDER: Record<string, number> = {
    in_office: 0,
    wfh: 1,
    sick: 2,
    vacation: 3,
    off: 4,
  }

  const orderedProfiles = [...initialProfiles]
    .filter((p) => p.id === currentUserId || logs.some((l) => l.user_id === p.id))
    .sort((a, b) => {
      if (a.id === currentUserId) return -1
      if (b.id === currentUserId) return 1
      const logA = logs.find((l) => l.user_id === a.id)
      const logB = logs.find((l) => l.user_id === b.id)
      const orderA = logA ? (STATUS_ORDER[logA.status] ?? 5) : 6
      const orderB = logB ? (STATUS_ORDER[logB.status] ?? 5) : 6
      return orderA - orderB
    })

  return (
    <div className="p-4 md:p-6 w-full max-w-[1800px] mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="h-8 w-1 bg-primary rounded-full" />
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Team Daily Tasks</h2>
          <p className="text-sm text-zinc-400">Your task card stays pinned first so it is easy to update throughout the day.</p>
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4 items-stretch">
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
              whileHover={{ y: -2, scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="h-full min-h-0 flex"
            >
              <Card className={cn(
                'group relative overflow-hidden border bg-zinc-900 shadow-sm transition-all duration-300 hover:shadow-md flex flex-col w-full',
                tone.border,
                isOwn && 'shadow-primary/10'
              )} size="sm">
                <CardHeader className="relative z-10 flex flex-row items-center gap-3 border-b border-white/5 pb-2 pt-3 px-3 min-h-[5.25rem]">
                  <div className="relative shrink-0">
                    <Avatar className={cn('h-10 w-10 ring-2 shadow-sm', tone.ring, !log && 'animate-pulse')}>
                      <AvatarFallback className={cn('font-medium text-sm', tone.fallback)}>{initials}</AvatarFallback>
                    </Avatar>
                    {!log && (
                      <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse ring-2 ring-zinc-900"></div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col gap-1 min-w-0 justify-center">
                    <div className="flex items-center gap-2">
                      <CardTitle className="truncate text-sm font-semibold text-foreground">{profile.email}</CardTitle>
                      {isOwn && (
                        <Badge className="border-0 bg-primary text-black shadow-none font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 whitespace-nowrap rounded-full">
                          You
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 flex-wrap w-full min-h-[1.375rem]">
                      <div className="flex items-center gap-2 flex-wrap">
                        {!log ? (
                          <Badge className="border-0 bg-rose-500/20 text-rose-200 shadow-none font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 whitespace-nowrap rounded-full animate-pulse ring-1 ring-rose-500/30">
                            Not Logged
                          </Badge>
                        ) : (
                          <Badge className={`${tone.bg} ${tone.text} border-0 shadow-none font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 whitespace-nowrap rounded-full`}>
                            {STATUS_LABELS[log.status]}
                          </Badge>
                        )}
                      </div>
                      <div className={`flex items-center gap-1 text-[10px] font-medium min-h-[1.125rem] tabular-nums ${isOwn ? getSaveStatusColor() : 'text-transparent pointer-events-none select-none'}`} aria-hidden={!isOwn}>
                        <span>{isOwn ? getSaveStatusIcon() : '·'}</span>
                        <span>
                          {isOwn && saveStatus === 'saving' && 'Saving'}
                          {isOwn && saveStatus === 'saved' && 'Saved'}
                          {isOwn && saveStatus === 'error' && 'Save failed'}
                          {isOwn && saveStatus === 'idle' && lastSaved && `Saved ${formatTimeAgo(lastSaved)}`}
                          {isOwn && saveStatus === 'idle' && !lastSaved && 'Not saved yet'}
                          {!isOwn && '\u00a0'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative z-10 px-3 pb-3 pt-2.5 flex-1 flex flex-col min-h-0">
                  <div className="flex flex-col gap-2 flex-1 min-h-0">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                      Today&apos;s Tasks
                    </div>
                    {isOwn ? (
                      <textarea
                        className={`w-full h-32 min-h-32 max-h-32 shrink-0 resize-none overflow-y-auto rounded-xl bg-black/40 px-3 py-2.5 text-sm leading-6 outline-none border transition-all placeholder:text-muted-foreground/80 shadow-inner focus:ring-2 ${
                          saveStatus === 'saving' ? 'border-yellow-400/60 focus:border-yellow-400 focus:ring-yellow-400/20' :
                          saveStatus === 'saved' ? 'border-emerald-400/60 focus:border-emerald-400 focus:ring-emerald-400/20' :
                          saveStatus === 'error' ? 'border-red-400/60 focus:border-red-400 focus:ring-red-400/20' :
                          tone.inputOutline
                        }`}
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
                      <div
                        className={cn(
                          'h-32 min-h-32 max-h-32 shrink-0 overflow-y-auto rounded-xl border bg-black/40 px-3 py-2.5 text-sm leading-6 shadow-inner',
                          tone.border
                        )}
                      >
                        <p className="whitespace-pre-wrap text-foreground/90">
                          {log?.activities?.trim()
                            ? log.activities
                            : <span className="text-zinc-500 italic">No tasks logged yet.</span>}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
