import DayPanel from '@/app/components/DayPanel'

export default function DateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <DayPanel />
      <div className="flex-1 flex flex-col min-h-screen">
        {children}
      </div>
    </div>
  )
}
