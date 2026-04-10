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

const STATUS_COLORS: Record<StatusTone, { bg: string, text: string, border: string, ring: string, fallback: string, dot: string }> = {
  in_office: { bg: 'bg-emerald-500/12', text: 'text-emerald-300', border: 'border-emerald-500/30', ring: 'ring-emerald-500/60', fallback: 'bg-emerald-500/18 text-emerald-200', dot: 'bg-emerald-400' },
  wfh: { bg: 'bg-sky-500/12', text: 'text-sky-300', border: 'border-sky-500/30', ring: 'ring-sky-500/60', fallback: 'bg-sky-500/18 text-sky-200', dot: 'bg-sky-400' },
  off: { bg: 'bg-zinc-500/12', text: 'text-zinc-300', border: 'border-zinc-500/30', ring: 'ring-zinc-500/60', fallback: 'bg-zinc-700 text-zinc-200', dot: 'bg-zinc-400' },
  unknown: { bg: 'bg-rose-500/12', text: 'text-rose-300', border: 'border-rose-500/30', ring: 'ring-rose-500/75', fallback: 'bg-rose-500/18 text-rose-200', dot: 'bg-rose-400' },
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
  initialLogs: DailyLog[]
}

export default function DailyLogs({ date, initialProfiles, initialLogs }: Props) {
  const supabase = createClient()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [logs, setLogs] = useState<DailyLog[]>(initialLogs)
  const [inputValue, setInputValue] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const isComposing = useRef(false)
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
      setInputValue(log?.activities ?? '')
    }
  }, [currentUserId, logs])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel(`daily-logs-${date}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_logs', filter: `date=eq.${date}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLogs((prev) => [...prev, payload.new as DailyLog])
          } else if (payload.eventType === 'UPDATE') {
            setLogs((prev) => [
              ...prev.filter((l) => l.id !== (payload.old as DailyLog).id),
              payload.new as DailyLog,
            ])
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, date])

  const save = async () => {
    if (!currentUserId) return
    
    shouldUpdateInputRef.current = false
    setSaveStatus('saving')
    const log = logs.find((l) => l.user_id === currentUserId)

    try {
      if (log) {
        const { data } = await supabase
          .from('daily_logs')
          .update({ activities: inputValue, updated_at: new Date().toISOString() })
          .eq('id', log.id)
          .select()
          .single()
        if (data) {
          setLogs((prev) => [...prev.filter((l) => l.id !== log.id), data])
          setSaveStatus('saved')
          setLastSaved(new Date())
        }
      } else {
        const { data } = await supabase
          .from('daily_logs')
          .upsert({ user_id: currentUserId, date, activities: inputValue }, { onConflict: 'user_id,date' })
          .select()
          .single()
        if (data) {
          setLogs((prev) => [...prev.filter((l) => l.user_id !== currentUserId), data])
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
      save()
    }
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

  const orderedProfiles = [...initialProfiles].sort((a, b) => {
    if (a.id === currentUserId) return -1
    if (b.id === currentUserId) return 1
    return (a.name ?? a.email).localeCompare(b.name ?? b.email)
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
      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
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
              className="self-start"
            >
              <Card className={cn(
                'group relative overflow-hidden border bg-zinc-900 shadow-sm transition-all duration-300 hover:shadow-md flex flex-col',
                isOwn ? 'border-primary/25 shadow-primary/5' : tone.border
              )} size="sm">
                <CardHeader className="relative z-10 flex flex-row items-center gap-3 border-b border-white/5 pb-2 pt-3 px-3">
                  <div className="relative">
                    <Avatar className={cn('h-10 w-10 ring-2 shadow-sm', tone.ring, !log && 'animate-pulse')}>
                      <AvatarFallback className={cn('font-medium text-sm', tone.fallback)}>{initials}</AvatarFallback>
                    </Avatar>
                    {!log && (
                      <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse ring-2 ring-zinc-900"></div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="truncate text-sm font-semibold text-foreground">{profile.email}</CardTitle>
                      {isOwn && (
                        <Badge className="border-0 bg-primary text-black shadow-none font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 whitespace-nowrap rounded-full">
                          You
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 flex-wrap w-full">
                      <div className="flex items-center gap-2 flex-wrap">
                        {!log ? (
                          <Badge className="border-0 bg-rose-500/10 text-rose-300 shadow-none font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 whitespace-nowrap rounded-full animate-pulse">
                            Not Logged
                          </Badge>
                        ) : (
                          <Badge className={`${tone.bg} ${tone.text} border-0 shadow-none font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 whitespace-nowrap rounded-full`}>
                            {STATUS_LABELS[log.status]}
                          </Badge>
                        )}
                      </div>
                      {isOwn && (
                        <div className={`flex items-center gap-1 text-[10px] font-medium ${getSaveStatusColor()}`}>
                          <span>{getSaveStatusIcon()}</span>
                          <span>
                            {saveStatus === 'saving' && 'Saving'}
                            {saveStatus === 'saved' && 'Saved'}
                            {saveStatus === 'error' && 'Save failed'}
                            {saveStatus === 'idle' && lastSaved && `Saved ${formatTimeAgo(lastSaved)}`}
                            {saveStatus === 'idle' && !lastSaved && 'Not saved yet'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative z-10 px-3 pb-3 pt-2.5">
                  {isOwn ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        className={`w-full resize-none rounded-xl bg-black/25 px-3 py-2.5 text-sm leading-6 outline-none border transition-all placeholder:text-muted-foreground/80 shadow-inner min-h-[52px] max-h-24 ${
                          saveStatus === 'saving' ? 'border-yellow-400/60 focus:border-yellow-400 focus:ring-yellow-400/20' :
                          saveStatus === 'saved' ? 'border-emerald-400/60 focus:border-emerald-400 focus:ring-emerald-400/20' :
                          saveStatus === 'error' ? 'border-red-400/60 focus:border-red-400 focus:ring-red-400/20' :
                          'border-white/8 focus:border-primary/50 focus:ring-primary/20'
                        }`}
                        placeholder="What are you working on today?"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onCompositionStart={() => { isComposing.current = true }}
                        onCompositionEnd={() => { isComposing.current = false }}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                        Today&apos;s Tasks
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed min-h-8">
                        {log?.activities ?? <span className="text-zinc-500 italic">No tasks logged yet.</span>}
                      </p>
                      {!log && (
                        <div className="flex items-center gap-2 mt-4 bg-rose-500/10 px-3 py-2 rounded-lg">
                          <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                          <span className="text-xs text-rose-400 font-medium">Status not logged</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
