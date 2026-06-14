import {
  Activity,
  CheckCircle2,
  Clock,
  FileText,
  ShieldAlert,
  UserCircle,
  ArrowRight,
} from 'lucide-react'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ForbiddenState } from '@/components/forbidden-state'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import {
  useGetAbnormalities,
  type QualityAbnormality,
} from '@/features/quality/hooks/use-quality'

function normalizeSeverity(severity?: string) {
  const normalized = severity?.toUpperCase()
  if (normalized === 'CRITICAL') return 'CRITICAL'
  if (normalized === 'MAJOR') return 'MAJOR'
  if (normalized === 'HIGH') return 'HIGH'
  if (normalized === 'MEDIUM') return 'MEDIUM'
  if (normalized === 'MINOR') return 'MINOR'
  if (normalized === 'LOW') return 'LOW'
  return 'UNKNOWN'
}

function normalizeStatus(status?: string) {
  const normalized = status?.toUpperCase()
  if (normalized === 'CLOSED') return 'CLOSED'
  if (normalized === 'REJECTED') return 'REJECTED'
  if (normalized === 'OPEN') return 'OPEN'
  return 'UNKNOWN'
}

function getSeverityLabel(
  t: ReturnType<typeof useLanguage>['t'],
  severity?: string
) {
  switch (normalizeSeverity(severity)) {
    case 'CRITICAL':
      return t('quality.abnormalities.card.severityCritical')
    case 'MAJOR':
      return t('quality.abnormalities.card.severityMajor')
    case 'HIGH':
      return t('quality.abnormalities.card.severityHigh')
    case 'MEDIUM':
      return t('quality.abnormalities.card.severityMedium')
    case 'MINOR':
      return t('quality.abnormalities.card.severityMinor')
    case 'LOW':
      return t('quality.abnormalities.card.severityLow')
    default:
      return severity || t('quality.common.unknown')
  }
}

function getStatusLabel(
  t: ReturnType<typeof useLanguage>['t'],
  status?: string
) {
  switch (normalizeStatus(status)) {
    case 'CLOSED':
      return t('quality.abnormalities.card.closedLoop')
    case 'REJECTED':
      return t('quality.abnormalities.card.rejected')
    case 'OPEN':
      return t('quality.abnormalities.card.inProgress')
    default:
      return status || t('quality.common.unknown')
  }
}

function getDisposalLabel(
  t: ReturnType<typeof useLanguage>['t'],
  disposalMethod?: string
) {
  const normalized = disposalMethod?.toUpperCase()
  if (normalized === 'SCRAP')
    return t('quality.abnormalities.card.disposalScrap')
  if (normalized === 'REWORK')
    return t('quality.abnormalities.card.disposalRework')
  if (normalized === 'CONCESSION')
    return t('quality.abnormalities.card.disposalConcession')
  return disposalMethod || t('quality.abnormalities.card.underAnalysis')
}

