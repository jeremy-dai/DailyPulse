'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/app/utils/supabase/client'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Profile, DailyLog, WorkStatus } from '@/types/supabase'

type ExtendedStatus = WorkStatus | 'unknown'

const STATUS_COLORS: Record<ExtendedStatus, { bg: string, text: string, border: string }> = {
  in_office: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' },
  wfh: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20' },
  off: { bg: 'bg-zinc-500/10', text: 'text-zinc-600 dark:text-zinc-400', border: 'border-zinc-500/20' },
  sick: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20' },
  vacation: { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/20' },
  unknown: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/20' },
}

const STATUS_LABELS: Record<ExtendedStatus, string> = {
  in_office: 'In Office',
  wfh: 'Work From Home',
  off: 'Off',
  sick: 'Sick',
  vacation: 'Vacation',
  unknown: 'Not Logged',
}

const STATUS_ORDER: ExtendedStatus[] = ['in_office', 'wfh', 'off', 'sick', 'vacation', 'unknown']

interface Props {
  date: string
  initialProfiles: Profile[]
  initialLogs: DailyLog[]
}

import { motion } from 'framer-motion'

export default function TopDashboard({ date, initialProfiles, initialLogs }: Props) {
  const supabase = createClient()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [logs, setLogs] = useState<DailyLog[]>(initialLogs)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id)
    })
  }, [supabase])

  const userLog = currentUserId ? logs.find((l) => l.user_id === currentUserId) : null

  const handleStatusChange = async (newStatus: WorkStatus | null) => {
    if (!currentUserId || !newStatus) return

    if (userLog) {
      const { data } = await supabase
        .from('daily_logs')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', userLog.id)
        .select()
        .single()
      if (data) setLogs((prev) => [...prev.filter((l) => l.id !== userLog.id), data])
    } else {
      const { data } = await supabase
        .from('daily_logs')
        .insert({ user_id: currentUserId, date, status: newStatus })
        .select()
        .single()
      if (data) setLogs((prev) => [...prev, data])
    }
  }

  useEffect(() => {
    const channel = supabase
      .channel(`top-dashboard-${date}`)
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

  const grouped = STATUS_ORDER.reduce<Record<ExtendedStatus, Profile[]>>(
    (acc, status) => ({ ...acc, [status]: [] }),
    {} as Record<ExtendedStatus, Profile[]>
  )
  for (const profile of initialProfiles) {
    const log = logs.find((l) => l.user_id === profile.id)
    const status: ExtendedStatus = log ? log.status : 'unknown'
    grouped[status].push(profile)
  }

  const displayDate = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="sticky top-0 z-10 bg-background/60 backdrop-blur-xl border-b border-border/50 p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{displayDate}</h1>
        {currentUserId && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Your status:</span>
            <Select
              value={userLog?.status ?? null}
              onValueChange={(v) => handleStatusChange(v as WorkStatus)}
            >
              <SelectTrigger className="w-48 bg-background/50 border-border/50 shadow-sm focus:ring-primary/20 transition-all">
                <SelectValue placeholder="Set status…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_office">In Office</SelectItem>
                <SelectItem value="wfh">Work From Home</SelectItem>
                <SelectItem value="off">Off</SelectItem>
                <SelectItem value="sick">Sick</SelectItem>
                <SelectItem value="vacation">Vacation</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {STATUS_ORDER.map((status) => (
          <motion.div
            whileHover={{ y: -2, scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            key={status}
            className={`rounded-2xl overflow-hidden border ${STATUS_COLORS[status].border} bg-background/50 shadow-sm backdrop-blur-sm`}
          >
            <div className={`${STATUS_COLORS[status].bg} ${STATUS_COLORS[status].text} px-3 py-2.5 flex items-center justify-between border-b ${STATUS_COLORS[status].border}`}>
              <span className="text-xs font-bold uppercase tracking-wider">{STATUS_LABELS[status]}</span>
              <Badge className={`bg-background/80 ${STATUS_COLORS[status].text} text-xs border-0 px-2 py-0 shadow-sm font-bold`}>
                {grouped[status].length}
              </Badge>
            </div>
            <div className="p-3 min-h-[4.5rem] max-h-32 overflow-y-auto scrollbar-hide">
              <div className="flex flex-wrap gap-1.5">
                {grouped[status].map((profile) => {
                  const userLog = logs.find((l) => l.user_id === profile.id)
                  const hasNoTasks = !userLog?.activities && (status === 'in_office' || status === 'wfh' || status === 'unknown')
                  
                  return (
                    <div key={profile.id} className="relative group">
                      <Avatar 
                        className={`h-7 w-7 ring-2 ring-background shadow-sm hover:scale-110 transition-transform ${
                          hasNoTasks ? 'ring-rose-500/50' : ''
                        }`} 
                        title={profile.name ?? profile.email}
                      >
                        <AvatarImage
                          src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.name ?? profile.email)}`}
                        />
                        <AvatarFallback className={`text-[10px] font-medium ${
                          hasNoTasks ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-muted text-muted-foreground'
                        }`}>
                          {(profile.name ?? profile.email).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {hasNoTasks && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 animate-pulse"></div>
                      )}
                    </div>
                  )
                })}
              </div>
              {status === 'unknown' && grouped[status].length > 0 && (
                <div className="mt-2 text-xs text-rose-600 dark:text-rose-400 font-medium">
                  ⚠️ {grouped[status].length} team member{grouped[status].length > 1 ? 's' : ''} not logged
                </div>
              )}
              {(status === 'in_office' || status === 'wfh') && grouped[status].some(p => {
                const userLog = logs.find((l) => l.user_id === p.id)
                return !userLog?.activities
              }) && (
                <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                  ⚠️ {grouped[status].filter(p => !logs.find((l) => l.user_id === p.id)?.activities).length} team member{grouped[status].filter(p => !logs.find((l) => l.user_id === p.id)?.activities).length > 1 ? 's' : ''} without tasks
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
