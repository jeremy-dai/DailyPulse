import { createClient } from '@/app/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data } = await supabase.auth.exchangeCodeForSession(code)
    const user = data?.user
    const googleAvatar = (user?.user_metadata?.avatar_url as string | undefined) ?? null

    if (user && googleAvatar) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single()

      // Only refresh if user hasn't uploaded a custom avatar (still on Google CDN or null)
      const current = profile?.avatar_url ?? null
      const isCustomUpload = !!current && !current.includes('googleusercontent.com')

      if (!isCustomUpload && current !== googleAvatar) {
        await supabase.from('profiles').update({ avatar_url: googleAvatar }).eq('id', user.id)
      }
    }
  }

  return NextResponse.redirect(requestUrl.origin)
}
