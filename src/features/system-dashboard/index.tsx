import { useQuery } from "@tanstack/react-query"
import { ForbiddenState } from '@/components/forbidden-state'
import { SystemStatusService } from "./services/system-status-service"
import { ServerIdentity } from "./components/server-identity"
import { InfrastructureGauges } from "./components/infrastructure-gauges"
import { ComponentStatusMatrix } from "./components/component-status-matrix"
import { DiagnosticAlerts } from "./components/diagnostic-alerts"
import { Loader2, RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'

export function SystemStatusPage() {
  const { t } = useLanguage()

  const { data, error, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["service-status"],
    queryFn: () => SystemStatusService.getStatus(),
    refetchInterval: 30000, // 30秒自动轮询
  })

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-emerald-600 opacity-20" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-black italic tracking-tighter uppercase text-slate-800 dark:text-slate-100">
            {t('systemManagement.statusPage.title')}
          </h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
            {t('systemManagement.statusPage.subtitle')}
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()}
          disabled={isFetching}
          className="rounded-full h-9 border-dashed border-slate-200 bg-background text-[10px] font-black uppercase tracking-widest gap-2 dark:border-white/10 dark:bg-white/4"
        >
          <RefreshCcw className={isFetching ? "size-3 animate-spin" : "size-3"} />
          {t('systemManagement.statusPage.forceRefresh')}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* 服务器身份 */}
        <ServerIdentity 
          hostname={data.identity.hostname}
          os={data.identity.os}
          arch={data.identity.arch}
          runtime={data.identity.runtime}
          uptime={data.identity.uptime}
        />

        {/* 系统自诊断告警 */}
        <DiagnosticAlerts />

        {/* 系统组件联通性 */}
        <ComponentStatusMatrix />

        {/* 基础设施仪表盘 */}
        <InfrastructureGauges 
          memory={data.resources.memory}
          db={data.infrastructure.db}
          cpu_cores={data.resources.cpu_cores}
        />
      </div>

      <div className="flex items-center justify-between border-t border-dashed border-slate-100 p-8 opacity-40 dark:border-white/10">
        <span className="text-[8px] font-mono uppercase tracking-widest">
          {t('systemManagement.statusPage.footer.nodeResponseTime', { time: data.time })}
        </span>
        <span className="text-[8px] font-mono uppercase tracking-widest text-emerald-600 font-bold">
          {t('systemManagement.statusPage.footer.engineVersion')}
        </span>
      </div>
    </div>
  )
}
