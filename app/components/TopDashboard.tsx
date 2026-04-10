'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/utils/supabase/client'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn, getInitials } from '@/lib/utils'
import type { Profile, DailyLog, WorkStatus } from '@/types/supabase'

type ExtendedStatus = WorkStatus | 'unknown'
type StatusTone = 'in_office' | 'wfh' | 'off' | 'unknown'

const STATUS_COLORS: Record<StatusTone, { bg: string, text: string, border: string, ring: string, dot: string, fallback: string }> = {
  in_office: { bg: 'bg-emerald-500/12', text: 'text-emerald-300', border: 'border-emerald-500/30', ring: 'ring-emerald-500/70', dot: 'bg-emerald-400', fallback: 'bg-emerald-500/18 text-emerald-200' },
  wfh: { bg: 'bg-sky-500/12', text: 'text-sky-300', border: 'border-sky-500/30', ring: 'ring-sky-500/70', dot: 'bg-sky-400', fallback: 'bg-sky-500/18 text-sky-200' },
  off: { bg: 'bg-zinc-500/12', text: 'text-zinc-300', border: 'border-zinc-500/30', ring: 'ring-zinc-500/70', dot: 'bg-zinc-400', fallback: 'bg-zinc-700 text-zinc-200' },
  unknown: { bg: 'bg-rose-500/12', text: 'text-rose-300', border: 'border-rose-500/30', ring: 'ring-rose-500/70', dot: 'bg-rose-400', fallback: 'bg-rose-500/18 text-rose-200' },
}

const STATUS_LABELS: Record<ExtendedStatus, string> = {
  in_office: 'In Office',
  wfh: 'Work From Home',
  off: 'Off',
  sick: 'Sick',
  vacation: 'Vacation',
  unknown: 'Not Logged',
}

const STATUS_DOT_COLORS: Record<string, string> = {
  in_office: 'bg-emerald-400',
  wfh: 'bg-sky-400',
  off: 'bg-zinc-400',
  sick: 'bg-amber-400',
  vacation: 'bg-violet-400',
}

const STATUS_ORDER: ExtendedStatus[] = ['in_office', 'wfh', 'off', 'sick', 'vacation', 'unknown']

const getStatusTone = (status: ExtendedStatus): StatusTone => {
  if (status === 'in_office' || status === 'wfh' || status === 'unknown') return status
  return 'off'
}

interface Props {
  date: string
  initialProfiles: Profile[]
  initialLogs: DailyLog[]
}

import { motion } from 'framer-motion'

