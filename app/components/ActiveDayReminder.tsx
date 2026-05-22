'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, X } from 'lucide-react'
import { createClient } from '@/app/utils/supabase/client'
import { useLocale } from '@/app/components/locale-provider'

interface Props {
  currentUserId: string | null
}

export default function ActiveDayReminder({ currentUserId }: Props) {
  const { locale } = useLocale()
  const [show, setShow] = useState(false)
  const [missedDate, setMissedDate] = useState<string | null>(null)

  useEffect(() => {
    if (!currentUserId) return

    const checkMissedLog = async () => {
      const supabase = createClient()
      
      // We check relative to today's date
      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' })
      
      // 1. Get the last active date with >5 logs
      const { data: lastActiveDate, error: rpcError } = await supabase
        .rpc('get_last_active_date', { min_logs: 5, current_date_str: todayStr })

      if (rpcError || !lastActiveDate) return

      // Check if we already dismissed the reminder for this specific date
      const dismissedKey = `dismissed-reminder-${currentUserId}-${lastActiveDate}`
      if (localStorage.getItem(dismissedKey)) return

      // 2. Check if current user has a log on that date
      const { data: userLog, error: logError } = await supabase
        .from('daily_logs')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('date', lastActiveDate)
        .maybeSingle()

      if (logError) return

      // If they didn't log, show the reminder
      if (!userLog) {
        setMissedDate(lastActiveDate)
        setShow(true)
      }
    }

    checkMissedLog()
  }, [currentUserId])

  const handleDismiss = () => {
    setShow(false)
    if (missedDate && currentUserId) {
      localStorage.setItem(`dismissed-reminder-${currentUserId}-${missedDate}`, 'true')
    }
  }

  if (!show || !missedDate) return null

  const displayDate = new Date(missedDate).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    weekday: 'short'
  })

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="fixed bottom-6 right-6 z-50 max-w-sm w-[calc(100vw-3rem)] bg-card border border-[var(--status-amber-border)]/50 shadow-lg rounded-2xl overflow-hidden"
      >
        <div className="relative p-4 pl-12">
          <div className="absolute left-4 top-4 text-[var(--status-amber-text)]">
            <AlertCircle className="w-5 h-5" />
          </div>
          
          <button 
            onClick={handleDismiss}
            className="absolute right-3 top-3 p-1 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <h3 className="font-semibold text-sm mb-1 pr-6 text-foreground">
            {locale === 'zh' ? '忘记打卡了？' : 'Missed a log?'}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed pr-2">
            {locale === 'zh' 
              ? `大家在 ${displayDate} 都更新了状态，但似乎没有看到你的。记得使用侧边栏快速更新你的状态，让团队保持同步！` 
              : `Most of the team logged their status on ${displayDate}, but we missed yours. Use the sidebar to quickly update your status and keep everyone in the loop!`}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
