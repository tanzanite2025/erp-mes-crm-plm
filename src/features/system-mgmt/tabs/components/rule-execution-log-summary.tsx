import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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
  return (
    <div className='grid gap-4 md:grid-cols-4'>
      <Card className='rounded-[24px] border-dashed border-muted/40 bg-muted/5 shadow-none'>
        <CardHeader className='pb-2'>
          <CardDescription>当前页日志</CardDescription>
          <CardTitle className='text-2xl font-black tracking-tight'>
            {pageItemCount}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card className='rounded-[24px] border-dashed border-muted/40 bg-muted/5 shadow-none'>
        <CardHeader className='pb-2'>
          <CardDescription>成功</CardDescription>
          <CardTitle className='text-2xl font-black tracking-tight text-emerald-600'>
            {successCount}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card className='rounded-[24px] border-dashed border-muted/40 bg-muted/5 shadow-none'>
        <CardHeader className='pb-2'>
          <CardDescription>失败</CardDescription>
          <CardTitle className='text-2xl font-black tracking-tight text-rose-600'>
            {failedCount}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card className='rounded-[24px] border-dashed border-muted/40 bg-muted/5 shadow-none'>
        <CardHeader className='pb-2'>
          <CardDescription>跳过</CardDescription>
          <CardTitle className='text-2xl font-black tracking-tight text-amber-600'>
            {skippedCount}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  )
}