export default function TopDashboard({ date, initialProfiles, initialLogs }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [nameSaving, setNameSaving] = useState(false)

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleSaveName() {
    if (!currentUserId) return
    setNameSaving(true)
    await supabase.from('profiles').update({ name: nameValue.trim() || null }).eq('id', currentUserId)
    setNameSaving(false)
    setEditingName(false)
    router.refresh()
  }

  const [logs, setLogs] = useState<DailyLog[]>(initialLogs)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id)
    })
  }, [supabase])

  const currentProfile = currentUserId ? initialProfiles.find((p) => p.id === currentUserId) : null
  const userLog = currentUserId ? logs.find((l) => l.user_id === currentUserId) : null

  useEffect(() => {
    if (currentProfile?.name != null) setNameValue(currentProfile.name)
  }, [currentProfile?.name])

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
        .upsert({ user_id: currentUserId, date, status: newStatus }, { onConflict: 'user_id,date' })
        .select()
        .single()
      if (data) setLogs((prev) => [...prev.filter((l) => l.user_id !== currentUserId), data])
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

  const unknownCount = grouped.unknown.length
  const missingTasksCount = initialProfiles.filter((profile) => {
    const log = logs.find((entry) => entry.user_id === profile.id)
    return !!log && (log.status === 'in_office' || log.status === 'wfh') && !log.activities?.trim()
  }).length

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/10 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{displayDate}</h1>
        {currentUserId && (
          <div className="flex items-center gap-3">
            <Select
              value={userLog?.status ?? null}
              onValueChange={(v) => handleStatusChange(v as WorkStatus)}
            >
              <SelectTrigger className={cn(
                "w-52 border shadow-sm focus:ring-primary/20 transition-all rounded-full font-medium",
                userLog?.status
                  ? "bg-zinc-800 border-zinc-600 text-foreground"
                  : "bg-zinc-900 border-dashed border-zinc-600 text-muted-foreground"
              )}>
                <div className="flex items-center gap-2">
                  {userLog?.status && (
                    <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", STATUS_DOT_COLORS[userLog.status])} />
                  )}
                  <span className={userLog?.status ? undefined : "text-muted-foreground"}>
                    {userLog?.status ? STATUS_LABELS[userLog.status] : "Set your status…"}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false} sideOffset={6} className="bg-zinc-800 border-zinc-600 rounded-xl p-1">
                {(['in_office', 'wfh', 'off', 'sick', 'vacation'] as WorkStatus[]).map((status) => (
                  <SelectItem key={status} value={status} className="rounded-lg focus:bg-zinc-700 cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", STATUS_DOT_COLORS[status])} />
                      <span className="font-medium">{STATUS_LABELS[status]}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  type="text"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName()
                    if (e.key === 'Escape') setEditingName(false)
                  }}
                  placeholder="Display name"
                  className="w-36 rounded-full border border-border/30 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <button
                  onClick={handleSaveName}
                  disabled={nameSaving}
                  className="rounded-full bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
                >
                  {nameSaving ? '…' : 'Save'}
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="rounded-full border border-border/20 bg-zinc-900 px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-border/50 hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setNameValue(currentProfile?.name ?? ''); setEditingName(true) }}
                className="rounded-full border border-border/20 bg-zinc-900 px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-border/50 hover:text-foreground"
                title="Edit display name"
              >
                {currentProfile?.name || currentProfile?.email || 'Set name'}
              </button>
            )}
            <button
              onClick={handleSignOut}
              className="rounded-full border border-border/20 bg-zinc-900 px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-border/50 hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {STATUS_ORDER.map((status) => (
          <motion.div
            whileHover={{ y: -2, scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            key={status}
            className={`rounded-3xl bg-zinc-900 shadow-sm`}
          >
            <div className={`px-4 py-3 flex items-center justify-between`}>
              <span className="text-xs font-semibold text-zinc-400">{STATUS_LABELS[status]}</span>
              <Badge className={`bg-black/20 ${STATUS_COLORS[getStatusTone(status)].text} text-xs border-0 px-2 py-0 shadow-none font-bold rounded-full`}>
                {grouped[status].length}
              </Badge>
            </div>
            <div className="px-4 pt-2 pb-4 min-h-[4.5rem]">
              <div className="flex flex-wrap gap-1.5">
                {grouped[status].map((profile) => {
                  const userLog = logs.find((l) => l.user_id === profile.id)
                  const hasNoTasks = !userLog?.activities?.trim() && (status === 'in_office' || status === 'wfh')
                  const tone = STATUS_COLORS[getStatusTone(status)]
                  const avatarLabel = getInitials(profile.name ?? profile.email)
                  
                  return (
                    <div key={profile.id} className="relative group hover:z-50">
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-full border border-white/10 bg-black/90 px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-lg transition-all duration-200 group-hover:-translate-y-1 group-hover:opacity-100 whitespace-nowrap">
                        {profile.email}
                      </div>
                      <Avatar 
                        className={cn(
                          'h-8 w-8 ring-2 shadow-sm transition-transform hover:scale-110',
                          tone.ring,
                          status === 'unknown' && 'animate-pulse',
                          hasNoTasks && 'ring-amber-400/80'
                        )}
                      >
                        <AvatarFallback className={cn(
                          'text-[10px] font-medium',
                          tone.fallback
                        )}>
                          {avatarLabel}
                        </AvatarFallback>
                      </Avatar>
                      {status === 'unknown' && (
                        <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse ring-2 ring-zinc-900"></div>
                      )}
                      {hasNoTasks && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse ring-2 ring-zinc-900"></div>
                      )}
                    </div>
                  )
                })}
              </div>
              {status === 'unknown' && grouped[status].length > 0 && (
                <div className="mt-3 text-[10px] text-rose-400 font-medium uppercase tracking-wider">
                  Warning: {grouped[status].length} team member{grouped[status].length === 1 ? '' : 's'} not logged
                </div>
              )}
              {(status === 'in_office' || status === 'wfh') && grouped[status].some(p => {
                const userLog = logs.find((l) => l.user_id === p.id)
                return !userLog?.activities?.trim()
              }) && (
                <div className="mt-3 text-[10px] text-amber-400 font-medium uppercase tracking-wider">
                  Warning: {grouped[status].filter(p => !logs.find((l) => l.user_id === p.id)?.activities?.trim()).length} without tasks
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      {(unknownCount > 0 || missingTasksCount > 0) && (
        <div className="mt-4 flex flex-wrap gap-3">
          {unknownCount > 0 && (
            <div className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300">
              Warning: {unknownCount} team member{unknownCount === 1 ? '' : 's'} not logged
            </div>
          )}
          {missingTasksCount > 0 && (
            <div className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
              Warning: {missingTasksCount} team member{missingTasksCount === 1 ? '' : 's'} without tasks
            </div>
          )}
        </div>
      )}
    </div>
  )
}
