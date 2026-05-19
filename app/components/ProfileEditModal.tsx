'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/utils/supabase/client'
import { useLocale } from '@/app/components/locale-provider'
import type { Profile } from '@/types/supabase'
import { cn, getInitials } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Loader2, X } from 'lucide-react'

const AVATAR_SIZE = 512
const JPEG_QUALITY = 0.85

interface Props {
  open: boolean
  onClose: () => void
  profile: Profile | null
}

async function resizeImageToSquareJpeg(file: File): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('Image decode failed'))
    el.src = dataUrl
  })

  // Center-crop to square, then scale to AVATAR_SIZE.
  const side = Math.min(img.naturalWidth, img.naturalHeight)
  const sx = (img.naturalWidth - side) / 2
  const sy = (img.naturalHeight - side) / 2

  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_SIZE
  canvas.height = AVATAR_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unsupported')
  ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Encode failed'))),
      'image/jpeg',
      JPEG_QUALITY
    )
  })
}

export default function ProfileEditModal({ open, onClose, profile }: Props) {
  const { t } = useLocale()
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [nameValue, setNameValue] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setNameValue(profile?.name ?? '')
      setAvatarPreview(profile?.avatar_url ?? null)
      setError(null)
    }
  }, [open, profile])

  const handlePickFile = () => {
    if (uploading) return
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking same file
    if (!file || !profile) return

    if (!file.type.startsWith('image/')) {
      setError(t('invalidImage'))
      return
    }

    setError(null)
    setUploading(true)

    try {
      const blob = await resizeImageToSquareJpeg(file)
      const path = `${profile.id}/avatar.jpg`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const finalUrl = `${publicUrl}?t=${Date.now()}`

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: finalUrl })
        .eq('id', profile.id)
      if (updateError) throw updateError

      setAvatarPreview(finalUrl)
      router.refresh()
    } catch (err) {
      console.error('Avatar upload failed:', err)
      setError(t('uploadFailed'))
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    const nextName = nameValue.trim() || null
    if (nextName !== profile.name) {
      await supabase.from('profiles').update({ name: nextName }).eq('id', profile.id)
      router.refresh()
    }
    setSaving(false)
    onClose()
  }

  const initials = profile ? getInitials(profile.name ?? profile.email) : ''

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">{t('editProfile')}</h2>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label={t('close')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-5 flex flex-col items-center gap-5">
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={handlePickFile}
                  disabled={uploading}
                  className="group relative h-24 w-24 rounded-full overflow-hidden ring-2 ring-border shadow-sm cursor-pointer disabled:cursor-wait"
                  aria-label={t('changePhoto')}
                >
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-muted text-muted-foreground text-2xl font-medium">
                      {initials}
                    </div>
                  )}
                  <div className={cn(
                    'absolute inset-0 flex items-center justify-center bg-black/50 text-white transition-opacity',
                    uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  )}>
                    {uploading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <Camera className="h-6 w-6" />
                    )}
                  </div>
                </button>
                <span className="text-xs text-muted-foreground">
                  {uploading ? t('uploadingPhoto') : t('changePhoto')}
                </span>
                {error && (
                  <span className="text-xs text-[var(--status-rose-text)]">{error}</span>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <div className="w-full flex flex-col gap-1.5">
                <label htmlFor="profile-name" className="text-xs font-medium text-muted-foreground">
                  {t('displayName')}
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !saving && !uploading) handleSave()
                    if (e.key === 'Escape') onClose()
                  }}
                  placeholder={t('displayName')}
                  className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-border bg-muted px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || uploading}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saving ? '…' : t('save')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
