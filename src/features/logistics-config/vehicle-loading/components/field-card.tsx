import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  title: string
  description?: ReactNode
  children: ReactNode
  className?: string
}

export function FieldCard({
  title,
  description,
  children,
  className = '',
}: Props) {
  return (
    <Card
      className={`rounded-[28px] border-dashed bg-background/80 shadow-none ${className}`}
    >
      <CardHeader className='space-y-2'>
        <CardTitle className='text-base font-black tracking-tight'>
          {title}
        </CardTitle>
        {description ? (
          <div className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            {description}
          </div>
        ) : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
