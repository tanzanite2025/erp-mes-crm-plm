import { Card } from '@/components/ui/card'

interface RuleExecutionLogSummaryProps {
  pageItemCount: number
  successCount: number
  failedCount: number
  skippedCount: number
}

export function RuleExecutionLogSummary({
  pageItemCount,
  successCount,
  failedCount,
  skippedCount,
}: RuleExecutionLogSummaryProps) {
  const items = [
    {
      label: '当前页日志',
      value: pageItemCount,
      valueClassName: 'text-2xl font-black leading-none tracking-tight',
    },
    {
      label: '成功',
      value: successCount,
      valueClassName:
        'text-2xl font-black leading-none tracking-tight text-emerald-600',
    },
    {
      label: '失败',
      value: failedCount,
      valueClassName:
        'text-2xl font-black leading-none tracking-tight text-rose-600',
    },
    {
      label: '待处理 / 跳过',
      value: skippedCount,
      valueClassName:
        'text-2xl font-black leading-none tracking-tight text-slate-500',
    },
  ]

  return (
    <Card className='rounded-[24px] border-dashed border-muted/40 bg-muted/5 shadow-none'>
      <div className='grid gap-0 md:grid-cols-4'>
        {items.map((item, index) => (
          <div
            key={item.label}
            className={`flex min-h-0 items-center justify-between gap-2 px-3.5 py-1 ${index !== 0 ? 'border-t border-dashed border-muted/30 md:border-t-0 md:border-l' : ''}`}
          >
            <p className='text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
              {item.label}
            </p>
            <p className={item.valueClassName}>{item.value}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}
