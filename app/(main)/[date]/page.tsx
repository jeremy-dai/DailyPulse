import { createClient } from '@/app/utils/supabase/server'
import { redirect } from 'next/navigation'
import DayClient from '@/app/(main)/DayClient'

const isValidDate = (dateStr: string) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(dateStr)) return false
  const date = new Date(dateStr)
  return !isNaN(date.getTime())
}

export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params

  if (!isValidDate(date)) {
    redirect(`/`)
  }

  const supabase = await createClient()
  const { data: profiles } = await supabase.from('profiles').select('*').order('created_at')
  const { data: logs } = await supabase.from('daily_logs').select('*').eq('date', date)

  // Hidden profiles only appear if they actually logged that day.
  const loggedUserIds = new Set((logs ?? []).map((l) => l.user_id))
  const visibleProfiles = (profiles ?? []).filter(
    (p) => !p.is_hidden || loggedUserIds.has(p.id)
  )

  return (
    <DayClient date={date} initialProfiles={visibleProfiles} initialLogs={logs ?? []} />
  )
}
