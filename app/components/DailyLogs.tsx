'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/app/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Medal, X, Info, ChevronDown } from 'lucide-react'
import confetti from 'canvas-confetti'

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
  'inline-flex items-center justify-center rounded-full border-0 px-2.5 py-0 text-[9px] font-semibold leading-none shadow-none whitespace-nowrap'

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

function ScrollFade({ children, deps = [] }: { children: (props: { ref: React.RefObject<any>, onScroll: () => void, className: string }) => React.ReactNode, deps?: React.DependencyList }) {
  const ref = useRef<HTMLElement>(null)
  const [hasOverflow, setHasOverflow] = useState(false)
  const [showBottomCue, setShowBottomCue] = useState(false)

  const check = () => {
    const el = ref.current
    if (!el) return
    const nextHasOverflow = el.scrollHeight > el.clientHeight + 2
    setHasOverflow(nextHasOverflow)
    setShowBottomCue(nextHasOverflow && el.scrollTop + el.clientHeight < el.scrollHeight - 2)
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

  useEffect(() => {
    check()
  }, deps)

  return (
    <div className="relative flex-1 min-h-0">
      {children({
        ref,
        onScroll: check,
        className: "visible-scrollbar h-full overflow-y-scroll pr-2",
      })}
      {showBottomCue && (
        <>
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-7 bg-gradient-to-t from-card via-card/85 to-transparent" />
          <div className="pointer-events-none absolute bottom-1.5 right-3 flex h-5 items-center justify-center rounded-full bg-card/95 px-1.5 text-muted-foreground shadow-sm ring-1 ring-border/70">
            <ChevronDown className="h-3.5 w-3.5 animate-bounce" />
          </div>
        </>
      )}
      {hasOverflow && !showBottomCue && (
        <div className="pointer-events-none absolute inset-y-2 right-1 w-px rounded-full bg-border/70" />
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
  const [gamificationMessage, setGamificationMessage] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const isComposing = useRef(false)
  const inputValueRef = useRef('')
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const shouldUpdateInputRef = useRef(true)

  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [leaderboardData, setLeaderboardData] = useState<{ profile: Profile; score: number }[]>([])

  const openLeaderboard = async () => {
    setLeaderboardOpen(true)
    setLeaderboardLoading(true)
    
    // Get current month start and end dates
    const dateObj = new Date(date)
    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const startDate = `${year}-${month}-01`
    
    // Last day of month
    const nextMonth = dateObj.getMonth() + 1
    const endObj = new Date(year, nextMonth, 0)
    const endYear = endObj.getFullYear()
    const endMonth = String(endObj.getMonth() + 1).padStart(2, '0')
    const endDay = String(endObj.getDate()).padStart(2, '0')
    const endDate = `${endYear}-${endMonth}-${endDay}`

    const { data: monthLogs } = await supabase
      .from('daily_logs')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)

    if (!monthLogs) {
      setLeaderboardData([])
      setLeaderboardLoading(false)
      return
    }

    // Group logs by date
    const logsByDate: Record<string, DailyLog[]> = {}
    monthLogs.forEach(log => {
      if (!logsByDate[log.date]) logsByDate[log.date] = []
      logsByDate[log.date].push(log)
    })

    const scores: Record<string, number> = {}
    initialProfiles.forEach(p => scores[p.id] = 0)
    const N = initialProfiles.length

    // Score logic
    Object.values(logsByDate).forEach(dayLogs => {
      // Only count days with more than 5 members
      if (dayLogs.length > 5) {
        // Sort by activities_at or created_at
        const sortedDayLogs = [...dayLogs].sort((a, b) => {
          const tA = new Date(a.activities_at ?? a.created_at).getTime()
          const tB = new Date(b.activities_at ?? b.created_at).getTime()
          return tA - tB
        })

        // Assign points based on rank
        sortedDayLogs.forEach((log, index) => {
          const rank = index + 1
          const score = N - rank + 1
          if (scores[log.user_id] !== undefined) {
            scores[log.user_id] += score
          }
        })
      }
    })

    const leaderboard = initialProfiles.map(p => ({
      profile: p,
      score: scores[p.id]
    })).sort((a, b) => b.score - a.score)

    setLeaderboardData(leaderboard)
    setLeaderboardLoading(false)
  }

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

  const triggerGamification = (logData: DailyLog, isNewActivity: boolean) => {
    if (!isNewActivity) return

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    })

    const otherLogs = logs.filter(l => l.id !== logData.id && !!l.activities)
    let myRank = 1
    const myTime = new Date(logData.activities_at ?? logData.created_at).getTime()
    otherLogs.forEach(l => {
      const t = new Date(l.activities_at ?? l.created_at).getTime()
      if (t < myTime) myRank++
    })

    const score = initialProfiles.length - myRank + 1
    const msg = t('ptsAdded').replace('{rank}', myRank.toString()).replace('{score}', score.toString())
    setGamificationMessage(msg)
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
        const isNewActivity = !!activities && !log.activities_at
        const { data } = await supabase
          .from('daily_logs')
          .update({
            activities,
            updated_at: now,
            ...(isNewActivity ? { activities_at: now } : {}),
          })
          .eq('id', log.id)
          .select()
          .single()
        if (data) {
          onLogUpsert(data)
          setSaveStatus('saved')
          setLastSaved(new Date())
          if (isNewActivity) triggerGamification(data, true)
        }
      } else {
        const now = new Date().toISOString()
        const isNewActivity = !!activities
        const { data } = await supabase
          .from('daily_logs')
          .upsert(
            { user_id: currentUserId, date, activities, ...(isNewActivity ? { activities_at: now } : {}) },
            { onConflict: 'user_id,date' }
          )
          .select()
          .single()
        if (data) {
          onLogUpsert(data)
          setSaveStatus('saved')
          setLastSaved(new Date())
          if (isNewActivity) triggerGamification(data, true)
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
      setGamificationMessage(null)
    }, 4000)
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

  const rankedProfiles = initialProfiles
    .filter((p) => !!getActivityTime(p.id))
    .sort((a, b) => {
      const tA = getActivityTime(a.id)!
      const tB = getActivityTime(b.id)!
      return new Date(tA).getTime() - new Date(tB).getTime()
    })

  const sortedOtherProfiles = rankedProfiles.filter((p) => p.id !== currentUserId)

  const orderedProfiles = currentUserId
    ? [
        ...initialProfiles.filter((p) => p.id === currentUserId),
        ...sortedOtherProfiles,
      ]
    : sortedOtherProfiles

  return (
    <div className="p-3 md:p-4 w-full max-w-[1800px] mx-auto">
      <div className="mb-4 md:mb-6 flex items-center gap-2">
        <div className="h-4 w-1 bg-primary rounded-full" />
        <h2 className="text-sm font-bold tracking-tight">{t('teamDailyTasks')}</h2>
        <button
          onClick={openLeaderboard}
          className="ml-2 flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary hover:bg-primary/20 transition-colors"
        >
          <Trophy className="h-3 w-3" />
          {t('monthlyLeadership')}
        </button>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
        {orderedProfiles.map((profile) => {
          const log = logs.find((l) => l.user_id === profile.id)
          const isOwn = currentUserId === profile.id
          const displayName = profile.name || profile.email.split('@')[0]
          const initials = getInitials(profile.name ?? profile.email)
          const tone = STATUS_COLORS[getStatusTone(log?.status ?? null)]
          const saveStatusText = isOwn ? getSaveStatusText() : null
          
          const rankIndex = rankedProfiles.findIndex((p) => p.id === profile.id)
          const rank = rankIndex !== -1 ? rankIndex + 1 : null

          return (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            >
              <Card className={cn(
                'group relative grid h-[210px] w-full grid-rows-[3.7rem_1fr] overflow-hidden border bg-card/85 py-0 shadow-sm transition-all duration-300 hover:shadow-lg gap-0',
                tone.border,
                isOwn && 'shadow-primary/10',
                rank === 1 && 'shadow-yellow-400/20 shadow-md',
                rank === 2 && 'shadow-slate-400/20 shadow-md',
                rank === 3 && 'shadow-amber-600/20 shadow-md'
                )} size="sm">
                <CardHeader className={cn(
                  "relative z-10 flex h-full flex-row items-center gap-2.5 px-3.5 py-2",
                  rank === 1 ? "bg-gradient-to-r from-yellow-400/10 to-transparent" :
                  rank === 2 ? "bg-gradient-to-r from-slate-400/10 to-transparent" :
                  rank === 3 ? "bg-gradient-to-r from-amber-600/10 to-transparent" :
                  "bg-muted/15"
                )}>
                  <div className="relative shrink-0">
                    <div className={cn(
                      'flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full ring-1.5 shadow-sm text-xs font-medium',
                      rank === 1 ? 'bg-yellow-400/20 ring-yellow-400/80 text-yellow-600 dark:text-yellow-400' :
                      rank === 2 ? 'bg-slate-400/20 ring-slate-400/80 text-slate-600 dark:text-slate-300' :
                      rank === 3 ? 'bg-amber-600/20 ring-amber-600/80 text-amber-700 dark:text-amber-500' :
                      cn(tone.fallback, tone.ring),
                      !log && 'animate-pulse'
                    )}>
                      {rank === 1 ? <Trophy className="h-3.5 w-3.5" /> : 
                       rank === 2 ? <Medal className="h-3.5 w-3.5" /> : 
                       rank === 3 ? <Medal className="h-3.5 w-3.5" /> : 
                       rank || initials}
                    </div>
                    {!log && (
                      <div className="absolute right-0 top-0 h-2 w-2 rounded-full bg-[var(--status-rose-dot)] animate-pulse ring-2 ring-card" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <CardTitle className="truncate text-[12px] font-semibold leading-none tracking-tight text-foreground/95 sm:text-[13px]" title={profile.email}>
                        {displayName}
                      </CardTitle>
                      {isOwn && (
                        <Badge className="inline-flex h-5 shrink-0 items-center justify-center rounded-full border-0 bg-primary/90 px-2 py-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-foreground shadow-none">
                          {t('you')}
                        </Badge>
                      )}
                    </div>
                    <div className={cn('flex min-h-0 items-center gap-1.5', isOwn ? 'justify-between' : 'justify-start')}>
                      {isOwn ? (
                        <Select
                          value={log?.status ?? undefined}
                          onValueChange={(value) => handleStatusChange(value as WorkStatus)}
                        >
                          <SelectTrigger className={cn(
                            `${STATUS_CHIP_BASE} !h-5.5 !min-h-0 w-fit max-w-[8.5rem] !rounded-full !py-0 !pl-2 !pr-1.5 !text-[10px] !leading-none focus:ring-0 [&_svg]:size-3 [&_svg]:text-current/70 cursor-pointer`,
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
                          'h-5.5 gap-1.5 bg-[var(--status-rose-bg)]/20 text-[var(--status-rose-text)] animate-pulse ring-1 ring-[var(--status-rose-border)]/30'
                        )}>
                          <span className="h-2 w-2 rounded-full bg-[var(--status-rose-dot)]" />
                          {t('notLogged')}
                        </Badge>
                      ) : (
                        <Badge className={cn(STATUS_CHIP_BASE, 'h-5.5 gap-1.5', tone.bg, tone.text)}>
                          <span className={cn('h-2 w-2 rounded-full', STATUS_DOT_COLORS[log.status])} />
                          {getStatusLabel(log.status, t)}
                        </Badge>
                      )}
                      {isOwn && saveStatusText && (
                        <span className={`ml-auto text-[10px] font-medium tabular-nums whitespace-nowrap ${getSaveStatusColor()}`}>
                          {saveStatusText}
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative z-10 flex flex-1 flex-col px-3.5 pb-3 pt-2.5">
                  <ScrollFade deps={[inputValue, log?.activities]}>
                    {({ ref, onScroll, className }) => isOwn ? (
                      <textarea
                        ref={ref}
                        onScroll={onScroll}
                        className={cn(className, "w-full resize-none bg-transparent px-0 py-0 text-xs leading-[1.35rem] outline-none placeholder:text-muted-foreground/60")}
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
                      <div ref={ref} onScroll={onScroll} className={className}>
                        <p className="whitespace-pre-wrap text-xs leading-[1.35rem] text-foreground/90">
                          {log?.activities?.trim()
                            ? log.activities
                            : <span className="text-muted-foreground italic">{t('noTasksLoggedYet')}</span>}
                        </p>
                      </div>
                    )}
                  </ScrollFade>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <AnimatePresence>
        {gamificationMessage && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 p-[2px] rounded-full shadow-[0_0_40px_-10px_rgba(245,158,11,0.6)]">
              <div className="bg-zinc-950/95 backdrop-blur-md text-white px-6 py-3 rounded-full flex items-center gap-3">
                <Trophy className="w-5 h-5 text-yellow-400 animate-pulse drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
                <span className="font-extrabold text-[15px] sm:text-base tracking-wide text-zinc-50 drop-shadow-sm whitespace-nowrap">
                  {gamificationMessage}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {leaderboardOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm"
            onClick={() => setLeaderboardOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="bg-card border border-border rounded-xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center shrink-0 text-yellow-600 dark:text-yellow-400">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground leading-tight">{t('monthlyLeadership')}</h2>
                    <p className="text-xs text-muted-foreground leading-tight">{t('leaderboardCondition')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLeaderboardOpen(false)}
                  className="w-8 h-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1 min-h-0 px-4 py-4">
                {leaderboardLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : leaderboardData.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-3 mb-4">
                      <Info className="w-4 h-4 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        {t('leaderboardScoreLogic')
                          .replace('{n}', initialProfiles.length.toString())
                          .replace('{n_1}', (initialProfiles.length - 1).toString())}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {leaderboardData.map((item, i) => {
                        const rank = i + 1
                        return (
                          <div key={item.profile.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors">
                            <div className={cn(
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1.5 shadow-sm text-sm font-medium',
                              rank === 1 ? 'bg-yellow-400/20 ring-yellow-400/80 text-yellow-600 dark:text-yellow-400' :
                              rank === 2 ? 'bg-slate-400/20 ring-slate-400/80 text-slate-600 dark:text-slate-300' :
                              rank === 3 ? 'bg-amber-600/20 ring-amber-600/80 text-amber-700 dark:text-amber-500' :
                              'bg-muted ring-border text-muted-foreground'
                            )}>
                              {rank === 1 ? <Trophy className="h-4 w-4" /> : 
                               rank === 2 ? <Medal className="h-4 w-4" /> : 
                               rank === 3 ? <Medal className="h-4 w-4" /> : 
                               rank}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{item.profile.name || item.profile.email.split('@')[0]}</div>
                            </div>
                            <div className="text-sm font-bold text-foreground">
                              {item.score} <span className="text-xs font-normal text-muted-foreground">{t('pts')}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground text-sm">
                    {t('noValidDataThisMonth')}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
