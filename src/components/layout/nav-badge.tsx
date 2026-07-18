import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

type NavBadgeProps = {
  children: ReactNode
  danger?: boolean
  dot?: boolean
}

export function NavBadge({
  children,
  danger = false,
  dot = false,
}: NavBadgeProps) {
  return (
    <Badge
      className={cn(
        'flex h-4 min-w-4 items-center justify-center rounded-full px-1 py-0 text-[10px] font-black',
        danger && 'bg-rose-500 text-white',
        dot && 'min-w-4 text-[8px]'
      )}
    >
      {children}
    </Badge>
  )
}
