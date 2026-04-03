# DailyPulse

A team status tracking application for managing and viewing daily updates.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) with App Router
- **Database**: [Supabase](https://supabase.com) for authentication and data
- **UI**: [shadcn/ui](https://ui.shadcn.com) components with Tailwind CSS
- **Animations**: [Framer Motion](https://framer.com/motion)

## Getting Started

```bash
make dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `app/` - Next.js App Router pages and components
- `app/[date]/page.tsx` - Daily view page for a specific date
- `app/login/page.tsx` - Login page
- `app/components/` - Shared components (DailyLogs, TopDashboard, DayPanel)
- `components/ui/` - shadcn/ui component library
- `app/utils/supabase/` - Supabase client and server utilities

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
