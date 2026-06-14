import {
  ShieldCheck,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import {
  AUDIT_ENGINE_MODULE_IDS,
  type AuditEngineModuleId,
} from '../data/audit-engine-modules'
import { useAuditEngineStats } from '../hooks/use-audit-engine-stats'
import { type AuditEngineModuleStats } from '../types'

interface ModuleStatus {
  id: AuditEngineModuleId
  status: 'HEALTHY' | 'ALERT' | 'CRITICAL'
  coverage: number
  logCoverage: number
  entryCoverage: number
  lastEvent?: string
  connected: boolean
}

type AuditEngineStatusKey = 'healthy' | 'alert' | 'critical'

function buildModuleView(
  stats: AuditEngineModuleStats | undefined,
  id: AuditEngineModuleId
): ModuleStatus {
  return {
    id,
    connected: stats?.connected ?? false,
    coverage: stats?.coverage ?? 0,
    logCoverage: stats?.logCoverage ?? 0,
    entryCoverage: stats?.entryCoverage ?? 0,
    status: stats?.status ?? 'CRITICAL',
    lastEvent: stats?.lastEvent || undefined,
  }
}

export function AuditEngineTab() {
  const { t } = useLanguage()
  const { data, isLoading } = useAuditEngineStats()
  const statsMap = new Map(
    (data?.modules ?? []).map((module) => [module.id, module])
  )
  const modules = AUDIT_ENGINE_MODULE_IDS.map((id) =>
    buildModuleView(statsMap.get(id), id)
  )
  const connectedCount = modules.filter((module) => module.connected).length
  const totalCount = modules.length

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <IndustrialHeader
        icon={ShieldCheck}
        title={t('systemManagement.auditEngine.title')}
        description={t('systemManagement.auditEngine.subtitle')}
        gradient
        statusBadge={
          <div className='flex gap-4'>
            <div className='flex flex-col items-end'>
              <span className='text-[10px] font-black tracking-widest uppercase opacity-40'>
                {t('systemManagement.auditEngine.systemStatus')}
              </span>
              <div className='flex items-center gap-2'>
                <div
                  className={cn(
                    'h-2 w-2 animate-pulse rounded-full',
                    connectedCount === totalCount
                      ? 'bg-emerald-500'
                      : 'bg-amber-500'
                  )}
                />
                <span
                  className={cn(
                    'text-sm font-black tracking-tighter italic',
                    connectedCount === totalCount
                      ? 'text-emerald-600'
                      : 'text-amber-600'
                  )}
                >
                  {connectedCount === totalCount
                    ? t('systemManagement.auditEngine.status.operational')
                    : t('systemManagement.auditEngine.status.partial')}
                </span>
              </div>
            </div>
            <Separator orientation='vertical' className='h-10 border-dashed' />
            <div className='flex flex-col items-end'>
              <span className='text-[10px] font-black tracking-widest uppercase opacity-40'>
                {t('systemManagement.auditEngine.connected')}
              </span>
              <span className='text-sm font-black tracking-tighter italic'>
                {t('systemManagement.auditEngine.modulesCount', {
                  connected: connectedCount,
                  total: totalCount,
                })}
              </span>
            </div>
          </div>
        }
      />

      {isLoading ? (
        <div className='flex min-h-[240px] items-center justify-center rounded-[24px] border border-dashed border-muted/50 bg-muted/5'>
          <div className='flex items-center gap-3 text-muted-foreground'>
            <Loader2 className='size-4 animate-spin' />
            <span className='text-[10px] font-black tracking-widest uppercase'>
              AUDIT ENGINE LOADING
            </span>
          </div>
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {modules.map((module) => (
            <div
              key={module.id}
              className={cn(
                'group relative rounded-[24px] border border-dashed p-6 transition-all duration-300 hover:shadow-xl',
                module.connected
                  ? 'border-muted-foreground/20 bg-muted/5'
                  : 'border-muted bg-muted/10 opacity-60 grayscale'
              )}
            >
              <div className='mb-6 flex items-start justify-between'>
                <div className='flex flex-col'>
                  <span className='mb-1 text-sm font-black tracking-tighter uppercase italic'>
                    {t(`systemManagement.auditEngine.modules.${module.id}`)}
                  </span>
                  <span className='font-mono text-[8px] tracking-widest uppercase opacity-40'>
                    MODULE_ID: {module.id}
                  </span>
                </div>
                <Badge
                  variant='outline'
                  className={cn(
                    'h-5 rounded-full border-none font-mono text-[8px]',
                    module.status === 'HEALTHY' &&
                      'bg-emerald-500/10 text-emerald-600',
                    module.status === 'ALERT' &&
                      'bg-amber-500/10 text-amber-600',
                    module.status === 'CRITICAL' &&
                      'animate-pulse bg-rose-500/10 text-rose-600'
                  )}
                >
                  {t(
                    `systemManagement.auditEngine.status.${module.status.toLowerCase() as AuditEngineStatusKey}`
                  )}
                </Badge>
              </div>

              <div className='mb-6 space-y-4'>
                <div>
                  <div className='mb-1.5 flex items-end justify-between'>
                    <span className='text-[10px] font-black tracking-widest uppercase opacity-50'>
                      {t('systemManagement.auditEngine.metrics.coverage')}
                    </span>
                    <span className='text-[10px] font-black tracking-tighter'>
                      {module.coverage}%
                    </span>
                  </div>
                  <div className='h-1 w-full overflow-hidden rounded-full bg-muted/30'>
                    <div
                      className={cn(
                        'h-full transition-all duration-1000',
                        module.status === 'HEALTHY'
                          ? 'bg-emerald-500'
                          : module.status === 'ALERT'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                      )}
                      style={{ width: `${module.coverage}%` }}
                    />
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='flex flex-col gap-1 rounded-xl border border-dashed border-muted bg-muted/20 p-2'>
                    <span className='text-[10px] font-black tracking-widest uppercase opacity-40'>
                      LOG COVERAGE
                    </span>
                    <span className='font-mono text-[8px]'>
                      {module.logCoverage.toFixed(0)}%
                    </span>
                  </div>
                  <div className='flex flex-col gap-1 rounded-xl border border-dashed border-muted bg-muted/20 p-2'>
                    <span className='text-[10px] font-black tracking-widest uppercase opacity-40'>
                      ENTRY COVERAGE
                    </span>
                    <span className='font-mono text-[8px]'>
                      {module.entryCoverage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className='flex items-center justify-between border-t border-dashed border-muted pt-4'>
                <div className='flex items-center gap-1.5 opacity-40 transition-opacity group-hover:opacity-100'>
                  <Clock className='h-3 w-3' />
                  <span className='font-mono text-[8px]'>
                    {module.lastEvent ||
                      t('systemManagement.auditEngine.metrics.neverSynced')}
                  </span>
                </div>
                {module.connected ? (
                  <CheckCircle2 className='h-4 w-4 text-emerald-500' />
                ) : (
                  <AlertTriangle className='h-4 w-4 text-rose-500' />
                )}
              </div>

              <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100' />
            </div>
          ))}
        </div>
      )}

      <div className='flex items-start gap-4 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-6'>
        <Activity className='mt-1 h-5 w-5 text-primary opacity-50' />
        <div className='space-y-1'>
          <p className='text-[9px] font-black tracking-widest uppercase opacity-60'>
            {t('systemManagement.auditEngine.footer.policyTitle')}
          </p>
          <p className='font-mono text-[8px] leading-relaxed opacity-40'>
            {t('systemManagement.auditEngine.footer.policyDesc')}
          </p>
        </div>
      </div>
    </div>
  )
}
