import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { AUDIT_ENGINE_MODULE_LABEL_KEYS } from '../data/audit-engine-modules'
import { useAuditEngineStats } from '../hooks/use-audit-engine-stats'
import { type AuditEngineModuleStats } from '../types'

type AuditEngineStatusKey = 'healthy' | 'alert' | 'critical'
type SystemStatusKey = 'operational' | 'partial' | 'unavailable' | 'noData'

function clampPercentage(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

function formatPercentage(value: number) {
  return `${Math.round(clampPercentage(value))}%`
}

function getModuleLabel(
  moduleId: string,
  t: ReturnType<typeof useLanguage>['t']
) {
  const hasLabel = Object.prototype.hasOwnProperty.call(
    AUDIT_ENGINE_MODULE_LABEL_KEYS,
    moduleId
  )
  const key = hasLabel
    ? AUDIT_ENGINE_MODULE_LABEL_KEYS[
        moduleId as keyof typeof AUDIT_ENGINE_MODULE_LABEL_KEYS
      ]
    : undefined
  return key ? t(key) : moduleId
}

interface CoverageMetricProps {
  label: string
  value: number
  countLabel: string
  count: number
  target: number
  tone: 'primary' | 'activity'
}

function CoverageMetric({
  label,
  value,
  countLabel,
  count,
  target,
  tone,
}: CoverageMetricProps) {
  const percentage = clampPercentage(value)

  return (
    <div className='space-y-1.5'>
      <div className='flex items-end justify-between gap-2'>
        <span className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
          {label}
        </span>
        <span className='font-mono text-xs font-black'>
          {formatPercentage(value)}
        </span>
      </div>
      <div
        role='progressbar'
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        className='h-1.5 w-full overflow-hidden rounded-full bg-muted/40'
      >
        <div
          className={cn(
            'h-full transition-[width] duration-700',
            tone === 'primary' ? 'bg-primary' : 'bg-sky-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className='font-mono text-[9px] text-muted-foreground'>
        {count} / {target} {countLabel}
      </span>
    </div>
  )
}

function ModuleCard({
  module,
  hotWindowDays,
  t,
}: {
  module: AuditEngineModuleStats
  hotWindowDays: number
  t: ReturnType<typeof useLanguage>['t']
}) {
  const statusKey = module.status.toLowerCase() as AuditEngineStatusKey
  const statusTone =
    module.status === 'HEALTHY'
      ? 'text-emerald-600'
      : module.status === 'ALERT'
        ? 'text-amber-600'
        : 'text-rose-600'

  return (
    <article
      className={cn(
        'group relative rounded-lg border border-dashed p-5 transition-colors hover:border-primary/40',
        module.connected
          ? 'border-muted-foreground/20 bg-muted/5'
          : 'border-amber-500/30 bg-amber-500/5'
      )}
    >
      <div className='mb-5 flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <h4 className='truncate text-sm font-black tracking-tight uppercase italic'>
            {getModuleLabel(module.id, t)}
          </h4>
          <span className='font-mono text-[8px] tracking-widest text-muted-foreground uppercase'>
            MODULE_ID: {module.id}
          </span>
        </div>
        <Badge
          variant='outline'
          className={cn(
            'h-5 shrink-0 border-none px-1.5 font-mono text-[8px] tracking-wider',
            module.status === 'HEALTHY' && 'bg-emerald-500/10 text-emerald-600',
            module.status === 'ALERT' && 'bg-amber-500/10 text-amber-600',
            module.status === 'CRITICAL' && 'bg-rose-500/10 text-rose-600'
          )}
        >
          {t(`systemManagement.auditEngine.status.${statusKey}`)}
        </Badge>
      </div>

      <div className='grid gap-4 border-y border-dashed border-muted/70 py-4 sm:grid-cols-2'>
        <CoverageMetric
          label={t('systemManagement.auditEngine.metrics.integrationCoverage')}
          value={module.integrationCoverage}
          count={module.integratedEntityCount}
          target={module.targetEntityCount}
          countLabel={t(
            'systemManagement.auditEngine.metrics.integratedEntities'
          )}
          tone='primary'
        />
        <CoverageMetric
          label={t('systemManagement.auditEngine.metrics.activityCoverage')}
          value={module.activityCoverage}
          count={module.activeEntityCount}
          target={module.targetEntityCount}
          countLabel={t('systemManagement.auditEngine.metrics.activeEntities')}
          tone='activity'
        />
      </div>

      {module.missingIntegrationEntities.length > 0 && (
        <div className='border-b border-dashed border-muted/70 py-3'>
          <div className='flex items-center gap-1.5 text-amber-700 dark:text-amber-400'>
            <AlertTriangle className='size-3.5 shrink-0' />
            <span className='text-[10px] font-black tracking-widest uppercase'>
              {t('systemManagement.auditEngine.pendingEntities', {
                count: module.missingIntegrationEntities.length,
              })}
            </span>
          </div>
          <p className='mt-1 font-mono text-[9px] leading-relaxed break-words text-muted-foreground'>
            {module.missingIntegrationEntities.join(', ')}
          </p>
        </div>
      )}

      <div className='flex items-center justify-between gap-3 pt-4'>
        <div className='flex min-w-0 items-center gap-1.5 text-muted-foreground'>
          <Clock3 className='size-3 shrink-0' />
          <span
            className='truncate font-mono text-[9px]'
            title={module.lastEvent}
          >
            {module.lastEvent ||
              t('systemManagement.auditEngine.noHotActivity', {
                days: hotWindowDays,
              })}
          </span>
        </div>
        {module.connected ? (
          <CheckCircle2 className={cn('size-4 shrink-0', statusTone)} />
        ) : (
          <AlertTriangle className={cn('size-4 shrink-0', statusTone)} />
        )}
      </div>
    </article>
  )
}

export function AuditEngineTab() {
  const { t } = useLanguage()
  const { data, isLoading, isError, isFetching, refetch } =
    useAuditEngineStats()
  const hasData = data !== undefined
  const initialLoadError = isError && !hasData
  const staleDataError = isError && hasData
  const modules = data?.modules ?? []
  const connectedCount = modules.filter((module) => module.connected).length
  const totalCount = modules.length
  const hotWindowDays = data?.hotWindowDays || 30
  const systemStatus: SystemStatusKey = initialLoadError
    ? 'unavailable'
    : !data || totalCount === 0
      ? 'noData'
      : totalCount > 0 && connectedCount === totalCount
        ? 'operational'
        : 'partial'

  return (
    <div className='flex animate-in flex-col gap-6 duration-700 fade-in'>
      <IndustrialHeader
        icon={ShieldCheck}
        title={t('systemManagement.auditEngine.title')}
        description={t('systemManagement.auditEngine.subtitle')}
        gradient
        statusBadge={
          <div className='flex gap-4'>
            <div className='flex flex-col items-end'>
              <span className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                {t('systemManagement.auditEngine.systemStatus')}
              </span>
              <div className='flex items-center gap-2'>
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    systemStatus === 'operational'
                      ? 'bg-emerald-500'
                      : systemStatus === 'unavailable'
                        ? 'bg-rose-500'
                        : 'bg-amber-500'
                  )}
                />
                <span
                  className={cn(
                    'text-sm font-black tracking-tight italic',
                    systemStatus === 'operational'
                      ? 'text-emerald-600'
                      : systemStatus === 'unavailable'
                        ? 'text-rose-600'
                        : 'text-amber-600'
                  )}
                >
                  {t(`systemManagement.auditEngine.status.${systemStatus}`)}
                </span>
              </div>
            </div>
            <Separator orientation='vertical' className='h-10 border-dashed' />
            <div className='flex flex-col items-end'>
              <span className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                {t('systemManagement.auditEngine.integrated')}
              </span>
              <span className='text-sm font-black tracking-tight italic'>
                {data
                  ? t('systemManagement.auditEngine.integratedModulesCount', {
                      integrated: connectedCount,
                      total: totalCount,
                    })
                  : '-'}
              </span>
            </div>
          </div>
        }
      />

      {initialLoadError ? (
        <div
          role='alert'
          className='flex flex-col gap-4 rounded-lg border border-dashed border-rose-500/40 bg-rose-500/5 p-5 sm:flex-row sm:items-center sm:justify-between'
        >
          <div className='flex items-start gap-3'>
            <AlertTriangle className='mt-0.5 size-5 shrink-0 text-rose-600' />
            <div>
              <p className='text-sm font-black text-rose-700 dark:text-rose-400'>
                {t('systemManagement.auditEngine.loadFailed')}
              </p>
              <p className='mt-1 text-xs text-muted-foreground'>
                {t('systemManagement.auditEngine.loadFailedDescription')}
              </p>
            </div>
          </div>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='shrink-0 self-start sm:self-auto'
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className='size-3.5 animate-spin' />
            ) : (
              <RefreshCw className='size-3.5' />
            )}
            {t('systemManagement.auditEngine.retry')}
          </Button>
        </div>
      ) : isLoading ? (
        <div className='flex min-h-[220px] items-center justify-center rounded-lg border border-dashed border-muted/60 bg-muted/5'>
          <div className='flex items-center gap-3 text-muted-foreground'>
            <Loader2 className='size-4 animate-spin' />
            <span className='text-[10px] font-black tracking-widest uppercase'>
              {t('systemManagement.auditEngine.loading')}
            </span>
          </div>
        </div>
      ) : (
        <>
          {staleDataError && (
            <div
              role='alert'
              className='flex flex-col gap-4 rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 p-4 sm:flex-row sm:items-center sm:justify-between'
            >
              <div className='flex items-start gap-3'>
                <AlertTriangle className='mt-0.5 size-4 shrink-0 text-amber-600' />
                <div>
                  <p className='text-xs font-black text-amber-700 dark:text-amber-400'>
                    {t('systemManagement.auditEngine.refreshFailed')}
                  </p>
                  <p className='mt-1 text-[10px] text-muted-foreground'>
                    {t('systemManagement.auditEngine.refreshFailedDescription')}
                  </p>
                </div>
              </div>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='shrink-0 self-start sm:self-auto'
                onClick={() => void refetch()}
                disabled={isFetching}
              >
                {isFetching ? (
                  <Loader2 className='size-3.5 animate-spin' />
                ) : (
                  <RefreshCw className='size-3.5' />
                )}
                {t('systemManagement.auditEngine.retry')}
              </Button>
            </div>
          )}

          {(data?.unmappedLogEntities.length ?? 0) > 0 && (
            <div
              role='alert'
              className='rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 p-4'
            >
              <div className='flex items-start gap-3'>
                <Activity className='mt-0.5 size-4 shrink-0 text-amber-600' />
                <div className='min-w-0'>
                  <p className='text-xs font-black tracking-wide text-amber-700 uppercase dark:text-amber-400'>
                    {t('systemManagement.auditEngine.unmappedEntities', {
                      count: data?.unmappedLogEntityCount ?? 0,
                    })}
                  </p>
                  <p className='mt-1 font-mono text-[10px] leading-relaxed break-words text-muted-foreground'>
                    {data?.unmappedLogEntities.join(', ')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {modules.length === 0 ? (
            <div className='flex min-h-[180px] items-center justify-center rounded-lg border border-dashed border-muted/60 bg-muted/5 px-5 text-center'>
              <p className='text-xs text-muted-foreground'>
                {t('systemManagement.auditEngine.noModules')}
              </p>
            </div>
          ) : (
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'>
              {modules.map((module) => (
                <ModuleCard
                  key={module.id}
                  module={module}
                  hotWindowDays={hotWindowDays}
                  t={t}
                />
              ))}
            </div>
          )}
        </>
      )}

      <div className='flex items-start gap-3 rounded-lg border border-dashed border-muted/60 bg-muted/5 p-5'>
        <Activity className='mt-0.5 size-4 shrink-0 text-primary opacity-60' />
        <div className='space-y-1'>
          <p className='text-[9px] font-black tracking-widest text-muted-foreground uppercase'>
            {t('systemManagement.auditEngine.footer.policyTitle')}
          </p>
          <p className='text-[10px] leading-relaxed text-muted-foreground'>
            {t('systemManagement.auditEngine.footer.policyDesc', {
              days: hotWindowDays,
            })}
          </p>
        </div>
      </div>
    </div>
  )
}
