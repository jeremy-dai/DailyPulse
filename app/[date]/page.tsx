import { createClient } from '@/app/utils/supabase/server'
import { redirect } from 'next/navigation'
import DayPanel from '@/app/components/DayPanel'
import TopDashboard from '@/app/components/TopDashboard'
import DailyLogs from '@/app/components/DailyLogs'

const isValidDate = (dateStr: string) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(dateStr)) return false
  const date = new Date(dateStr)
  return !isNaN(date.getTime())
}

export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params

  if (!isValidDate(date)) {
    redirect(`/${new Date().toISOString().split('T')[0]}`)
  }

  const supabase = await createClient()
  const { data: profiles } = await supabase.from('profiles').select('*')
  const { data: logs } = await supabase.from('daily_logs').select('*').eq('date', date)

  return (
    <div className="flex">
      <DayPanel />
      <div className="flex-1 flex flex-col min-h-screen">
        <TopDashboard date={date} initialProfiles={profiles ?? []} initialLogs={logs ?? []} />
        <DailyLogs date={date} initialProfiles={profiles ?? []} initialLogs={logs ?? []} />
      </div>
    </div>
  )
}
