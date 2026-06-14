import { Server, Activity, Clock } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface Props {
  hostname: string
  os: string
  arch: string
  runtime: string
  uptime: string
  environment: string
}

export function ServerIdentity({
  hostname,
  os,
  arch,
  runtime,
  uptime,
  environment,
}: Props) {
  const { t } = useLanguage()

  return (
    <Card className='group relative gap-0 overflow-hidden rounded-[32px] border-dashed border-slate-200 bg-slate-50/50 py-0 shadow-none dark:border-white/10 dark:bg-white/3'>
      <div className='pointer-events-none absolute top-0 right-0 p-3 opacity-5 transition-transform duration-700 group-hover:scale-110'>
        <Server className='size-16' />
      </div>

      <CardContent className='p-3 sm:p-3.5'>
        <div className='flex flex-col gap-2'>
          <div className='flex items-start justify-between gap-2'>
            <div className='flex items-center gap-2'>
              <div className='flex size-8 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-background shadow-sm dark:border-white/10 dark:bg-white/6'>
                <Server className='size-3.5 text-emerald-600' />
              </div>
              <div className='space-y-0'>
                <h3 className='text-lg font-black tracking-tighter text-slate-800 uppercase italic sm:text-xl dark:text-slate-100'>
                  {hostname ||
                    t('systemManagement.serverIdentity.initializing')}
                </h3>
                <div className='flex flex-wrap items-center gap-0.5'>
                  <Badge
                    variant='outline'
                    className='rounded-full border-dashed bg-background px-2 py-0.5 text-[8px] font-black tracking-widest uppercase sm:text-[9px] dark:border-white/10 dark:bg-white/5'
                  >
                    {os} / {arch}
                  </Badge>
                  <span className='font-mono text-[9px] text-slate-400 opacity-60 sm:text-[10px] dark:text-slate-500'>
                    {t('systemManagement.serverIdentity.runtimeLabel', {
                      runtime,
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-1'>
            <div className='flex flex-col gap-0 rounded-2xl border border-dashed border-slate-200 bg-background/80 p-1.5 sm:p-2 dark:border-white/10 dark:bg-white/4'>
              <span className='flex items-center gap-1.5 text-[9px] font-black tracking-widest text-slate-400 uppercase sm:text-[10px] dark:text-slate-500'>
                <Clock className='size-2.5' />
                {t('systemManagement.serverIdentity.systemUptime')}
              </span>
              <span className='font-mono text-sm font-bold text-slate-700 dark:text-slate-200'>
                {uptime}
              </span>
            </div>
            <div className='flex flex-col gap-0 rounded-2xl border border-dashed border-slate-200 bg-background/80 p-1.5 sm:p-2 dark:border-white/10 dark:bg-white/4'>
              <span className='flex items-center gap-1.5 text-[9px] font-black tracking-widest text-slate-400 uppercase sm:text-[10px] dark:text-slate-500'>
                <Activity className='size-2.5 text-emerald-500' />
                {t('systemManagement.serverIdentity.environment')}
              </span>
              <span className='text-sm font-black tracking-widest text-emerald-600 uppercase italic'>
                {environment}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
