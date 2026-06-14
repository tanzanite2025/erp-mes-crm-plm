import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileBarChart,
  Layers,
  Search,
  UserCircle,
  XCircle,
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
import { useLabExperimentalReports } from '../hooks/use-lab-experimental'

type LabExperimentalReportSummary = {
  id: string
  createdAt: string
  conclusion: string
  approvedBy?: string
  result?: string
  task?: {
    code?: string
  }
}

export function LabReportsPage() {
  const { t } = useLanguage()
  const { data, isLoading, error } = useLabExperimentalReports()
  const reports: LabExperimentalReportSummary[] = Array.isArray(data)
    ? data
    : []

  if (isLoading && reports.length === 0) {
    return (
      <div className='flex animate-pulse flex-col gap-8'>
        <div className='h-32 rounded-[32px] bg-muted/20' />
        <div className='space-y-4'>
          {[1, 2, 3].map((i) => (
            <div key={i} className='h-24 rounded-2xl bg-muted/10' />
          ))}
        </div>
      </div>
    )
  }

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <IndustrialHeader
        icon={FileBarChart}
        title={t('labExperimental.reports.title')}
        description={t('labExperimental.reports.description')}
      />

      <div className='flex flex-col justify-between gap-6 px-1 lg:flex-row lg:items-center'>
        <div className='flex items-center gap-6'>
          <div className='flex flex-col'>
            <span className='mb-1 text-[10px] leading-none font-black tracking-widest text-muted-foreground/40 uppercase'>
              {t('labExperimental.reports.totalReports')}
            </span>
            <div className='flex items-baseline gap-1'>
              <span className='text-2xl font-black tracking-tighter text-primary italic tabular-nums'>
                {reports.length}
              </span>
              <span className='text-[10px] font-black opacity-20'>
                {t('labExperimental.reports.files')}
              </span>
            </div>
          </div>
        </div>

        <div className='group relative max-w-sm flex-1'>
          <Search className='absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground/30 transition-colors group-focus-within:text-primary' />
          <Input
            placeholder={t('labExperimental.reports.searchPlaceholder')}
            className='h-11 w-full rounded-full border-none bg-muted/40 pl-11 text-[10px] font-black tracking-widest uppercase shadow-inner transition-all focus:bg-background'
          />
        </div>
      </div>

      {reports.length === 0 ? (
        <div className='relative flex h-[400px] flex-col items-center justify-center overflow-hidden rounded-[40px] border border-dashed border-muted/50 bg-muted/5 shadow-inner'>
          <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />
          <ClipboardList className='mb-6 size-16 animate-pulse stroke-[1.5px] text-primary opacity-5' />
          <p className='text-[11px] font-black tracking-[0.4em] text-muted-foreground/20 uppercase italic'>
            {t('labExperimental.reports.empty')}
          </p>
        </div>
      ) : (
        <div className='flex flex-col gap-4'>
          {reports.map((report) => (
            <Card
              key={report.id}
              className='group relative cursor-pointer overflow-hidden rounded-[24px] border border-dashed border-muted/50 bg-background shadow-sm transition-all duration-300 hover:bg-muted/5 hover:shadow-xl'
            >
              <div
                className={cn(
                  'absolute top-0 bottom-0 left-0 w-1',
                  report.result === 'PASS' ? 'bg-emerald-500' : 'bg-rose-500'
                )}
              />

              <CardContent className='flex items-center justify-between gap-8 p-6'>
                <div className='flex min-w-0 flex-1 items-center gap-6'>
                  <div className='flex size-12 shrink-0 items-center justify-center rounded-2xl border border-transparent bg-muted/10 transition-colors group-hover:border-muted-foreground/10 group-hover:bg-white'>
                    <Layers className='size-6 opacity-40 transition-colors group-hover:text-primary' />
                  </div>

                  <div className='flex min-w-0 flex-col gap-1'>
                    <div className='flex items-center gap-3'>
                      <span className='font-mono text-[8px] leading-none font-black text-muted-foreground/40 uppercase'>
                        TASK_CODE
                      </span>
                      <Badge
                        variant='outline'
                        className='h-4 border-none bg-primary/5 px-1.5 font-mono text-[9px] font-black text-primary'
                      >
                        {report.task?.code || 'N/A'}
                      </Badge>
                      <div className='ml-2 flex items-center gap-1 opacity-40'>
                        <Calendar className='size-3' />
                        <span className='text-[8px] font-black tabular-nums'>
                          {new Date(report.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <h4 className='truncate text-sm font-black tracking-tight text-slate-700 uppercase italic transition-colors group-hover:text-primary'>
                      {report.conclusion}
                    </h4>
                  </div>
                </div>

                <div className='flex shrink-0 items-center gap-10'>
                  <div className='flex flex-col gap-0.5'>
                    <span className='text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                      APPROVER
                    </span>
                    <div className='flex items-center gap-2'>
                      <UserCircle className='size-4 opacity-20' />
                      <span className='text-[10px] font-black uppercase'>
                        {report.approvedBy || 'SYSTEM'}
                      </span>
                    </div>
                  </div>

                  <div className='flex w-[100px] flex-col gap-0.5'>
                    <span className='text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                      RESULT
                    </span>
                    <div
                      className={cn(
                        'flex items-center gap-1.5 text-[10px] font-black uppercase italic',
                        report.result === 'PASS'
                          ? 'text-emerald-500'
                          : 'text-rose-500'
                      )}
                    >
                      {report.result === 'PASS' ? (
                        <CheckCircle2 className='size-3.5' />
                      ) : (
                        <XCircle className='size-3.5' />
                      )}
                      {report.result}
                    </div>
                  </div>

                  <Button
                    variant='ghost'
                    size='icon'
                    className='size-10 rounded-full transition-all hover:bg-primary/10 hover:text-primary active:scale-95'
                  >
                    <ChevronRight className='size-5' />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
