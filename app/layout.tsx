import type { Metadata } from 'next'
import './globals.css'
import { GridBackground } from '@/components/ui/grid-background'
import { ThemeProvider } from '@/components/theme-provider'

export const metadata: Metadata = {
  title: 'DailyPulse',
  description: 'Team status log',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <GridBackground>{children}</GridBackground>
        </ThemeProvider>
      </body>
    </html>
  )
}
