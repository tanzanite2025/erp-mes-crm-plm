import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldCheck, Database, Zap, Cpu, Bell, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from '@/context/language-provider'

interface StatusItemProps {
  label: string
  status: 'connected' | 'disconnected' | 'warning'
  icon: LucideIcon
  onlineLabel: string
  terminatedLabel: string
}

function StatusItem({ label, status, icon: Icon, onlineLabel, terminatedLabel }: StatusItemProps) {
  const colors = {
    connected: "bg-emerald-500",
    disconnected: "bg-rose-500",
    warning: "bg-amber-500",
  }

  return (
    <div className="group flex items-center justify-between rounded-2xl border border-dashed border-slate-200 bg-background p-4 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]">
      <div className="flex items-center gap-3">
        <div className="flex size-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400">
          <Icon className="size-4" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 italic dark:text-slate-300">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn(
          "size-2 rounded-full",
          colors[status],
          status === 'connected' && "animate-pulse"
        )} />
        <span className={cn(
          "text-[8px] font-black uppercase tracking-widest",
          status === 'connected' ? "text-emerald-600" : "text-rose-600"
        )}>
          {status === 'connected' ? onlineLabel : terminatedLabel}
        </span>
      </div>
    </div>
  )
}

export function ComponentStatusMatrix() {
  const { t } = useLanguage()

  return (
    <Card className="overflow-hidden rounded-[32px] border-dashed border-slate-200 bg-slate-50/50 shadow-none dark:border-white/10 dark:bg-white/[0.03]">
      <CardHeader className="p-8 pb-4">
        <CardTitle className="text-sm font-black italic tracking-tighter uppercase flex items-center gap-2">
          <ShieldCheck className="size-4 text-emerald-600" />
          {t('systemManagement.componentStatus.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8 pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusItem
          label={t('systemManagement.componentStatus.labels.postgres')}
          status="connected"
          icon={Database}
          onlineLabel={t('systemManagement.componentStatus.online')}
          terminatedLabel={t('systemManagement.componentStatus.terminated')}
        />
        <StatusItem
          label={t('systemManagement.componentStatus.labels.redis')}
          status="connected"
          icon={Zap}
          onlineLabel={t('systemManagement.componentStatus.online')}
          terminatedLabel={t('systemManagement.componentStatus.terminated')}
        />
        <StatusItem
          label={t('systemManagement.componentStatus.labels.watchdog')}
          status="connected"
          icon={Cpu}
          onlineLabel={t('systemManagement.componentStatus.online')}
          terminatedLabel={t('systemManagement.componentStatus.terminated')}
        />
        <StatusItem
          label={t('systemManagement.componentStatus.labels.loki')}
          status="connected"
          icon={Bell}
          onlineLabel={t('systemManagement.componentStatus.online')}
          terminatedLabel={t('systemManagement.componentStatus.terminated')}
        />
      </CardContent>
    </Card>
  )
}
