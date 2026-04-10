import { createClient } from '@/app/utils/supabase/server'
import { redirect } from 'next/navigation'
import DayClient from '@/app/[date]/DayClient'

const isValidDate = (dateStr: string) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(dateStr)) return false
  const date = new Date(dateStr)
  return !isNaN(date.getTime())
}

export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params

  if (!isValidDate(date)) {
    redirect(`/${new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' })}`)
  }

  const supabase = await createClient()
  const { data: profiles } = await supabase.from('profiles').select('*')
  const { data: logs } = await supabase.from('daily_logs').select('*').eq('date', date)

  return (
    <DayClient date={date} initialProfiles={profiles ?? []} initialLogs={logs ?? []} />
  )
}
