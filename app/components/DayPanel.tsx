'use client'
import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

const getDaysInMonth = (year: number, month: number): Date[] => {
  const days: Date[] = []
  const date = new Date(year, month, 1)
  while (date.getMonth() === month) {
    days.push(new Date(date))
    date.setDate(date.getDate() + 1)
  }
  return days
}

export default function DayPanel() {
  const params = useParams()
  const router = useRouter()
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const selectedDate = params.date as string

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const todayRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    todayRef.current?.scrollIntoView({ block: 'center', behavior: 'instant' })
  }, [])

  const dates = getDaysInMonth(viewYear, viewMonth)

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(y => y - 1)
      setViewMonth(11)
    } else {
      setViewMonth(m => m - 1)
    }
  }

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(y => y + 1)
      setViewMonth(0)
    } else {
      setViewMonth(m => m + 1)
    }
  }

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="w-64 bg-background border-r border-border/10 h-screen sticky top-0 flex flex-col shrink-0 z-20">
      <div className="p-6">
        <h1 className="text-xl font-bold flex items-center gap-2 text-primary">
          <div className="w-6 h-6 rounded-md bg-primary text-black flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          DailyPulse
        </h1>
      </div>
      <div className="px-6 pb-4">
        <h2 className="text-sm font-semibold text-muted-foreground mb-4">Schedule</h2>
        <div className="flex justify-between items-center bg-zinc-900 rounded-full p-1 mb-2">
          <button
            onClick={goToPrevMonth}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-zinc-800 text-muted-foreground transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div className="text-sm font-medium">{monthLabel}</div>
          <button
            onClick={goToNextMonth}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-zinc-800 text-muted-foreground transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      </div>
      <div className="overflow-y-auto flex-1 px-4 space-y-1 scrollbar-hide pb-6">
        {dates.map((date) => {
          const dateStr = date.toISOString().split('T')[0]
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedDate
          const isWeekend = date.getDay() === 0 || date.getDay() === 6

          return (
            <button
              key={dateStr}
              ref={isToday ? todayRef : undefined}
              onClick={() => router.push(`/${dateStr}`)}
              className={cn(
                'relative w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-200 cursor-pointer group',
                isSelected
                  ? 'text-black font-semibold'
                  : isToday
                    ? 'text-primary font-semibold hover:bg-zinc-900'
                    : isWeekend
                      ? 'text-muted-foreground/60 hover:bg-zinc-900 hover:text-muted-foreground'
                      : 'text-muted-foreground hover:bg-zinc-900 hover:text-foreground'
              )}
            >
              {isSelected && (
                <motion.div
                  layoutId="active-date"
                  className="absolute inset-0 bg-primary rounded-2xl"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <div className="relative z-10 flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold", isSelected ? "bg-black/10" : "bg-zinc-900")}>
                  {date.getDate()}
                </div>
                <div className="flex flex-col items-start">
                  <div className="text-sm font-medium">
                    {date.toLocaleDateString('en-US', { weekday: 'long' })}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
