'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/app/utils/supabase/client'
import TopDashboard from '@/app/components/TopDashboard'
import DailyLogs from '@/app/components/DailyLogs'
import ProfileEditModal from '@/app/components/ProfileEditModal'
import ActiveDayReminder from '@/app/components/ActiveDayReminder'
import type { DailyLog, Profile } from '@/types/supabase'

interface Props {
  date: string
  initialProfiles: Profile[]
  initialLogs: DailyLog[]
}

const upsertLog = (logs: DailyLog[], nextLog: DailyLog) => {
  const filtered = logs.filter((log) => log.id !== nextLog.id)
  return [...filtered, nextLog]
}

// Payload shape emitted by realtime.broadcast_changes()
interface BroadcastPayload {
  record: DailyLog | null
  old_record: DailyLog | null
  operation: string
  schema: string
  table: string
}

export default function DayClient({ date, initialProfiles, initialLogs }: Props) {
  const [supabase] = useState(() => createClient())
  const [logs, setLogs] = useState<DailyLog[]>(initialLogs)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    setLogs(initialLogs)
  }, [initialLogs])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id)
    })
  }, [supabase])

  const currentProfile = useMemo(
    () => (currentUserId ? initialProfiles.find((p) => p.id === currentUserId) ?? null : null),
    [currentUserId, initialProfiles]
  )

  const openEdit = () => setEditOpen(true)

  useEffect(() => {
    supabase.realtime.setAuth()

    const channel = supabase
      .channel('company:daily_logs', { config: { private: true } })
      .on('broadcast', { event: 'INSERT' }, (msg) => {
        const { record } = msg.payload as BroadcastPayload
        if (record && record.date === date) setLogs((prev) => upsertLog(prev, record))
      })
      .on('broadcast', { event: 'UPDATE' }, (msg) => {
        const { record } = msg.payload as BroadcastPayload
        if (record && record.date === date) setLogs((prev) => upsertLog(prev, record))
      })
      .on('broadcast', { event: 'DELETE' }, (msg) => {
        const { old_record } = msg.payload as BroadcastPayload
        if (old_record && old_record.date === date)
          setLogs((prev) => prev.filter((l) => l.id !== old_record.id))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, date])

  const handleLogUpsert = (updated: DailyLog) => {
    setLogs((prev) => upsertLog(prev, updated))
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
      <TopDashboard
        date={date}
        initialProfiles={initialProfiles}
        logs={logs}
        onEditProfile={openEdit}
      />
      <DailyLogs
        date={date}
        initialProfiles={initialProfiles}
        logs={logs}
        onLogUpsert={handleLogUpsert}
        onEditProfile={openEdit}
      />
      <ProfileEditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        profile={currentProfile}
      />
      <ActiveDayReminder currentUserId={currentUserId} />
    </div>
  )
}
