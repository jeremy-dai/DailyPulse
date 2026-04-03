import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(nameOrEmail: string | null | undefined): string {
  if (!nameOrEmail) return '?'
  
  const baseName = nameOrEmail.split('@')[0]
  const parts = baseName.split(/[.\-_ ]+/).filter(Boolean)
  
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  
  return baseName.substring(0, 2).toUpperCase()
}
