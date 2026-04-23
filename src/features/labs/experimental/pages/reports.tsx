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
import { ForbiddenState } from '@/components/forbidden-state'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
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
  const reports: LabExperimentalReportSummary[] = Array.isArray(data) ? data : []

  if (isLoading && reports.length === 0) {
    return (
      <div className='flex flex-col gap-8 animate-pulse'>
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
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <IndustrialHeader
        icon={FileBarChart}
        title={t('labExperimental.reports.title')}
        description={t('labExperimental.reports.description')}
      />

      <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-1'>
        <div className='flex items-center gap-6'>
          <div className='flex flex-col'>
            <span className='text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest leading-none mb-1'>
              {t('labExperimental.reports.totalReports')}
            </span>
            <div className='flex items-baseline gap-1'>
              <span className='text-2xl font-black text-primary tracking-tighter italic tabular-nums'>
                {reports.length}
              </span>
              <span className='text-[10px] font-black opacity-20'>
                {t('labExperimental.reports.files')}
              </span>
            </div>
          </div>
        </div>

        <div className='relative group flex-1 max-w-sm'>
          <Search className='absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors' />
          <Input
            placeholder={t('labExperimental.reports.searchPlaceholder')}
            className='h-11 w-full pl-11 rounded-full bg-muted/40 border-none shadow-inner text-[10px] font-black uppercase tracking-widest focus:bg-background transition-all'
          />
        </div>
      </div>

      {reports.length === 0 ? (
        <div className='relative rounded-[40px] border border-dashed border-muted/50 bg-muted/5 h-[400px] flex flex-col items-center justify-center overflow-hidden shadow-inner'>
          <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />
          <ClipboardList className='size-16 mb-6 opacity-5 stroke-[1.5px] text-primary animate-pulse' />
          <p className='text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground/20 italic'>
            {t('labExperimental.reports.empty')}
          </p>
        </div>
      ) : (
        <div className='flex flex-col gap-4'>
          {reports.map((report) => (
            <Card
              key={report.id}
              className='group relative rounded-[24px] border border-dashed border-muted/50 bg-background hover:bg-muted/5 transition-all duration-300 overflow-hidden cursor-pointer shadow-sm hover:shadow-xl'
            >
              <div
                className={cn(
                  'absolute top-0 bottom-0 left-0 w-1',
                  report.result === 'PASS' ? 'bg-emerald-500' : 'bg-rose-500'
                )}
              />

              <CardContent className='p-6 flex items-center justify-between gap-8'>
                <div className='flex items-center gap-6 flex-1 min-w-0'>
                  <div className='size-12 rounded-2xl bg-muted/10 flex items-center justify-center shrink-0 group-hover:bg-white transition-colors border border-transparent group-hover:border-muted-foreground/10'>
                    <Layers className='size-6 opacity-40 group-hover:text-primary transition-colors' />
                  </div>

                  <div className='flex flex-col gap-1 min-w-0'>
                    <div className='flex items-center gap-3'>
                      <span className='text-[8px] font-mono font-black text-muted-foreground/40 leading-none uppercase'>
                        TASK_CODE
                      </span>
                      <Badge
                        variant='outline'
                        className='h-4 text-[9px] font-black font-mono border-none bg-primary/5 text-primary px-1.5'
                      >
                        {report.task?.code || 'N/A'}
                      </Badge>
                      <div className='flex items-center gap-1 opacity-40 ml-2'>
                        <Calendar className='size-3' />
                        <span className='text-[8px] font-black tabular-nums'>
                          {new Date(report.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <h4 className='text-sm font-black italic tracking-tight uppercase text-slate-700 truncate group-hover:text-primary transition-colors'>
                      {report.conclusion}
                    </h4>
                  </div>
                </div>

                <div className='flex items-center gap-10 shrink-0'>
                  <div className='flex flex-col gap-0.5'>
                    <span className='text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest'>
                      APPROVER
                    </span>
                    <div className='flex items-center gap-2'>
                      <UserCircle className='size-4 opacity-20' />
                      <span className='text-[10px] font-black uppercase'>
                        {report.approvedBy || 'SYSTEM'}
                      </span>
                    </div>
                  </div>

                  <div className='flex flex-col gap-0.5 w-[100px]'>
                    <span className='text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest'>
                      RESULT
                    </span>
                    <div
                      className={cn(
                        'flex items-center gap-1.5 text-[10px] font-black uppercase italic',
                        report.result === 'PASS' ? 'text-emerald-500' : 'text-rose-500'
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
                    className='size-10 rounded-full hover:bg-primary/10 hover:text-primary transition-all active:scale-95'
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
