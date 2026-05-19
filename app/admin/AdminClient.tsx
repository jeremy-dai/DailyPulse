'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/utils/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Profile } from '@/types/supabase'

interface Props {
  currentUserId: string
  initialProfiles: Profile[]
  logCounts: Record<string, number>
}

const getInitials = (input: string) =>
  input
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('') || '?'

export default function AdminClient({ currentUserId, initialProfiles, logCounts }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const updateProfile = async (id: string, patch: Partial<Profile>) => {
    setBusyId(id)
    setError(null)
    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    setBusyId(null)
    if (error || !data) {
      setError(error?.message ?? 'Update failed')
      return
    }
    setProfiles((prev) => prev.map((p) => (p.id === id ? (data as Profile) : p)))
  }

  const deleteUser = async (profile: Profile) => {
    const logCount = logCounts[profile.id] ?? 0
    const displayName = profile.name || profile.email
    const confirmed = window.confirm(
      `Delete ${displayName}?\n\nThis removes their profile and ${logCount} daily log${logCount === 1 ? '' : 's'} permanently. Their auth account stays, so signing in again would recreate an empty profile.`
    )
    if (!confirmed) return

    setBusyId(profile.id)
    setError(null)
    // ON DELETE CASCADE on daily_logs.user_id removes the logs automatically.
    const { error } = await supabase.from('profiles').delete().eq('id', profile.id)
    setBusyId(null)
    if (error) {
      setError(error.message)
      return
    }
    setProfiles((prev) => prev.filter((p) => p.id !== profile.id))
    router.refresh()
  }

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
          <p className="text-sm text-muted-foreground">
            Hide users who don&apos;t need to log, or delete a user and all their daily logs.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-full border border-border/20 bg-muted px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-border/50 hover:text-foreground"
        >
          Back
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm ring-1 ring-foreground/10">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Logs</th>
              <th className="px-4 py-3 text-left">Admin</th>
              <th className="px-4 py-3 text-left">Hidden</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => {
              const isSelf = profile.id === currentUserId
              const isBusy = busyId === profile.id
              const displayName = profile.name || profile.email.split('@')[0]
              const initials = getInitials(profile.name ?? profile.email)
              const logCount = logCounts[profile.id] ?? 0

              return (
                <tr key={profile.id} className="border-t border-border/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        {profile.avatar_url ? (
                          <AvatarImage src={profile.avatar_url} alt={displayName} />
                        ) : null}
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{displayName}</div>
                        <div className="text-xs text-muted-foreground truncate">{profile.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{logCount}</td>
                  <td className="px-4 py-3">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={profile.is_admin}
                        disabled={isBusy || isSelf}
                        onChange={(e) => updateProfile(profile.id, { is_admin: e.target.checked })}
                        className="h-4 w-4 rounded border-border"
                      />
                      {isSelf && <Badge className="text-[10px]">you</Badge>}
                    </label>
                  </td>
                  <td className="px-4 py-3">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={profile.is_hidden}
                        disabled={isBusy}
                        onChange={(e) => updateProfile(profile.id, { is_hidden: e.target.checked })}
                        className="h-4 w-4 rounded border-border"
                      />
                    </label>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={isBusy || isSelf}
                      onClick={() => deleteUser(profile)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Hidden users still see the site but aren&apos;t shown in the daily list unless they log that day.
      </p>
    </div>
  )
}
