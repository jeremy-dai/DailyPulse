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

  | 'monthlyLeadership'
  | 'leaderboardCondition'
  | 'leaderboardScoreLogic'
  | 'pts'
  | 'noValidDataThisMonth'
  | 'ptsAdded'
  | 'notLoggedBoard'
  | 'missedDays'
  | 'quickFillHint'

  | 'quickFill'
  | 'quickFillTitle'
  | 'quickFillDesc'

  | 'myMonth'
  | 'myMonthSubtitle'
  | 'checkAll'
  | 'clearAll'
  | 'done'
  | 'markAllDone'
  | 'clearDay'
  | 'allDone'
  | 'noPersonalTasksThisMonth'

  | 'editProfile'
  | 'changePhoto'
  | 'uploadingPhoto'
  | 'uploadFailed'
  | 'invalidImage'

const messages: Record<AppLocale, Record<TranslationKey, string>> = {
  en: {
    editProfile: 'Edit profile',
    changePhoto: 'Change photo',
    uploadingPhoto: 'Uploading…',
    uploadFailed: 'Upload failed',
    invalidImage: 'Please choose an image file',
    quickFill: 'Quick Fill',
    quickFillTitle: 'Quick Status Fill',
    quickFillDesc: 'Quickly set your status for the whole month',
    myMonth: 'My Month',
    myMonthSubtitle: 'Your tasks this month',
    checkAll: 'Check all',
    clearAll: 'Clear all',
    done: 'done',
    markAllDone: 'Mark this day done',
    clearDay: 'Clear this day',
    allDone: 'All done',
    noPersonalTasksThisMonth: 'No tasks logged this month yet',
    monthlyLeadership: 'Monthly Leadership',
    leaderboardCondition: 'Only days with >5 members count',
    leaderboardScoreLogic: 'Score logic: For each valid day, 1st place gets {n} pts, 2nd gets {n_1} pts, etc. Unlogged users get 0 pts.',
    pts: 'pts',
    noValidDataThisMonth: 'No valid data this month.',
    ptsAdded: 'Rank {rank}! +{score} pts for Monthly Leadership 🎊',
    notLoggedBoard: 'Not Logged',
    missedDays: 'days not logged',
    quickFillHint: 'Keep your status up to date so teammates know your working situation — even for vacation or time off. Use Quick Fill in the sidebar to set it in bulk.',
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
    editProfile: '编辑资料',
    changePhoto: '更换头像',
    uploadingPhoto: '上传中…',
    uploadFailed: '上传失败',
    invalidImage: '请选择图片文件',
    quickFill: '快速更新',
    quickFillTitle: '快速更新状态',
    quickFillDesc: '快速设置您整月的状态',
    myMonth: '我的本月',
    myMonthSubtitle: '你本月的任务',
    checkAll: '全部勾选',
    clearAll: '全部清除',
    done: '已完成',
    markAllDone: '标记当天全部完成',
    clearDay: '清除当天勾选',
    allDone: '全部完成',
    noPersonalTasksThisMonth: '本月还没有任务记录',
    monthlyLeadership: '月度榜单',
    leaderboardCondition: '仅统计超过5人填写的日期',
    leaderboardScoreLogic: '积分规则：有效日期内，第1名得 {n} 分，第2名得 {n_1} 分，依此类推。未填写得 0 分。',
    pts: '分',
    noValidDataThisMonth: '本月暂无有效数据。',
    ptsAdded: '第 {rank} 名！月度榜单 +{score} 分 撒花~ 🎊',
    notLoggedBoard: '未打卡',
    missedDays: '天未打卡',
    quickFillHint: '更新状态让同事随时了解你的工作安排，休假或请假也记得打卡哦～使用侧边栏的快速更新可批量设置。',
    overview: '月度概览',
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
