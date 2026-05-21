import DayPanel from '@/app/components/DayPanel'
import { LocaleProvider } from '@/app/components/locale-provider'

export default function DateLayout({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <div className="flex">
        <DayPanel />
        <div className="flex-1 flex flex-col min-h-screen">
          {children}
        </div>
      </div>
    </LocaleProvider>
  )
}
