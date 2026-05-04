import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type Props = {
  title: string
  error: Error
  retryLabel: string
  className?: string
  onRetry: () => void
}

export function ConfigErrorPanel({ title, error, retryLabel, className = '', onRetry }: Props) {
  return (
    <Card className={`rounded-[28px] border-dashed border-destructive/40 shadow-none bg-destructive/5 ${className}`}>
      <CardContent className='px-6 py-5'>
        <div className='text-sm font-black tracking-tight text-destructive'>{title}</div>
        <div className='mt-2 text-[11px] leading-relaxed text-destructive/80'>{error.message}</div>
        <div className='mt-4'>
          <Button type='button' variant='outline' className='h-9 rounded-full border-destructive/30 text-destructive hover:bg-destructive/10' onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
