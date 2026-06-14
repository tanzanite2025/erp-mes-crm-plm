import { useState } from 'react'
import {
  ClipboardCheck,
  Search,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Package,
  ArrowRight,
} from 'lucide-react'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ForbiddenState } from '@/components/forbidden-state'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import {
  useGetQualityTasks,
  useGetInspectionStats,
  useQualityMutations,
  type QualityTask,
} from '@/features/quality/hooks/use-quality'
import { formatQualityActorName } from '@/features/quality/utils/quality-utils'

export function QualityInspection() {
  const { t } = useLanguage()
  const [searchTerm, setSearchTerm] = useState('')
  const {
    data,
    error,
    isLoading: isTasksLoading,
  } = useGetQualityTasks(1, 100, searchTerm)
  const tasks = data?.items || []
  const { data: stats, isLoading: isStatsLoading } = useGetInspectionStats()
  const { executeInspectionMutation } = useQualityMutations()

  const isLoading = isTasksLoading || isStatsLoading

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  const handleQuickPass = (taskId: string) => {
    executeInspectionMutation.mutate({
      id: taskId,
      result: 'PASS',
      remarks: t('quality.inspection.page.quickPassRemark'),
    })
  }

  if (isLoading && tasks.length === 0) {
    return (
      <div className='flex animate-pulse flex-col gap-8'>
        <div className='h-32 rounded-[32px] bg-muted/20' />
        <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className='h-48 rounded-[32px] bg-muted/10' />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <IndustrialHeader
        icon={ClipboardCheck}
        title={t('quality.inspection.page.title')}
        description={t('quality.inspection.page.description')}
      />

      <div className='flex flex-col justify-between gap-6 px-1 sm:flex-row sm:items-center'>
        <div className='group relative max-w-none flex-1 sm:max-w-md'>
          <Search className='absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground/30 transition-colors group-focus-within:text-primary' />
          <Input
            placeholder={t('quality.inspection.page.searchPlaceholder')}
            className='h-12 w-full rounded-2xl border-none bg-muted/50 pl-11 text-[11px] font-bold tracking-tight uppercase shadow-inner transition-all focus:bg-background'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className='flex shrink-0 items-center gap-3'>
          <div className='flex w-full items-center justify-center gap-3 rounded-full border border-dashed border-muted/50 bg-muted/10 px-4 py-2 sm:w-auto'>
            <span className='text-[10px] leading-none font-black tracking-widest text-muted-foreground/30 uppercase'>
              {t('quality.inspection.page.pendingLoad')}
            </span>
            {/* [BACKEND-AUTHORITY]: 权威待检总量由后端统计服务直接返回，解决前端分页数据不全问题 */}
            <span className='text-sm font-black text-primary italic tabular-nums'>
              {stats?.pendingCount ?? 0}
            </span>
          </div>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className='relative flex h-[400px] flex-col items-center justify-center overflow-hidden rounded-[40px] border border-dashed border-muted/50 bg-muted/5 shadow-inner'>
          <div className='pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent' />
          <Activity className='mb-6 size-16 animate-pulse stroke-[1.5px] text-primary opacity-5' />
          <p className='text-[11px] font-black tracking-[0.4em] text-muted-foreground/20 uppercase italic'>
            {t('quality.inspection.page.empty')}
          </p>
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {tasks.map((task: QualityTask) => {
            const inspectorName = formatQualityActorName(task.inspector)
            return (
              <Card
                key={task.id}
                className={cn(
                  'group relative cursor-pointer overflow-hidden rounded-[32px] border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl active:scale-95',
                  task.result === 'PASS'
                    ? 'bg-emerald-500/[0.02]'
                    : task.result === 'FAIL'
                      ? 'bg-rose-500/[0.02]'
                      : 'bg-background hover:bg-white'
                )}
              >
                <div
                  className={cn(
                    'absolute top-0 bottom-0 left-0 w-1.5',
                    task.result === 'PASS'
                      ? 'bg-emerald-500'
                      : task.result === 'FAIL'
                        ? 'bg-rose-500'
                        : 'bg-blue-500/20'
                  )}
                />

                <CardContent className='flex flex-col gap-5 p-6'>
                  <div className='flex items-center justify-between gap-4'>
                    <div className='flex min-w-0 flex-col gap-0.5'>
                      <div className='flex items-center gap-2'>
                        <span className='font-mono text-[8px] leading-none font-black tracking-widest text-muted-foreground/40 uppercase'>
                          {t('quality.inspection.page.lotId')}
                        </span>
                        <Badge
                          variant='outline'
                          className='h-4 border-dashed bg-muted/10 px-1.5 font-mono text-[9px] leading-none font-black'
                        >
                          {task.batchNo}
                        </Badge>
                      </div>
                      <h3 className='mt-1 truncate text-sm font-black tracking-tighter text-slate-700 uppercase italic'>
                        {task.productName ||
                          t('quality.inspection.page.unidentified')}
                      </h3>
                    </div>
                    <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/10 transition-all group-hover:bg-primary group-hover:text-white'>
                      <Package className='size-5 opacity-40 group-hover:opacity-100' />
                    </div>
                  </div>

                  <div className='space-y-3'>
                    <div className='flex items-center justify-between text-[10px] font-black tracking-widest uppercase'>
                      <span className='text-muted-foreground/30'>
                        {t('quality.inspection.page.status')}
                      </span>
                      <div className='flex items-center gap-1.5'>
                        {task.result === 'PASS' ? (
                          <span className='flex items-center gap-1 text-emerald-500'>
                            <CheckCircle2 className='size-3' />{' '}
                            {t('quality.inspection.page.pass')}
                          </span>
                        ) : task.result === 'FAIL' ? (
                          <span className='flex items-center gap-1 text-rose-500'>
                            <XCircle className='size-3' />{' '}
                            {t('quality.inspection.page.failed')}
                          </span>
                        ) : (
                          <span className='flex items-center gap-1 text-blue-500'>
                            <Clock className='size-3 animate-pulse' />{' '}
                            {t('quality.inspection.page.inQueue')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className='h-1.5 w-full overflow-hidden rounded-full bg-muted/20'>
                      <div
                        className={cn(
                          'h-full transition-all duration-1000',
                          task.result === 'PASS'
                            ? 'w-full bg-emerald-500'
                            : task.result === 'FAIL'
                              ? 'w-full bg-rose-500'
                              : 'w-1/3 animate-pulse bg-blue-500'
                        )}
                      />
                    </div>
                  </div>

                  <div className='xs:flex-row xs:items-center flex flex-col justify-between gap-4 border-t border-dashed border-muted/50 pt-4'>
                    <div className='flex flex-col gap-0.5'>
                      <span className='text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                        {t('quality.inspection.page.executor')}
                      </span>
                      <div className='flex items-center gap-1.5'>
                        <User className='size-3 text-muted-foreground/30' />
                        <span className='text-[10px] font-black uppercase'>
                          {inspectorName ||
                            t('quality.inspection.page.unassigned')}
                        </span>
                      </div>
                    </div>
                    {task.result === 'PENDING' && (
                      <Button
                        size='sm'
                        className='xs:w-auto h-9 w-full gap-2 truncate rounded-xl bg-primary text-[9px] font-black tracking-widest uppercase shadow-lg shadow-primary/20 transition-all hover:scale-105'
                        onClick={(e) => {
                          e.stopPropagation()
                          handleQuickPass(task.id)
                        }}
                      >
                        {t('quality.inspection.page.quickPass')}{' '}
                        <ArrowRight className='size-3 shrink-0' />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
