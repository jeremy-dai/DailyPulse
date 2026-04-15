export type WorkStatus = 'in_office' | 'wfh' | 'off' | 'sick' | 'vacation'

export interface Profile {
  id: string
  email: string
  name: string | null
  created_at: string
}

export interface DailyLog {
  id: number
  user_id: string
  date: string
  status: WorkStatus
  activities: string | null
  activities_at: string | null
  created_at: string
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
      }
      daily_logs: {
        Row: DailyLog
      }
    }
    Enums: {
      work_status: WorkStatus
    }
  }
}
