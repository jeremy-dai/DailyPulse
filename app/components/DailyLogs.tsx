'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/app/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn, getInitials } from '@/lib/utils'
import type { Profile, DailyLog, WorkStatus } from '@/types/supabase'
import { useLocale } from '@/app/components/locale-provider'
import type { TranslationKey } from '@/app/components/locale-provider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'

import { motion } from 'framer-motion'

type StatusTone = 'in_office' | 'wfh' | 'off' | 'unknown'

const STATUS_COLORS: Record<StatusTone, { bg: string, text: string, border: string, ring: string, fallback: string, dot: string, inputOutline: string }> = {
  in_office: { bg: 'bg-[var(--status-emerald-bg)]/20', text: 'text-[var(--status-emerald-text)]', border: 'border-[var(--status-emerald-border)]/50', ring: 'ring-[var(--status-emerald-bg)]/80', fallback: 'bg-[var(--status-emerald-bg)]/20 text-[var(--status-emerald-text)]', dot: 'bg-[var(--status-emerald-dot)]', inputOutline: 'border-[var(--status-emerald-border)]/50 focus:border-[var(--status-emerald-border)]/80 focus:ring-[var(--status-emerald-bg)]/20' },
  wfh: { bg: 'bg-[var(--status-sky-bg)]/20', text: 'text-[var(--status-sky-text)]', border: 'border-[var(--status-sky-border)]/50', ring: 'ring-[var(--status-sky-bg)]/80', fallback: 'bg-[var(--status-sky-bg)]/20 text-[var(--status-sky-text)]', dot: 'bg-[var(--status-sky-dot)]', inputOutline: 'border-[var(--status-sky-border)]/50 focus:border-[var(--status-sky-border)]/80 focus:ring-[var(--status-sky-bg)]/20' },
  off: { bg: 'bg-[var(--status-zinc-bg)]/20', text: 'text-[var(--status-zinc-text)]', border: 'border-[var(--status-zinc-border)]/50', ring: 'ring-[var(--status-zinc-bg)]/80', fallback: 'bg-[var(--status-zinc-bg)]/20 text-[var(--status-zinc-text)]', dot: 'bg-[var(--status-zinc-dot)]', inputOutline: 'border-[var(--status-zinc-border)]/50 focus:border-[var(--status-zinc-border)]/80 focus:ring-[var(--status-zinc-bg)]/20' },
  unknown: { bg: 'bg-[var(--status-rose-bg)]/20', text: 'text-[var(--status-rose-text)]', border: 'border-[var(--status-rose-border)]/50', ring: 'ring-[var(--status-rose-bg)]/80', fallback: 'bg-[var(--status-rose-bg)]/20 text-[var(--status-rose-text)]', dot: 'bg-[var(--status-rose-dot)]', inputOutline: 'border-[var(--status-rose-border)]/50 focus:border-[var(--status-rose-border)]/80 focus:ring-[var(--status-rose-bg)]/20' },
}

const STATUS_DOT_COLORS: Record<WorkStatus, string> = {
  in_office: 'bg-[var(--status-emerald-dot)]',
  wfh: 'bg-[var(--status-sky-dot)]',
  off: 'bg-[var(--status-zinc-dot)]',
  sick: 'bg-amber-400',
  vacation: 'bg-violet-400',
}

const STATUS_CHIP_BASE =
  'h-3.5 rounded-full border-0 px-1.25 py-0 text-[7px] font-semibold uppercase tracking-[0.08em] leading-none shadow-none whitespace-nowrap'

const getStatusTone = (status: WorkStatus | null): StatusTone => {
  if (!status) return 'unknown'
  if (status === 'in_office' || status === 'wfh') return status
  return 'off'
}

