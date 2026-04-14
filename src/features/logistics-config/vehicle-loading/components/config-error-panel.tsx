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
    <Card className={`rounded-[28px] border-dashed border-red-300 shadow-none bg-red-50/60 ${className}`}>
      <CardContent className='px-6 py-5'>
        <div className='text-sm font-black tracking-tight text-red-700'>{title}</div>
        <div className='mt-2 text-[11px] leading-relaxed text-red-600'>{error.message}</div>
        <div className='mt-4'>
          <Button type='button' variant='outline' className='border-red-300 text-red-700 hover:bg-red-100' onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
