import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldCheck, Database, Zap, Cpu, Bell, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from '@/context/language-provider'
import { normalizeSystemStatusData, type SystemStatusData } from '../services/system-status-service'

interface StatusItemProps {
  label: string
  status: 'connected' | 'disconnected' | 'warning'
  detail?: string
  icon: LucideIcon
  onlineLabel: string
  warningLabel: string
  terminatedLabel: string
}

interface ComponentStatusMatrixProps {
  components?: SystemStatusData['components']
}

function StatusItem({ label, status, detail, icon: Icon, onlineLabel, warningLabel, terminatedLabel }: StatusItemProps) {
  const colors = {
    connected: "bg-emerald-500",
    disconnected: "bg-rose-500",
    warning: "bg-amber-500",
  }

  const textColors = {
    connected: "text-emerald-600",
    disconnected: "text-rose-600",
    warning: "text-amber-600",
  }

  const labels = {
    connected: onlineLabel,
    disconnected: terminatedLabel,
    warning: warningLabel,
  }

  return (
    <div title={detail || undefined} className="group flex items-center justify-between rounded-2xl border border-dashed border-slate-200 bg-background p-2 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/4 dark:hover:bg-white/7 sm:p-2.5">
      <div className="flex items-center gap-1.5">
        <div className="flex size-5.5 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-white/6 dark:text-slate-400 sm:size-6">
          <Icon className="size-2.5 sm:size-3" />
        </div>
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 italic dark:text-slate-300 sm:text-[10px]">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={cn(
          "size-2 rounded-full",
          colors[status],
          status === 'connected' && "animate-pulse"
        )} />
        <span className={cn(
          "text-[8px] font-black uppercase tracking-widest",
          textColors[status]
        )}>
          {labels[status]}
        </span>
      </div>
    </div>
  )
}

export function ComponentStatusMatrix({ components }: ComponentStatusMatrixProps) {
  const { t } = useLanguage()
  const safeComponents = components ?? normalizeSystemStatusData({}).components

  return (
    <Card className="gap-0 overflow-hidden rounded-[32px] border-dashed border-slate-200 bg-slate-50/50 py-0 shadow-none dark:border-white/10 dark:bg-white/3">
      <CardHeader className="p-3 pb-1 sm:p-3.5 sm:pb-1.5">
        <CardTitle className="text-sm font-black italic tracking-tighter uppercase flex items-center gap-2">
          <ShieldCheck className="size-4 text-emerald-600" />
          {t('systemManagement.componentStatus.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-1.5 p-3 pt-0 sm:grid-cols-2 sm:p-3.5 sm:pt-0 lg:grid-cols-4">
        <StatusItem
          label={t('systemManagement.componentStatus.labels.postgres')}
          status={safeComponents.postgres.status}
          detail={safeComponents.postgres.detail}
          icon={Database}
          onlineLabel={t('systemManagement.componentStatus.online')}
          warningLabel={t('systemManagement.componentStatus.warning')}
          terminatedLabel={t('systemManagement.componentStatus.terminated')}
        />
        <StatusItem
          label={t('systemManagement.componentStatus.labels.redis')}
          status={safeComponents.redis.status}
          detail={safeComponents.redis.detail}
          icon={Zap}
          onlineLabel={t('systemManagement.componentStatus.online')}
          warningLabel={t('systemManagement.componentStatus.warning')}
          terminatedLabel={t('systemManagement.componentStatus.terminated')}
        />
        <StatusItem
          label={t('systemManagement.componentStatus.labels.watchdog')}
          status={safeComponents.watchdog.status}
          detail={safeComponents.watchdog.detail}
          icon={Cpu}
          onlineLabel={t('systemManagement.componentStatus.online')}
          warningLabel={t('systemManagement.componentStatus.warning')}
          terminatedLabel={t('systemManagement.componentStatus.terminated')}
        />
        <StatusItem
          label={t('systemManagement.componentStatus.labels.loki')}
          status={safeComponents.loki.status}
          detail={safeComponents.loki.detail}
          icon={Bell}
          onlineLabel={t('systemManagement.componentStatus.online')}
          warningLabel={t('systemManagement.componentStatus.warning')}
          terminatedLabel={t('systemManagement.componentStatus.terminated')}
        />
      </CardContent>
    </Card>
  )
}
