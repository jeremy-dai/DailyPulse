import { redirect } from 'next/navigation'

export default function Home() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' })
  redirect(`/${today}`)
}
