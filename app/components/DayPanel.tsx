'use client'
import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useRef, useTransition, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/app/utils/supabase/client'
import type { DailyLog, Profile } from '@/types/supabase'

const getDaysInMonth = (year: number, month: number): Date[] => {
  const days: Date[] = []
  const date = new Date(year, month, 1)
  while (date.getMonth() === month) {
    days.push(new Date(date))
    date.setDate(date.getDate() + 1)
  }
  return days
}

export default function DayPanel() {
  const params = useParams()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const today = new Date()
  const todayStr = today.toLocaleDateString('en-CA')
  const selectedDate = params.date as string

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [pendingDate, setPendingDate] = useState<string | null>(null)
  const todayRef = useRef<HTMLButtonElement>(null)

  const [overviewOpen, setOverviewOpen] = useState(false)
  const [overviewLogs, setOverviewLogs] = useState<(DailyLog & { profile?: Profile })[]>([])
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [overviewUserId, setOverviewUserId] = useState<string | null>(null)

  const openOverview = async () => {
    setOverviewOpen(true)
    setOverviewUserId(null)
    setOverviewLoading(true)
    const supabase = createClient()
    const startDate = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`
    const endDate = new Date(viewYear, viewMonth + 1, 0).toLocaleDateString('en-CA')
    const [{ data: logs }, { data: profiles }] = await Promise.all([
      supabase.from('daily_logs').select('*').gte('date', startDate).lte('date', endDate),
      supabase.from('profiles').select('*'),
    ])
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))
    const enriched = (logs ?? [])
      .filter((l) => l.activities?.trim())
      .map((l) => ({ ...l, profile: profileMap.get(l.user_id) }))
    setOverviewLogs(enriched)
    setOverviewLoading(false)
  }

  const overviewUsers = useMemo(() => {
    const m = new Map<string, string>()
    for (const log of overviewLogs) {
      if (!m.has(log.user_id)) {
        m.set(
          log.user_id,
          log.profile?.name?.trim() || log.profile?.email || 'Unknown'
        )
      }
    }
    return [...m.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [overviewLogs])

  const filteredOverviewLogs = useMemo(
    () =>
      overviewUserId
        ? overviewLogs.filter((l) => l.user_id === overviewUserId)
        : overviewLogs,
    [overviewLogs, overviewUserId]
  )

  useEffect(() => {
    todayRef.current?.scrollIntoView({ block: 'center', behavior: 'instant' })
  }, [])

  const dates = getDaysInMonth(viewYear, viewMonth)

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(y => y - 1)
      setViewMonth(11)
    } else {
      setViewMonth(m => m - 1)
    }
  }

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(y => y + 1)
      setViewMonth(0)
    } else {
      setViewMonth(m => m + 1)
    }
  }

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const navigateToDate = (dateStr: string) => {
    if (dateStr === selectedDate) return

    setPendingDate(dateStr)
    startTransition(() => {
      router.push(`/${dateStr}`)
    })
  }

  return (
    <>
    <div className="w-64 bg-background border-r border-border/10 h-screen sticky top-0 flex flex-col shrink-0 z-20">
      <div className="p-6">
        <h1 className="text-xl font-bold flex items-center gap-2 text-primary">
          <div className="w-6 h-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          DailyPulse
        </h1>
      </div>
      <div className="px-6 pb-4">

        <div className="flex justify-between items-center bg-muted rounded-full p-1 mb-2">
          <button
            onClick={goToPrevMonth}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-background text-muted-foreground transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div className="text-sm font-medium">{monthLabel}</div>
          <button
            onClick={goToNextMonth}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-background text-muted-foreground transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
        <button
          onClick={openOverview}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-muted hover:bg-background text-muted-foreground hover:text-foreground text-xs font-medium transition-colors border border-border hover:border-foreground/10"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
          Overview
        </button>
      </div>
      <div className="overflow-y-auto flex-1 px-4 space-y-1 scrollbar-hide pb-6">
        {dates.map((date) => {
          const dateStr = date.toLocaleDateString('en-CA')
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedDate
          const isPendingSelection = isPending && pendingDate === dateStr
          const isWeekend = date.getDay() === 0 || date.getDay() === 6

          return (
            <button
              key={dateStr}
              ref={isToday ? todayRef : undefined}
              onClick={() => navigateToDate(dateStr)}
              aria-busy={isPendingSelection}
              className={cn(
                'relative w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-200 cursor-pointer group',
                isSelected || isPendingSelection
                  ? 'text-primary-foreground font-semibold'
                  : isToday
                    ? 'text-primary font-semibold hover:bg-muted'
                    : isWeekend
                      ? 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {(isSelected || isPendingSelection) && (
                <motion.div
                  layoutId="active-date"
                  className={cn(
                    'absolute inset-0 rounded-2xl',
                    isPendingSelection ? 'bg-primary/70 animate-pulse' : 'bg-primary'
                  )}
                  initial={false}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <div className="relative z-10 flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold", isSelected ? "bg-black/10 dark:bg-black/20 text-primary-foreground" : "bg-muted")}>
                  {date.getDate()}
                </div>
                <div className="flex flex-col items-start">
                  <div className="text-sm font-medium">
                    {date.toLocaleDateString('en-US', { weekday: 'long' })}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

    </div>
      <AnimatePresence>
        {overviewOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm"
            onClick={() => setOverviewOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="bg-card border border-border rounded-xl w-full max-w-5xl h-[min(92vh,900px)] max-h-[92vh] flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 border-b border-border shrink-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-6 h-6 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-foreground leading-tight sm:text-base">Monthly Overview</h2>
                    <p className="text-xs text-muted-foreground leading-tight">{monthLabel}</p>
                  </div>
                </div>
                {!overviewLoading && overviewUsers.length > 0 && (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                    <span className="hidden sm:inline">User</span>
                    <select
                      value={overviewUserId ?? ''}
                      onChange={(e) => setOverviewUserId(e.target.value || null)}
                      className="max-w-[160px] sm:max-w-[220px] rounded-md border border-border bg-muted px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      <option value="">All users</option>
                      {overviewUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <button
                  type="button"
                  onClick={() => setOverviewOpen(false)}
                  className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors ml-auto shrink-0"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1 min-h-0 px-3 py-2.5 sm:px-4 space-y-3">
                {overviewLoading ? (
                  <div className="flex flex-col gap-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="space-y-1.5 animate-pulse">
                        <div className="h-3 w-24 bg-muted rounded" />
                        <div className="h-10 bg-muted rounded-lg" />
                      </div>
                    ))}
                  </div>
                ) : overviewLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2 opacity-40"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                    <p className="text-sm">No tasks logged this month</p>
                  </div>
                ) : filteredOverviewLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <p className="text-sm">No entries for this user</p>
                  </div>
                ) : (
                  (() => {
                    const byDate = new Map<string, typeof filteredOverviewLogs>()
                    for (const log of filteredOverviewLogs) {
                      const existing = byDate.get(log.date) ?? []
                      existing.push(log)
                      byDate.set(log.date, existing)
                    }
                    const sortedDates = [...byDate.keys()].sort()
                    return sortedDates.map((dateStr) => {
                      const entries = byDate.get(dateStr)!
                      const dateObj = new Date(dateStr + 'T00:00:00')
                      const dateLabel = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                      return (
                        <div key={dateStr}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs font-semibold text-primary sm:text-sm">{dateLabel}</span>
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-xs text-muted-foreground tabular-nums">{entries.length}</span>
                          </div>
                          <div className="space-y-1.5">
                            {entries.map((entry) => (
                              <div key={entry.id} className="bg-muted/50 rounded-lg px-3 py-2 border border-border/50">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-medium text-foreground/80 truncate sm:text-sm">
                                    {entry.profile?.name ?? entry.profile?.email ?? 'Unknown'}
                                  </span>
                                  <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium ml-auto shrink-0">
                                    {entry.status.replace('_', ' ')}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{entry.activities}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })
                  })()
                )}
              </div>

              {/* Footer */}
              {!overviewLoading && overviewLogs.length > 0 && (
                <div className="px-3 py-2 sm:px-4 border-t border-border flex items-center justify-between gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {overviewUserId
                      ? `${filteredOverviewLogs.length} of ${overviewLogs.length} entries`
                      : `${overviewLogs.length} ${overviewLogs.length === 1 ? 'entry' : 'entries'} logged`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOverviewOpen(false)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