export function QualityAbnormalities() {
  const { t } = useLanguage()
  const { data: abnormalities, error, isLoading } = useGetAbnormalities()

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  if (isLoading) {
    return (
      <div className='flex animate-pulse flex-col gap-8'>
        <div className='h-32 rounded-[32px] bg-muted/20' />
        <div className='space-y-4'>
          {[1, 2, 3].map((item) => (
            <div key={item} className='h-24 rounded-[24px] bg-muted/10' />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className='flex animate-in flex-col gap-5 duration-700 fade-in'>
      <IndustrialHeader
        icon={ShieldAlert}
        title={t('quality.abnormalities.page.title')}
        description={t('quality.abnormalities.page.description')}
      />

      <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
        <Card className='group relative overflow-hidden rounded-[20px] border-none bg-rose-500/5 shadow-none'>
          <CardContent className='flex items-center justify-between gap-3 p-3.5'>
            <span className='text-[10px] font-black tracking-widest whitespace-nowrap text-rose-600/60 uppercase'>
              {t('quality.abnormalities.page.activeCriticals')}
            </span>
            <div className='shrink-0 font-mono text-xl font-black tracking-tighter text-rose-600 italic tabular-nums'>
              {abnormalities?.filter((item) => item.severity === 'CRITICAL')
                .length || 0}
            </div>
          </CardContent>
        </Card>
        <Card className='group relative overflow-hidden rounded-[20px] border-none bg-amber-500/5 shadow-none'>
          <CardContent className='flex items-center justify-between gap-3 p-3.5'>
            <span className='text-[10px] font-black tracking-widest whitespace-nowrap text-amber-600/60 uppercase'>
              {t('quality.abnormalities.page.openReports')}
            </span>
            <div className='shrink-0 font-mono text-xl font-black tracking-tighter text-amber-600 italic tabular-nums'>
              {abnormalities?.filter((item) => item.status === 'OPEN').length ||
                0}
            </div>
          </CardContent>
        </Card>
        <Card className='group relative overflow-hidden rounded-[20px] border-none bg-emerald-500/5 shadow-none'>
          <CardContent className='flex items-center justify-between gap-3 p-3.5'>
            <span className='text-[10px] font-black tracking-widest whitespace-nowrap text-emerald-600/60 uppercase'>
              {t('quality.abnormalities.page.closedLooped')}
            </span>
            <div className='shrink-0 font-mono text-xl font-black tracking-tighter text-emerald-600 italic tabular-nums'>
              {abnormalities?.filter((item) => item.status === 'CLOSED')
                .length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className='flex flex-col gap-3'>
        {abnormalities?.length === 0 ? (
          <div className='flex flex-col items-center justify-center rounded-[40px] border-2 border-dashed border-muted/50 bg-muted/5 py-32'>
            <Activity className='mb-4 size-12 animate-pulse text-primary opacity-10' />
            <p className='text-[10px] font-black tracking-[0.4em] text-muted-foreground/30 uppercase'>
              {t('quality.abnormalities.page.empty')}
            </p>
          </div>
        ) : (
          abnormalities?.map((ab: QualityAbnormality) => (
            <Card
              key={ab.id}
              className='group relative cursor-pointer overflow-hidden rounded-[24px] border border-dashed border-muted/50 bg-background transition-all hover:bg-muted/5 active:scale-[0.99]'
            >
              <div
                className={cn(
                  'absolute top-0 bottom-0 left-0 w-1.5',
                  normalizeSeverity(ab.severity) === 'CRITICAL'
                    ? 'animate-pulse bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                    : 'bg-amber-500'
                )}
              />
              <CardContent className='flex flex-col justify-between gap-4 px-4 py-3.5 lg:flex-row lg:items-center'>
                <div className='flex min-w-0 flex-1 items-center gap-3 lg:gap-4'>
                  <div className='flex size-9 shrink-0 items-center justify-center rounded-xl border border-transparent bg-muted/10 transition-colors group-hover:border-muted-foreground/10 group-hover:bg-white lg:size-10'>
                    <FileText className='size-4 opacity-40' />
                  </div>
                  <div className='flex min-w-0 flex-col gap-0.5'>
                    <div className='flex items-center gap-2.5'>
                      <span className='font-mono text-[9px] leading-none font-black text-muted-foreground/30'>
                        ID: {ab.id.slice(0, 8).toUpperCase()}
                      </span>
                      <Badge
                        className={cn(
                          'h-4 rounded-md border-none py-0 text-[8px] font-black tracking-widest uppercase shadow-none',
                          normalizeSeverity(ab.severity) === 'CRITICAL'
                            ? 'bg-rose-500/10 text-rose-600'
                            : 'bg-amber-500/10 text-amber-600'
                        )}
                      >
                        {getSeverityLabel(t, ab.severity)}
                      </Badge>
                    </div>
                    <h4 className='truncate text-sm font-black tracking-tight text-slate-700 uppercase italic'>
                      {ab.description}
                    </h4>
                  </div>
                </div>

                <div className='flex items-center justify-between gap-0 border-t border-dashed border-muted/20 pt-3 lg:justify-end lg:gap-8 lg:border-t-0 lg:pt-0'>
                  <div className='flex items-center gap-6 lg:gap-8'>
                    <div className='flex flex-col gap-0.5'>
                      <span className='text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                        {t('quality.abnormalities.card.disposal')}
                      </span>
                      <span className='max-w-[100px] truncate text-[10px] leading-none font-black text-secondary/60 uppercase sm:max-w-none'>
                        {getDisposalLabel(t, ab.disposalMethod)}
                      </span>
                    </div>
                    <div className='flex w-[110px] flex-col gap-0.5 lg:w-[130px]'>
                      <span className='text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                        {t('quality.abnormalities.card.status')}
                      </span>
                      <div className='flex items-center gap-2'>
                        {normalizeStatus(ab.status) === 'CLOSED' ? (
                          <>
                            <CheckCircle2 className='size-3 text-emerald-500' />
                            <span className='text-[10px] font-black text-emerald-600 uppercase italic'>
                              {getStatusLabel(t, ab.status)}
                            </span>
                          </>
                        ) : (
                          <>
                            <Clock className='size-3 animate-pulse text-amber-500' />
                            <span className='text-[10px] font-black text-amber-600 uppercase italic'>
                              {getStatusLabel(t, ab.status)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className='flex items-center gap-3 pl-2 sm:pl-0'>
                    <UserCircle className='hidden size-5 shrink-0 opacity-10 transition-opacity group-hover:opacity-40 sm:block' />
                    <Button
                      variant='ghost'
                      size='icon'
                      className='size-9 shrink-0 rounded-full border border-dashed border-transparent transition-all hover:border-primary/20 hover:bg-primary/10 hover:text-primary active:scale-95'
                    >
                      <ArrowRight className='size-4' />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
