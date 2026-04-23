import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type FactorCardGridProps = {
  children: ReactNode
  className?: string
}

export function FactorCardGrid({ children, className }: FactorCardGridProps) {
  return <div className={cn('grid items-start gap-5 lg:grid-cols-2 2xl:grid-cols-3', className)}>{children}</div>
}
