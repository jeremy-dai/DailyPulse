import { createClient } from '@/app/utils/supabase/server'
import { redirect } from 'next/navigation'
import AdminClient from '@/app/admin/AdminClient'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!me?.is_admin) {
    redirect(`/`)
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at')

  // Count daily_logs per user so admins know what they're about to delete.
  const { data: logRows } = await supabase.from('daily_logs').select('user_id')
  const logCounts = (logRows ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.user_id] = (acc[row.user_id] ?? 0) + 1
    return acc
  }, {})

  return (
    <AdminClient
      currentUserId={user.id}
      initialProfiles={profiles ?? []}
      logCounts={logCounts}
    />
  )
}
