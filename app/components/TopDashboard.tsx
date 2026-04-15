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
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { Profile, DailyLog, WorkStatus } from '@/types/supabase'
import { ThemeToggle } from '@/components/theme-toggle'

type ExtendedStatus = WorkStatus | 'unknown'
type StatusTone = 'in_office' | 'wfh' | 'off' | 'unknown'

const STATUS_COLORS: Record<StatusTone, { bg: string, text: string, border: string, ring: string, dot: string, fallback: string }> = {
  in_office: { bg: 'bg-[var(--status-emerald-bg)]/20', text: 'text-[var(--status-emerald-text)]', border: 'border-[var(--status-emerald-border)]/50', ring: 'ring-[var(--status-emerald-bg)]/80', dot: 'bg-[var(--status-emerald-dot)]', fallback: 'bg-[var(--status-emerald-bg)]/20 text-[var(--status-emerald-text)]' },
  wfh: { bg: 'bg-[var(--status-sky-bg)]/20', text: 'text-[var(--status-sky-text)]', border: 'border-[var(--status-sky-border)]/50', ring: 'ring-[var(--status-sky-bg)]/80', dot: 'bg-[var(--status-sky-dot)]', fallback: 'bg-[var(--status-sky-bg)]/20 text-[var(--status-sky-text)]' },
  off: { bg: 'bg-[var(--status-zinc-bg)]/20', text: 'text-[var(--status-zinc-text)]', border: 'border-[var(--status-zinc-border)]/50', ring: 'ring-[var(--status-zinc-bg)]/80', dot: 'bg-[var(--status-zinc-dot)]', fallback: 'bg-muted text-muted-foreground' },
  unknown: { bg: 'bg-[var(--status-rose-bg)]/20', text: 'text-[var(--status-rose-text)]', border: 'border-[var(--status-rose-border)]/50', ring: 'ring-[var(--status-rose-bg)]/80', dot: 'bg-[var(--status-rose-dot)]', fallback: 'bg-[var(--status-rose-bg)]/20 text-[var(--status-rose-text)]' },
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
  in_office: 'bg-[var(--status-emerald-dot)]',
  wfh: 'bg-[var(--status-sky-dot)]',
  off: 'bg-[var(--status-zinc-dot)]',
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
  logs: DailyLog[]
  onLogUpsert: (log: DailyLog) => void
}

import { motion } from 'framer-motion'

export default function TopDashboard({ date, initialProfiles, logs, onLogUpsert }: Props) {
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

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id)
    })
  }, [supabase])

  const currentProfile = currentUserId ? initialProfiles.find((p) => p.id === currentUserId) : null
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
      if (data) onLogUpsert(data)
    } else {
      const { data } = await supabase
        .from('daily_logs')
        .upsert({ user_id: currentUserId, date, status: newStatus }, { onConflict: 'user_id,date' })
        .select()
        .single()
      if (data) onLogUpsert(data)
    }
  }

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
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border/10 p-3">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-lg font-bold tracking-tight text-foreground">{displayDate}</h1>
        {currentUserId && (
          <div className="flex items-center gap-3">
            <Select
              value={userLog?.status ?? null}
              onValueChange={(v) => handleStatusChange(v as WorkStatus)}
            >
              <SelectTrigger className={cn(
                "w-52 border shadow-sm focus:ring-primary/20 transition-all rounded-full font-medium",
                userLog?.status
                  ? "bg-card border-border text-foreground"
                  : "bg-muted border-dashed border-border text-muted-foreground"
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
              <SelectContent alignItemWithTrigger={false} sideOffset={6} className="bg-card border-border rounded-xl p-1">
                {(['in_office', 'wfh', 'off', 'sick', 'vacation'] as WorkStatus[]).map((status) => (
                  <SelectItem key={status} value={status} className="rounded-lg focus:bg-muted cursor-pointer">
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
                  className="w-36 rounded-full border border-border/30 bg-muted px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
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
                  className="rounded-full border border-border/20 bg-muted px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-border/50 hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setNameValue(currentProfile?.name ?? ''); setEditingName(true) }}
                className="rounded-full border border-border/20 bg-muted px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-border/50 hover:text-foreground"
                title="Edit display name"
              >
                {currentProfile?.name || currentProfile?.email || 'Set name'}
              </button>
            )}
            <button
              onClick={handleSignOut}
              className="rounded-full border border-border/20 bg-muted px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-border/50 hover:text-foreground"
            >
              Sign out
            </button>
            <ThemeToggle />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {STATUS_ORDER.map((status) => (
          <motion.div
            whileHover={{ y: -2, scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            key={status}
            className={`rounded-2xl bg-card border border-border shadow-sm transition-colors hover:border-primary/20`}
          >
            <div className={`px-3 py-2 flex items-center justify-between`}>
              <span className="text-xs font-semibold text-muted-foreground">{STATUS_LABELS[status]}</span>
              <Badge className={`bg-foreground/5 ${STATUS_COLORS[getStatusTone(status)].text} text-xs border-0 px-2 py-0 shadow-none font-bold rounded-full`}>
                {grouped[status].length}
              </Badge>
            </div>
            <div className="px-3 pt-1 pb-3 min-h-[3.5rem]">
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                {grouped[status].map((profile) => {
                  const userLog = logs.find((l) => l.user_id === profile.id)
                  const hasNoTasks = !userLog?.activities?.trim() && (status === 'in_office' || status === 'wfh')
                  const tone = STATUS_COLORS[getStatusTone(status)]
                  const displayName = profile.name || profile.email.split('@')[0]

                  return (
                    <div
                      key={profile.id}
                      title={profile.email}
                      className={cn(
                        'truncate text-xs py-0.5 font-medium',
                        tone.text,
                        hasNoTasks && 'text-[var(--status-amber-text)]',
                        status === 'unknown' && 'text-[var(--status-rose-text)] animate-pulse'
                      )}
                    >
                      {displayName}
                    </div>
                  )
                })}
              </div>
              {status === 'unknown' && grouped[status].length > 0 && (
                <div className="mt-3 text-[10px] text-[var(--status-rose-text)] font-medium uppercase tracking-wider">
                  Warning: {grouped[status].length} team member{grouped[status].length === 1 ? '' : 's'} not logged
                </div>
              )}
              {(status === 'in_office' || status === 'wfh') && grouped[status].some(p => {
                const userLog = logs.find((l) => l.user_id === p.id)
                return !userLog?.activities?.trim()
              }) && (
                <div className="mt-3 text-[10px] text-[var(--status-amber-text)] font-medium uppercase tracking-wider">
                  Warning: {grouped[status].filter(p => !logs.find((l) => l.user_id === p.id)?.activities?.trim()).length} without tasks
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      {(unknownCount > 0 || missingTasksCount > 0) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {unknownCount > 0 && (
            <div className="rounded-full border border-[var(--status-rose-border)]/50 bg-[var(--status-rose-bg)]/20 px-3 py-1 text-xs font-semibold text-[var(--status-rose-text)]">
              Warning: {unknownCount} team member{unknownCount === 1 ? '' : 's'} not logged
            </div>
          )}
          {missingTasksCount > 0 && (
            <div className="rounded-full border border-[var(--status-amber-border)]/50 bg-[var(--status-amber-bg)]/20 px-3 py-1 text-xs font-semibold text-[var(--status-amber-text)]">
              Warning: {missingTasksCount} team member{missingTasksCount === 1 ? '' : 's'} without tasks
            </div>
          )}
        </div>
      )}
    </div>
  )
}
