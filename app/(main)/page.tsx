import { createClient } from '@/app/utils/supabase/server'
import DayClient from '@/app/(main)/DayClient'

export const dynamic = 'force-dynamic'

export default async function TodayPage() {
  const date = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' })

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
