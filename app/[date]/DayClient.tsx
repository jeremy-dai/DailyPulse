'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/app/utils/supabase/client'
import TopDashboard from '@/app/components/TopDashboard'
import DailyLogs from '@/app/components/DailyLogs'
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

export default function DayClient({ date, initialProfiles, initialLogs }: Props) {
  const [supabase] = useState(() => createClient())
  const [logs, setLogs] = useState<DailyLog[]>(initialLogs)

  useEffect(() => {
    setLogs(initialLogs)
  }, [initialLogs])

  useEffect(() => {
    const channel = supabase
      .channel(`day-client-${date}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_logs', filter: `date=eq.${date}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const deleted = payload.old as DailyLog
            setLogs((prev) => prev.filter((log) => log.id !== deleted.id))
            return
          }

          const updated = payload.new as DailyLog
          setLogs((prev) => upsertLog(prev, updated))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, date])

  const handleLogUpsert = (updated: DailyLog) => {
    setLogs((prev) => upsertLog(prev, updated))
  }

  return (
    <>
      <TopDashboard
        date={date}
        initialProfiles={initialProfiles}
        logs={logs}
        onLogUpsert={handleLogUpsert}
      />
      <DailyLogs
        date={date}
        initialProfiles={initialProfiles}
        logs={logs}
        onLogUpsert={handleLogUpsert}
      />
    </>
  )
}
