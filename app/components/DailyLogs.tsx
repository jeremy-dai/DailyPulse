'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/app/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Profile, DailyLog, WorkStatus } from '@/types/supabase'

import { motion } from 'framer-motion'

const STATUS_COLORS: Record<WorkStatus, { bg: string, text: string, border: string }> = {
  in_office: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' },
  wfh: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20' },
  off: { bg: 'bg-zinc-500/10', text: 'text-zinc-600 dark:text-zinc-400', border: 'border-zinc-500/20' },
  sick: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20' },
  vacation: { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/20' },
}

const STATUS_LABELS: Record<WorkStatus, string> = {
  in_office: 'In Office',
  wfh: 'Work From Home',
  off: 'Off',
  sick: 'Sick',
  vacation: 'Vacation',
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
          .insert({ user_id: currentUserId, date, activities: inputValue })
          .select()
          .single()
        if (data) {
          setLogs((prev) => [...prev, data])
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
      case 'saving': return 'text-yellow-600 dark:text-yellow-400'
      case 'saved': return 'text-emerald-600 dark:text-emerald-400'
      case 'error': return 'text-red-600 dark:text-red-400'
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

  return (
    <div className="p-4 md:p-6 w-full max-w-[1800px] mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-8 w-1 bg-primary rounded-full" />
        <h2 className="text-2xl font-bold tracking-tight">Team Daily Tasks</h2>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        {initialProfiles.map((profile) => {
          const log = logs.find((l) => l.user_id === profile.id)
          const isOwn = currentUserId === profile.id
          const initials = (profile.name ?? profile.email).charAt(0).toUpperCase()
          const displayName = profile.name ?? profile.email

          return (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2, scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            >
              <Card className={`group relative overflow-hidden border bg-background/60 backdrop-blur-md shadow-sm transition-all duration-300 hover:shadow-md h-full flex flex-col ${log ? STATUS_COLORS[log.status].border : 'border-border/50'}`}>
                {/* Subtle gradient background effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/[0.02] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                
                <CardHeader className="flex flex-row items-center gap-3 pb-2 pt-4 px-4 relative z-10">
                  <Avatar className="h-8 w-8 ring-2 ring-background shadow-sm">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`}
                    />
                    <AvatarFallback className="bg-muted text-muted-foreground font-medium text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold truncate pr-2">{displayName}</CardTitle>
                    {!log ? (
                      <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-0 shadow-none font-bold uppercase tracking-wider text-[9px] px-2 py-0.5 whitespace-nowrap animate-pulse">
                        NOT LOGGED
                      </Badge>
                    ) : (
                      <Badge className={`${STATUS_COLORS[log.status].bg} ${STATUS_COLORS[log.status].text} border-0 shadow-none font-bold uppercase tracking-wider text-[9px] px-2 py-0.5 whitespace-nowrap`}>
                        {STATUS_LABELS[log.status]}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="relative z-10 px-4 pb-4 pt-1 flex-1">
                  {isOwn ? (
                    <div className="space-y-2">
                      <textarea
                        className={`w-full resize-none bg-background/50 rounded-lg p-2.5 text-sm outline-none border transition-all placeholder:text-muted-foreground shadow-sm h-full min-h-[60px] ${
                          saveStatus === 'saving' ? 'border-yellow-400/50 focus:border-yellow-400 focus:ring-yellow-400/20' :
                          saveStatus === 'saved' ? 'border-emerald-400/50 focus:border-emerald-400 focus:ring-emerald-400/20' :
                          saveStatus === 'error' ? 'border-red-400/50 focus:border-red-400 focus:ring-red-400/20' :
                          'border-border/50 focus:border-primary/50 focus:ring-primary/20'
                        }`}
                        rows={2}
                        placeholder="What are you working on today? (Press Enter to save)"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onCompositionStart={() => { isComposing.current = true }}
                        onCompositionEnd={() => { isComposing.current = false }}
                      />
                      <div className="flex items-center justify-between text-xs">
                        <div className={`flex items-center gap-1 ${getSaveStatusColor()}`}>
                          <span>{getSaveStatusIcon()}</span>
                          <span>
                            {saveStatus === 'saving' && 'Saving...'}
                            {saveStatus === 'saved' && 'Saved'}
                            {saveStatus === 'error' && 'Save failed'}
                            {saveStatus === 'idle' && lastSaved && `Saved ${formatTimeAgo(lastSaved)}`}
                          </span>
                        </div>
                        <div className="text-muted-foreground">
                          Press Enter to save
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="whitespace-pre-wrap text-sm text-foreground/80 leading-relaxed">
                        {log?.activities ?? <span className="text-muted-foreground italic">No tasks logged yet.</span>}
                      </p>
                      {!log && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                          <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">Status not logged</span>
                        </div>
                      )}
                      {log && (log.status === 'in_office' || log.status === 'wfh') && !log.activities && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Tasks not logged</span>
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
