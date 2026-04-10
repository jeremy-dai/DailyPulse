import { Skeleton } from '@/components/ui/skeleton'

const dashboardCards = Array.from({ length: 6 }, (_, index) => index)
const taskCards = Array.from({ length: 8 }, (_, index) => index)

export default function Loading() {
  return (
    <>
      <div className="border-b border-border/10 bg-background/95 p-6 backdrop-blur-xl">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <Skeleton className="h-8 w-64 rounded-full" />
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-11 w-52 rounded-full" />
            <Skeleton className="h-11 w-36 rounded-full" />
            <Skeleton className="h-11 w-24 rounded-full" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {dashboardCards.map((card) => (
            <div
              key={card}
              className="rounded-3xl border border-white/10 bg-zinc-900/90 p-4 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <Skeleton className="h-3 w-20 rounded-full" />
                <Skeleton className="h-5 w-8 rounded-full" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
              <Skeleton className="mt-4 h-3 w-28 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1800px] p-4 md:p-6">
        <div className="mb-6 flex items-center gap-3">
          <Skeleton className="h-8 w-1 rounded-full bg-primary/30" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-52 rounded-full" />
            <Skeleton className="h-4 w-80 max-w-full rounded-full" />
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
          {taskCards.map((card) => (
            <div
              key={card}
              className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 shadow-sm"
            >
              <div className="flex items-center gap-3 border-b border-white/5 px-3 py-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-40 max-w-full rounded-full" />
                  <Skeleton className="h-3 w-24 rounded-full" />
                </div>
              </div>
              <div className="space-y-3 px-3 py-3">
                <Skeleton className="h-4 w-24 rounded-full" />
                <Skeleton className="h-4 w-full rounded-full" />
                <Skeleton className="h-4 w-5/6 rounded-full" />
                <Skeleton className="h-4 w-2/3 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
