import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ReactNode } from 'react'

type Props = {
  title: string
  description?: ReactNode
  children: ReactNode
  className?: string
}

export function FieldCard({ title, description, children, className = '' }: Props) {
  return (
    <Card className={`rounded-[28px] border-dashed shadow-none bg-background/80 ${className}`}>
      <CardHeader className='space-y-2'>
        <CardTitle className='text-base font-black tracking-tight'>{title}</CardTitle>
        {description ? <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{description}</div> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