const getStatusLabel = (status: WorkStatus, t: (key: TranslationKey) => string) => {
  switch (status) {
    case 'in_office':
      return t('statusInOffice')
    case 'wfh':
      return t('statusWfh')
    case 'off':
      return t('statusOff')
    case 'sick':
      return t('statusSick')
    case 'vacation':
      return t('statusVacation')
    default:
      return t('statusOff')
  }
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
    const rafId = window.requestAnimationFrame(check)
    const el = ref.current
    if (!el) return () => window.cancelAnimationFrame(rafId)
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => {
      window.cancelAnimationFrame(rafId)
      ro.disconnect()
    }
  }, [])

  return (
    <div className="relative flex-1 min-h-0">
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
  const { t } = useLocale()
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

  const handleStatusChange = async (newStatus: WorkStatus) => {
    if (!currentUserId) return

    const log = logs.find((entry) => entry.user_id === currentUserId)
    if (log) {
      const { data } = await supabase
        .from('daily_logs')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', log.id)
        .select()
        .single()
      if (data) onLogUpsert(data)
      return
    }

    const { data } = await supabase
      .from('daily_logs')
      .upsert({ user_id: currentUserId, date, status: newStatus }, { onConflict: 'user_id,date' })
      .select()
      .single()
    if (data) onLogUpsert(data)
  }

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
    if (value === persisted) {
      shouldUpdateInputRef.current = true
      return
    }
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

  const getSaveStatusText = () => {
    if (saveStatus === 'saving') return t('saving')
    if (saveStatus === 'saved') return t('saved')
    if (saveStatus === 'error') return t('saveFailed')
    return null
  }

  const getActivityTime = (userId: string) => {
    const log = logs.find((l) => l.user_id === userId && l.activities)
    if (!log) return null
    return log.activities_at ?? log.created_at
  }

  const sortedOtherProfiles = initialProfiles
    .filter((p) => p.id !== currentUserId && !!getActivityTime(p.id))
    .sort((a, b) => {
      const tA = getActivityTime(a.id)!
      const tB = getActivityTime(b.id)!
      return new Date(tA).getTime() - new Date(tB).getTime()
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
        <h2 className="text-sm font-bold tracking-tight">{t('teamDailyTasks')}</h2>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
        {orderedProfiles.map((profile) => {
          const log = logs.find((l) => l.user_id === profile.id)
          const isOwn = currentUserId === profile.id
          const displayName = profile.name || profile.email.split('@')[0]
          const initials = getInitials(profile.name ?? profile.email)
          const tone = STATUS_COLORS[getStatusTone(log?.status ?? null)]
          const saveStatusText = isOwn ? getSaveStatusText() : null
          return (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            >
              <Card className={cn(
                'group relative grid h-[210px] w-full grid-rows-[3rem_1fr] overflow-hidden border bg-card/85 py-0 shadow-sm transition-all duration-300 hover:shadow-lg gap-0',
                tone.border,
                isOwn && 'shadow-primary/10'
              )} size="sm">
                <CardHeader className="relative z-10 flex h-full flex-row items-center gap-1.5 bg-muted/15 pl-3.5 pr-2.5 py-1">
                  <div className="relative shrink-0">
                    <Avatar className={cn('h-7 w-7 ring-1.5 shadow-sm', tone.ring, !log && 'animate-pulse')}>
                      <AvatarFallback className={cn('font-medium text-xs', tone.fallback)}>{initials}</AvatarFallback>
                    </Avatar>
                    {!log && (
                      <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[var(--status-rose-dot)] animate-pulse ring-2 ring-card"></div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex h-4 min-w-0 items-center gap-1">
                      <CardTitle className="truncate text-[12px] font-medium leading-none text-foreground/95" title={profile.email}>
                        {displayName}
                      </CardTitle>
                      {isOwn && (
                        <Badge className="h-3.5 border-0 bg-primary/90 px-1.25 py-0 text-[7px] font-semibold uppercase tracking-[0.08em] leading-none whitespace-nowrap rounded-full shrink-0 text-primary-foreground shadow-none">
                          {t('you')}
                        </Badge>
                      )}
                    </div>
                    <div className={cn('flex h-3.5 min-h-0 items-center gap-1', isOwn ? 'justify-between' : 'justify-start')}>
                      {isOwn ? (
                        <Select
                          value={log?.status ?? undefined}
                          onValueChange={(value) => handleStatusChange(value as WorkStatus)}
                        >
                          <SelectTrigger className={cn(
                            `${STATUS_CHIP_BASE} !h-3.5 !min-h-0 w-fit max-w-[7.5rem] !rounded-full !py-0 !pr-1 !pl-1 !text-[7px] !leading-none focus:ring-0 [&_svg]:size-2.5 [&_svg]:text-current/70 cursor-pointer`,
                            log
                              ? `${tone.bg} ${tone.text} border-0`
                              : 'border-0 bg-[var(--status-rose-bg)]/20 text-[var(--status-rose-text)] animate-pulse'
                          )}>
                            <div className="flex items-center gap-1 truncate">
                              {log?.status && (
                                <span className={cn('h-2 w-2 rounded-full shrink-0', STATUS_DOT_COLORS[log.status])} />
                              )}
                              <span className="truncate">{log ? getStatusLabel(log.status, t) : t('setStatus')}</span>
                            </div>
                          </SelectTrigger>
                          <SelectContent alignItemWithTrigger={false} sideOffset={6} className="bg-card border-border rounded-xl p-1">
                            {(['in_office', 'wfh', 'off', 'sick', 'vacation'] as WorkStatus[]).map((status) => (
                              <SelectItem key={status} value={status} className="rounded-lg focus:bg-muted cursor-pointer">
                                <div className="flex items-center gap-2.5">
                                  <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', STATUS_DOT_COLORS[status])} />
                                  <span className="font-medium">{getStatusLabel(status, t)}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : !log ? (
                        <Badge className={cn(
                          STATUS_CHIP_BASE,
                          'bg-[var(--status-rose-bg)]/20 text-[var(--status-rose-text)] animate-pulse ring-1 ring-[var(--status-rose-border)]/30'
                        )}>
                          {t('notLogged')}
                        </Badge>
                      ) : (
                        <Badge className={cn(STATUS_CHIP_BASE, tone.bg, tone.text)}>
                          {getStatusLabel(log.status, t)}
                        </Badge>
                      )}
                      {isOwn && saveStatusText && (
                        <span className={`ml-auto text-[8px] font-medium tabular-nums whitespace-nowrap ${getSaveStatusColor()}`}>
                          {saveStatusText}
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative z-10 flex flex-1 flex-col px-2.5 pb-3 pt-0">
                  <ScrollFade>
                    {isOwn ? (
                      <textarea
                        className="h-full w-full resize-none bg-transparent px-0 py-0 text-xs leading-[1.15rem] outline-none placeholder:text-muted-foreground/60"
                        placeholder={t('whatAreYouWorkingOnToday')}
                        value={inputValue}
                        onChange={(e) => {
                          const v = e.target.value
                          inputValueRef.current = v
                          setInputValue(v)
                          shouldUpdateInputRef.current = false
                        }}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        onCompositionStart={() => { isComposing.current = true }}
                        onCompositionEnd={() => { isComposing.current = false }}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap text-xs leading-[1.15rem] text-foreground/90">
                        {log?.activities?.trim()
                          ? log.activities
                          : <span className="text-muted-foreground italic">{t('noTasksLoggedYet')}</span>}
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
