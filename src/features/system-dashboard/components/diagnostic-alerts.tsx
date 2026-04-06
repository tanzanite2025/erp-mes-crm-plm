import { useQuery } from '@tanstack/react-query'
import {
  type ActiveAlert,
  type AlertDiagnosticLog,
  SystemStatusService,
} from '../services/system-status-service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Clock, ShieldAlert, CheckCircle2, History } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/context/language-provider'

function formatDuration(seconds: number) {
  if (seconds <= 0) return '0s'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function getActiveDurationSeconds(alert: ActiveAlert) {
  const startsAt = new Date(alert.startsAt).getTime()
  if (Number.isNaN(startsAt)) return 0
  return Math.max(0, Math.floor((Date.now() - startsAt) / 1000))
}

function getLogDurationSeconds(log: AlertDiagnosticLog) {
  if (typeof log.durationSeconds === 'number' && log.durationSeconds > 0) {
    return log.durationSeconds
  }
  const startsAt = new Date(log.startsAt).getTime()
  const endsAt = log.endsAt ? new Date(log.endsAt).getTime() : new Date(log.receivedAt).getTime()
  if (Number.isNaN(startsAt) || Number.isNaN(endsAt) || endsAt <= startsAt) {
    return 0
  }
  return Math.floor((endsAt - startsAt) / 1000)
}

export function DiagnosticAlerts() {
  const { locale, t } = useLanguage()

  const { data, isLoading } = useQuery({
    queryKey: ['diagnostic-alerts'],
    queryFn: () => SystemStatusService.getDiagnosticAlerts(),
    refetchInterval: 10000,
  })

  if (isLoading) return null

  const activeAlerts = data?.active ?? []
  const logs = (data?.logs ?? []).slice(0, 12)
  const hasAlerts = activeAlerts.length > 0 || logs.length > 0

  return (
    <Card
      className={cn(
        'rounded-[32px] border-dashed transition-all duration-500',
        hasAlerts
          ? 'border-rose-200 bg-rose-50/30 dark:border-rose-500/30 dark:bg-rose-500/10'
          : 'border-slate-200 bg-white/50 shadow-none dark:border-white/10 dark:bg-white/[0.03]'
      )}
    >
      <CardHeader className='p-8 pb-4'>
        <CardTitle className='text-sm font-black italic tracking-tighter uppercase flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <ShieldAlert className={cn('size-4', hasAlerts ? 'text-rose-500 animate-pulse' : 'text-emerald-600')} />
            {t('systemManagement.diagnostic.title')}
          </div>
          {hasAlerts && (
            <Badge variant='destructive' className='text-[8px] font-black uppercase rounded-full px-2'>
              {t('systemManagement.diagnostic.activeBadge', { count: activeAlerts.length })}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className='p-8 pt-0 space-y-5'>
        {!hasAlerts ? (
          <div className='flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/5 border border-dashed border-emerald-200/50 text-emerald-600'>
            <CheckCircle2 className='size-4' />
            <span className='text-[10px] font-black uppercase tracking-widest italic'>
              {t('systemManagement.diagnostic.healthy')}
            </span>
          </div>
        ) : (
          <>
            {activeAlerts.length > 0 && (
              <div className='space-y-3'>
                <div className='text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-300'>{t('systemManagement.diagnostic.activeAlerts')}</div>
                {activeAlerts.map((alert) => (
                  <div
                    key={alert.fingerprint}
                    className='flex items-start gap-4 rounded-2xl border border-dashed border-rose-200 bg-background p-5 shadow-sm animate-in slide-in-from-right-2 duration-300 dark:border-rose-500/25 dark:bg-white/[0.04]'
                  >
                    <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-500/15'>
                      <AlertCircle className='size-5 text-rose-600' />
                    </div>
                    <div className='flex-1 space-y-1'>
                      <div className='flex items-center justify-between gap-2'>
                        <span className='text-xs font-black italic uppercase tracking-tight text-slate-800 dark:text-slate-100'>
                          {alert.name}
                        </span>
                        <div className='flex items-center gap-1.5 text-[9px] font-mono text-rose-500 dark:text-rose-300'>
                          <Clock className='size-3' />
                          {t('systemManagement.diagnostic.durationPrefix')}: {formatDuration(getActiveDurationSeconds(alert))}
                        </div>
                      </div>
                      <p className='text-[11px] font-medium leading-relaxed text-slate-600 dark:text-slate-300'>{alert.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className='space-y-3'>
              <div className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-300'>
                <History className='size-3.5' />
                {t('systemManagement.diagnostic.last24Hours')}
              </div>

              {logs.length === 0 ? (
                <div className='rounded-2xl border border-dashed border-rose-200/60 bg-background p-4 text-[11px] text-slate-500 dark:border-rose-500/20 dark:bg-white/[0.04] dark:text-slate-400'>
                  {t('systemManagement.diagnostic.emptyLog')}
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className='rounded-2xl border border-dashed border-rose-200 bg-rose-50/70 p-4 dark:border-rose-500/25 dark:bg-rose-500/10'
                  >
                    <div className='flex items-center justify-between gap-2 mb-1.5'>
                      <span className='text-[11px] font-black italic uppercase tracking-tight text-rose-700 dark:text-rose-300'>
                        {log.name}
                      </span>
                      <span className='text-[9px] font-mono text-rose-600 dark:text-rose-300'>
                        {new Date(log.receivedAt).toLocaleString(locale)}
                      </span>
                    </div>
                    <p className='text-[11px] text-slate-700 dark:text-slate-200'>{log.description}</p>
                    <div className='mt-2 text-[10px] font-medium text-rose-700 dark:text-rose-300'>
                      {t('systemManagement.diagnostic.statusDuration', {
                        status: log.status.toUpperCase(),
                        duration: formatDuration(getLogDurationSeconds(log)),
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
