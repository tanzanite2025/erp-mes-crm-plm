import { 
  ShieldCheck, 
  Activity, 
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/context/language-provider';

interface ModuleStatus {
  id: 'trading' | 'finance' | 'equipment' | 'engineering' | 'warehouse';
  status: 'HEALTHY' | 'ALERT' | 'CRITICAL';
  coverage: number;
  lastEvent?: string;
  connected: boolean;
}

const MODULES: ModuleStatus[] = [
  { 
    id: 'trading', 
    status: 'HEALTHY', 
    coverage: 100, 
    lastEvent: '2026-04-06 11:32:45',
    connected: true 
  },
  { 
    id: 'finance', 
    status: 'CRITICAL', 
    coverage: 0, 
    connected: false 
  },
  { 
    id: 'equipment', 
    status: 'CRITICAL', 
    coverage: 0, 
    connected: false 
  },
  { 
    id: 'engineering', 
    status: 'CRITICAL', 
    coverage: 0, 
    connected: false 
  },
  { 
    id: 'warehouse', 
    status: 'CRITICAL', 
    coverage: 0, 
    connected: false 
  },
];

export function AuditEngineTab() {
  const { t } = useLanguage();
  const connectedCount = MODULES.filter(m => m.connected).length;
  const totalCount = MODULES.length;

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      {/* Header Section */}
      <div className='p-8 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6'>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className='text-lg font-black tracking-tighter italic uppercase'>
              {t('systemManagement.auditEngine.title')}
            </h1>
            <p className='text-[9px] font-black uppercase tracking-widest opacity-60'>
              {t('systemManagement.auditEngine.subtitle')}
            </p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
              {t('systemManagement.auditEngine.systemStatus')}
            </span>
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                connectedCount === totalCount ? 'bg-emerald-500' : 'bg-amber-500'
              )} />
              <span className={cn(
                "text-sm font-black italic tracking-tighter",
                connectedCount === totalCount ? "text-emerald-600" : "text-amber-600"
              )}>
                {connectedCount === totalCount 
                  ? t('systemManagement.auditEngine.status.operational') 
                  : t('systemManagement.auditEngine.status.partial')}
              </span>
            </div>
          </div>
          <Separator orientation="vertical" className="h-10 border-dashed" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
              {t('systemManagement.auditEngine.connected')}
            </span>
            <span className="text-sm font-black italic tracking-tighter">
              {t('systemManagement.auditEngine.modulesCount', { connected: connectedCount, total: totalCount })}
            </span>
          </div>
        </div>
      </div>

      {/* Grid Section */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {MODULES.map((module) => (
          <div 
            key={module.id}
            className={cn(
              "group relative p-6 rounded-[24px] border border-dashed transition-all duration-300 hover:shadow-xl",
              module.connected ? "bg-muted/5 border-muted-foreground/20" : "bg-muted/10 border-muted opacity-60 grayscale"
            )}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div className='flex flex-col'>
                <span className='text-sm font-black italic tracking-tighter uppercase mb-1'>
                  {t(`systemManagement.auditEngine.modules.${module.id}`)}
                </span>
                <span className='text-[8px] font-mono opacity-40 uppercase tracking-widest'>
                  MODULE_ID: {module.id}
                </span>
              </div>
              <Badge 
                variant="outline" 
                className={cn(
                  "rounded-full h-5 text-[8px] font-mono border-none",
                  module.status === 'HEALTHY' && "bg-emerald-500/10 text-emerald-600",
                  module.status === 'ALERT' && "bg-amber-500/10 text-amber-600",
                  module.status === 'CRITICAL' && "bg-rose-500/10 text-rose-600 animate-pulse"
                )}
              >
                {t(`systemManagement.auditEngine.status.${module.status.toLowerCase()}` as any)}
              </Badge>
            </div>

            {/* Metrics */}
            <div className="space-y-4 mb-6">
              <div>
                <div className="flex justify-between items-end mb-1.5">
                  <span className='text-[10px] font-black uppercase tracking-widest opacity-50'>
                    {t('systemManagement.auditEngine.metrics.coverage')}
                  </span>
                  <span className='text-[10px] font-black tracking-tighter'>{module.coverage}%</span>
                </div>
                <div className="h-1 w-full bg-muted/30 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-1000",
                      module.status === 'HEALTHY' ? "bg-emerald-500" : module.status === 'ALERT' ? "bg-amber-500" : "bg-rose-500"
                    )}
                    style={{ width: `${module.coverage}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className='p-2 rounded-xl bg-muted/20 border border-dashed border-muted flex flex-col gap-1'>
                  <span className='text-[10px] font-black uppercase tracking-widest opacity-40'>
                    {t('systemManagement.auditEngine.metrics.hotStorage')}
                  </span>
                  <span className='text-[8px] font-mono'>
                    {t('systemManagement.auditEngine.metrics.days')}
                  </span>
                </div>
                <div className='p-2 rounded-xl bg-muted/20 border border-dashed border-muted flex flex-col gap-1'>
                  <span className='text-[10px] font-black uppercase tracking-widest opacity-40'>
                    {t('systemManagement.auditEngine.metrics.latency')}
                  </span>
                  <span className='text-[8px] font-mono'>~120MS</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-dashed border-muted">
              <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                <Clock className="w-3 h-3" />
                <span className="text-[8px] font-mono">
                  {module.lastEvent || t('systemManagement.auditEngine.metrics.neverSynced')}
                </span>
              </div>
              {module.connected ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              )}
            </div>

            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="p-6 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 flex items-start gap-4">
        <Activity className="w-5 h-5 text-primary opacity-50 mt-1" />
        <div className="space-y-1">
          <p className="text-[9px] font-black uppercase tracking-widest opacity-60">
            {t('systemManagement.auditEngine.footer.policyTitle')}
          </p>
          <p className="text-[8px] font-mono opacity-40 leading-relaxed">
            {t('systemManagement.auditEngine.footer.policyDesc')}
          </p>
        </div>
      </div>
    </div>
  );
}
