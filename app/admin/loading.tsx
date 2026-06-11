import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
          <p className="text-sm text-muted-foreground">
            Hide users who don&apos;t need to log, or delete a user and all their daily logs.
          </p>
        </div>
        <div className="h-9 w-16 rounded-full bg-muted" />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm ring-1 ring-foreground/10">
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading users…
        </div>
      </div>
    </div>
  )
}
