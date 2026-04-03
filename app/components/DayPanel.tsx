'use client'
import { useParams, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

const generateDates = () => {
  const today = new Date()
  const dates: Date[] = []

  const startDate = new Date(today)
  startDate.setDate(today.getDate() - 7)

  const endDate = new Date(today)
  const daysToAdd = today.getDay() === 6 ? 21 : 14
  endDate.setDate(today.getDate() + daysToAdd)

  let current = new Date(startDate)
  while (current <= endDate) {
    dates.push(new Date(current))
    current = new Date(current.setDate(current.getDate() + 1))
  }

  return dates
}

export default function DayPanel() {
  const params = useParams()
  const router = useRouter()
  const dates = generateDates()
  const todayStr = new Date().toISOString().split('T')[0]
  const selectedDate = params.date as string

  return (
    <div className="w-52 border-r bg-background/50 backdrop-blur-md h-screen sticky top-0 flex flex-col shrink-0 z-20">
      <div className="p-6 border-b border-border/50">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Days</h2>
      </div>
      <div className="overflow-y-auto flex-1 p-3 space-y-1 scrollbar-hide">
        {dates.map((date) => {
          const dateStr = date.toISOString().split('T')[0]
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedDate
          const isWeekend = date.getDay() === 0 || date.getDay() === 6

          return (
            <button
              key={dateStr}
              onClick={() => router.push(`/${dateStr}`)}
              className={cn(
                'relative w-full text-left px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer group',
                isSelected
                  ? 'text-primary-foreground'
                  : isToday
                    ? 'text-primary font-semibold hover:bg-accent/50'
                    : isWeekend
                      ? 'text-muted-foreground/60 hover:bg-accent/50 hover:text-muted-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              )}
            >
              {isSelected && (
                <motion.div
                  layoutId="active-date"
                  className="absolute inset-0 bg-primary rounded-xl"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <div className="relative z-10 flex flex-col gap-0.5">
                <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className="text-sm font-medium">
                  {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
