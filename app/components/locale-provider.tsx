'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type AppLocale = 'en' | 'zh'

export type TranslationKey =
  | 'overview'
  | 'unknown'
  | 'monthlyOverview'
  | 'user'
  | 'allUsers'
  | 'noTasksLoggedThisMonth'
  | 'noEntriesForThisUser'
  | 'close'
  | 'entry'
  | 'entries'
  | 'logged'
  | 'teamDailyTasks'
  | 'you'
  | 'setStatus'
  | 'notLogged'
  | 'whatAreYouWorkingOnToday'
  | 'noTasksLoggedYet'
  | 'saving'
  | 'saved'
  | 'saveFailed'
  | 'displayName'
  | 'save'
  | 'cancel'
  | 'editDisplayName'
  | 'setName'
  | 'signOut'
  | 'warning'
  | 'teamMember'
  | 'teamMembers'
  | 'withoutTasks'
  | 'statusInOffice'
  | 'statusWfh'
  | 'statusOff'
  | 'statusSick'
  | 'statusVacation'

const messages: Record<AppLocale, Record<TranslationKey, string>> = {
  en: {
    overview: 'Overview',
    unknown: 'Unknown',
    monthlyOverview: 'Monthly Overview',
    user: 'User',
    allUsers: 'All users',
    noTasksLoggedThisMonth: 'No tasks logged this month',
    noEntriesForThisUser: 'No entries for this user',
    close: 'Close',
    entry: 'entry',
    entries: 'entries',
    logged: 'logged',
    teamDailyTasks: 'Team Daily Tasks',
    you: 'You',
    setStatus: 'Set status',
    notLogged: 'Not Logged',
    whatAreYouWorkingOnToday: 'What are you working on today?',
    noTasksLoggedYet: 'No tasks logged yet.',
    saving: 'Saving…',
    saved: 'Saved',
    saveFailed: 'Save failed',
    displayName: 'Display name',
    save: 'Save',
    cancel: 'Cancel',
    editDisplayName: 'Edit display name',
    setName: 'Set name',
    signOut: 'Sign out',
    warning: 'Warning',
    teamMember: 'team member',
    teamMembers: 'team members',
    withoutTasks: 'without tasks',
    statusInOffice: 'In Office',
    statusWfh: 'Work From Home',
    statusOff: 'Off',
    statusSick: 'Sick',
    statusVacation: 'Vacation',
  },
  zh: {
    overview: '总览',
    unknown: '未知',
    monthlyOverview: '月度总览',
    user: '用户',
    allUsers: '所有用户',
    noTasksLoggedThisMonth: '本月暂无任务记录',
    noEntriesForThisUser: '该用户暂无记录',
    close: '关闭',
    entry: '条记录',
    entries: '条记录',
    logged: '已记录',
    teamDailyTasks: '团队每日任务',
    you: '你',
    setStatus: '设置状态',
    notLogged: '未打卡',
    whatAreYouWorkingOnToday: '你今天在做什么？',
    noTasksLoggedYet: '还没有任务记录。',
    saving: '保存中…',
    saved: '已保存',
    saveFailed: '保存失败',
    displayName: '显示名称',
    save: '保存',
    cancel: '取消',
    editDisplayName: '编辑显示名称',
    setName: '设置名称',
    signOut: '退出登录',
    warning: '警告',
    teamMember: '位成员',
    teamMembers: '位成员',
    withoutTasks: '未填写任务',
    statusInOffice: '在办公室',
    statusWfh: '远程办公',
    statusOff: '休息',
    statusSick: '病假',
    statusVacation: '休假',
  },
}

type LocaleContextValue = {
  locale: AppLocale
  localeTag: 'en-US' | 'zh-CN'
  setLocale: (locale: AppLocale) => void
  toggleLocale: () => void
  t: (key: TranslationKey) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)
const STORAGE_KEY = 'dailypulse-locale'

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // Must match server render: never read localStorage in useState initializer,
  // or SSR uses 'en' while the client uses a saved 'zh' and hydration breaks.
  const [locale, setLocale] = useState<AppLocale>('en')
  const [storageReady, setStorageReady] = useState(false)

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'zh') {
      setLocale(saved)
    }
    setStorageReady(true)
  }, [])

  useEffect(() => {
    if (!storageReady) return
    window.localStorage.setItem(STORAGE_KEY, locale)
  }, [locale, storageReady])

  const value = useMemo<LocaleContextValue>(() => {
    return {
      locale,
      localeTag: locale === 'zh' ? 'zh-CN' : 'en-US',
      setLocale,
      toggleLocale: () => setLocale((prev) => (prev === 'en' ? 'zh' : 'en')),
      t: (key) => messages[locale][key],
    }
  }, [locale])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider')
  }
  return context
}
