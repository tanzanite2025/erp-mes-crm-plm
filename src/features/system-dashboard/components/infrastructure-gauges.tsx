import { Database, HardDrive } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface Props {
  memory: {
    alloc_mb: number
    sys_mb: number
    container_used_mb: number
    container_limit_mb: number
    goroutines: number
  }
  db: {
    status: string
    open_conns: number
    max_open_connections: number
    in_use: number
    idle: number
    wait_count: number
  }
  cpu_cores: number
}

export function InfrastructureGauges({ memory, db, cpu_cores }: Props) {
  const { t } = useLanguage()

  const dbUsage =
    db.max_open_connections > 0
      ? Math.min(100, (db.in_use / db.max_open_connections) * 100)
      : null
  const hasContainerLimit =
    memory.container_used_mb > 0 && memory.container_limit_mb > 0
  const memoryUsed = hasContainerLimit
    ? memory.container_used_mb
    : memory.alloc_mb
  const memoryLimit = hasContainerLimit
    ? memory.container_limit_mb
    : memory.sys_mb
  const memUsage =
    memoryLimit > 0 ? Math.min(100, (memoryUsed / memoryLimit) * 100) : null
  const memoryBadge = hasContainerLimit
    ? `${memory.container_limit_mb} MB LIMIT`
    : `${memory.sys_mb} MB RUNTIME`
  const memoryUsageLabel = hasContainerLimit
    ? t('systemManagement.infrastructure.containerUsage')
    : t('systemManagement.infrastructure.heapAllocation')
  const memoryUsageValue = hasContainerLimit
    ? `${memory.container_used_mb} / ${memory.container_limit_mb} MB`
    : `${memory.alloc_mb} / ${memory.sys_mb} MB`

  return (
    <div className='grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-3'>
      <Card className='gap-0 overflow-hidden rounded-[32px] border-dashed border-slate-200 bg-white/50 py-0 shadow-none dark:border-white/10 dark:bg-white/3'>
        <CardHeader className='p-3 pb-1 sm:p-3.5 sm:pb-1.5'>
          <CardTitle className='flex items-center justify-between text-sm font-black tracking-tighter uppercase italic'>
            <div className='flex items-center gap-2'>
              <HardDrive className='size-4 text-emerald-600' />
              {t('systemManagement.infrastructure.runtimeMemory')}
            </div>
            <span className='font-mono text-[10px] text-slate-400 dark:text-slate-500'>
              {memoryBadge}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-2 p-3 pt-0 sm:p-3.5 sm:pt-0'>
          <div className='space-y-0.5'>
            <div className='flex items-center justify-between text-[10px] font-black tracking-widest text-slate-500 uppercase dark:text-slate-400'>
              <span>{memoryUsageLabel}</span>
              <span>{memoryUsageValue}</span>
            </div>
            <Progress
              value={memUsage ?? 0}
              className='h-1.5 bg-slate-100 dark:bg-white/8'
              indicatorClassName='bg-emerald-500'
            />
          </div>
          <div className='grid grid-cols-2 gap-1 sm:grid-cols-4'>
            {[
              {
                label: t('systemManagement.infrastructure.heapAllocation'),
                value: `${memory.alloc_mb} MB`,
              },
              {
                label: t('systemManagement.infrastructure.runtimeReserved'),
                value: `${memory.sys_mb} MB`,
              },
              {
                label: t('systemManagement.infrastructure.goroutines'),
                value: memory.goroutines,
              },
              {
                label: t('systemManagement.infrastructure.cpuCores'),
                value: `${cpu_cores} vCPU`,
              },
            ].map((item) => (
              <div
                key={item.label}
                className='flex flex-col rounded-2xl border border-dashed border-slate-200 bg-slate-100/50 p-1.5 sm:p-2 dark:border-white/10 dark:bg-white/5'
              >
                <span className='text-[8px] font-black tracking-widest text-slate-400 uppercase dark:text-slate-500'>
                  {item.label}
                </span>
                <span className='font-mono text-xs font-bold text-slate-700 dark:text-slate-200'>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className='gap-0 overflow-hidden rounded-[32px] border-dashed border-slate-200 bg-white/50 py-0 shadow-none dark:border-white/10 dark:bg-white/3'>
        <CardHeader className='p-3 pb-1 sm:p-3.5 sm:pb-1.5'>
          <CardTitle className='flex items-center justify-between text-sm font-black tracking-tighter uppercase italic'>
            <div className='flex items-center gap-2'>
              <Database className='size-4 text-blue-600' />
              {t('systemManagement.infrastructure.databasePool')}
            </div>
            <span className='font-mono text-[10px] text-slate-400 dark:text-slate-500'>
              {db.max_open_connections > 0
                ? `${db.open_conns}/${db.max_open_connections} CONNS`
                : `${db.open_conns} CONNS`}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-2 p-3 pt-0 sm:p-3.5 sm:pt-0'>
          <div className='space-y-0.5'>
            <div className='flex items-center justify-between text-[10px] font-black tracking-widest text-slate-500 uppercase dark:text-slate-400'>
              <span>{t('systemManagement.infrastructure.poolSaturation')}</span>
              <span>{dbUsage === null ? 'N/A' : `${dbUsage.toFixed(1)}%`}</span>
            </div>
            <Progress
              value={dbUsage ?? 0}
              className='h-1.5 bg-slate-100 dark:bg-white/8'
              indicatorClassName={cn(
                dbUsage !== null && dbUsage > 80
                  ? 'bg-rose-500'
                  : dbUsage !== null && dbUsage > 50
                    ? 'bg-amber-500'
                    : 'bg-blue-500'
              )}
            />
          </div>
          <div className='grid grid-cols-3 gap-1'>
            {[
              {
                label: t('systemManagement.infrastructure.metrics.inUse'),
                value: db.in_use,
                color: 'text-blue-600',
              },
              {
                label: t('systemManagement.infrastructure.metrics.idle'),
                value: db.idle,
                color: 'text-slate-400',
              },
              {
                label: t('systemManagement.infrastructure.metrics.wait'),
                value: db.wait_count,
                color: 'text-rose-400',
              },
            ].map((item) => (
              <div
                key={item.label}
                className='flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-slate-100/30 p-1 sm:p-1.5 dark:border-white/10 dark:bg-white/5'
              >
                <span className='text-[8px] font-black tracking-widest text-slate-400 uppercase dark:text-slate-500'>
                  {item.label}
                </span>
                <span className={cn('font-mono text-xs font-bold', item.color)}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
