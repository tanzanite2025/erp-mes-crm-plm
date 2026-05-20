import {
  ShieldCheck,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useLanguage } from '@/context/language-provider'
import { AUDIT_ENGINE_MODULE_IDS, type AuditEngineModuleId } from '../data/audit-engine-modules'
import { useAuditEngineStats } from '../hooks/use-audit-engine-stats'
import { type AuditEngineModuleStats } from '../types'
import { IndustrialHeader } from '@/components/uds/industrial-header'

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

function buildModuleView(stats: AuditEngineModuleStats | undefined, id: AuditEngineModuleId): ModuleStatus {
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
  const statsMap = new Map((data?.modules ?? []).map((module) => [module.id, module]))
  const modules = AUDIT_ENGINE_MODULE_IDS.map((id) => buildModuleView(statsMap.get(id), id))
  const connectedCount = modules.filter((module) => module.connected).length
  const totalCount = modules.length

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <IndustrialHeader
        icon={ShieldCheck}
        title={t('systemManagement.auditEngine.title')}
        description={t('systemManagement.auditEngine.subtitle')}
        gradient
        statusBadge={
          <div className='flex gap-4'>
            <div className='flex flex-col items-end'>
              <span className='text-[10px] font-black uppercase tracking-widest opacity-40'>
                {t('systemManagement.auditEngine.systemStatus')}
              </span>
              <div className='flex items-center gap-2'>
                <div
                  className={cn(
                    'w-2 h-2 rounded-full animate-pulse',
                    connectedCount === totalCount ? 'bg-emerald-500' : 'bg-amber-500'
                  )}
                />
                <span
                  className={cn(
                    'text-sm font-black italic tracking-tighter',
                    connectedCount === totalCount ? 'text-emerald-600' : 'text-amber-600'
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
              <span className='text-[10px] font-black uppercase tracking-widest opacity-40'>
                {t('systemManagement.auditEngine.connected')}
              </span>
              <span className='text-sm font-black italic tracking-tighter'>
                {t('systemManagement.auditEngine.modulesCount', { connected: connectedCount, total: totalCount })}
              </span>
            </div>
          </div>
        }
      />

      {isLoading ? (
        <div className='flex min-h-[240px] items-center justify-center rounded-[24px] border border-dashed border-muted/50 bg-muted/5'>
          <div className='flex items-center gap-3 text-muted-foreground'>
            <Loader2 className='size-4 animate-spin' />
            <span className='text-[10px] font-black uppercase tracking-widest'>AUDIT ENGINE LOADING</span>
          </div>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {modules.map((module) => (
            <div
              key={module.id}
              className={cn(
                'group relative p-6 rounded-[24px] border border-dashed transition-all duration-300 hover:shadow-xl',
                module.connected ? 'bg-muted/5 border-muted-foreground/20' : 'bg-muted/10 border-muted opacity-60 grayscale'
              )}
            >
              <div className='flex justify-between items-start mb-6'>
                <div className='flex flex-col'>
                  <span className='text-sm font-black italic tracking-tighter uppercase mb-1'>
                    {t(`systemManagement.auditEngine.modules.${module.id}`)}
                  </span>
                  <span className='text-[8px] font-mono opacity-40 uppercase tracking-widest'>
                    MODULE_ID: {module.id}
                  </span>
                </div>
                <Badge
                  variant='outline'
                  className={cn(
                    'rounded-full h-5 text-[8px] font-mono border-none',
                    module.status === 'HEALTHY' && 'bg-emerald-500/10 text-emerald-600',
                    module.status === 'ALERT' && 'bg-amber-500/10 text-amber-600',
                    module.status === 'CRITICAL' && 'bg-rose-500/10 text-rose-600 animate-pulse'
                  )}
                >
                  {t(`systemManagement.auditEngine.status.${module.status.toLowerCase() as AuditEngineStatusKey}`)}
                </Badge>
              </div>

              <div className='space-y-4 mb-6'>
                <div>
                  <div className='flex justify-between items-end mb-1.5'>
                    <span className='text-[10px] font-black uppercase tracking-widest opacity-50'>
                      {t('systemManagement.auditEngine.metrics.coverage')}
                    </span>
                    <span className='text-[10px] font-black tracking-tighter'>{module.coverage}%</span>
                  </div>
                  <div className='h-1 w-full bg-muted/30 rounded-full overflow-hidden'>
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
                  <div className='p-2 rounded-xl bg-muted/20 border border-dashed border-muted flex flex-col gap-1'>
                    <span className='text-[10px] font-black uppercase tracking-widest opacity-40'>
                      LOG COVERAGE
                    </span>
                    <span className='text-[8px] font-mono'>{module.logCoverage.toFixed(0)}%</span>
                  </div>
                  <div className='p-2 rounded-xl bg-muted/20 border border-dashed border-muted flex flex-col gap-1'>
                    <span className='text-[10px] font-black uppercase tracking-widest opacity-40'>
                      ENTRY COVERAGE
                    </span>
                    <span className='text-[8px] font-mono'>{module.entryCoverage.toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              <div className='flex items-center justify-between pt-4 border-t border-dashed border-muted'>
                <div className='flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity'>
                  <Clock className='w-3 h-3' />
                  <span className='text-[8px] font-mono'>
                    {module.lastEvent || t('systemManagement.auditEngine.metrics.neverSynced')}
                  </span>
                </div>
                {module.connected ? (
                  <CheckCircle2 className='w-4 h-4 text-emerald-500' />
                ) : (
                  <AlertTriangle className='w-4 h-4 text-rose-500' />
                )}
              </div>

              <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity' />
            </div>
          ))}
        </div>
      )}

      <div className='p-6 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 flex items-start gap-4'>
        <Activity className='w-5 h-5 text-primary opacity-50 mt-1' />
        <div className='space-y-1'>
          <p className='text-[9px] font-black uppercase tracking-widest opacity-60'>
            {t('systemManagement.auditEngine.footer.policyTitle')}
          </p>
          <p className='text-[8px] font-mono opacity-40 leading-relaxed'>
            {t('systemManagement.auditEngine.footer.policyDesc')}
          </p>
        </div>
      </div>
    </div>
  )
}
