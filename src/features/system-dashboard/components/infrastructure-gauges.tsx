import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Database, HardDrive } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from '@/context/language-provider'

interface Props {
  memory: {
    alloc_mb: number
    sys_mb: number
    goroutines: number
  }
  db: {
    open_conns: number
    in_use: number
    idle: number
    wait_count: number
  }
  cpu_cores: number
}

export function InfrastructureGauges({ memory, db, cpu_cores }: Props) {
  const { t } = useLanguage()

  // 假定最大连接数为 100 (根据一般后端配置)
  const dbUsage = (db.open_conns / 100) * 100
  // 假定最大系统内存为 4096MB (4GB) 
  const memUsage = (memory.sys_mb / 4096) * 100

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="overflow-hidden rounded-[32px] border-dashed border-slate-200 bg-white/50 shadow-none dark:border-white/10 dark:bg-white/[0.03]">
        <CardHeader className="p-8 pb-4">
          <CardTitle className="text-sm font-black italic tracking-tighter uppercase flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="size-4 text-emerald-600" />
              {t('systemManagement.infrastructure.runtimeMemory')}
            </div>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{memory.sys_mb} MB SYS</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 pt-0 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              <span>{t('systemManagement.infrastructure.heapAllocation')}</span>
              <span>{memory.alloc_mb} MB</span>
            </div>
            <Progress value={memUsage} className="h-1.5 bg-slate-100 dark:bg-white/[0.08]" indicatorClassName="bg-emerald-500" />
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-dashed border-slate-200 bg-slate-100/50 p-4 dark:border-white/10 dark:bg-white/[0.05]">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{t('systemManagement.infrastructure.goroutines')}</span>
              <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-200">{memory.goroutines}</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{t('systemManagement.infrastructure.cpuCores')}</span>
              <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-200">{cpu_cores} vCPU</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-[32px] border-dashed border-slate-200 bg-white/50 shadow-none dark:border-white/10 dark:bg-white/[0.03]">
        <CardHeader className="p-8 pb-4">
          <CardTitle className="text-sm font-black italic tracking-tighter uppercase flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="size-4 text-blue-600" />
              {t('systemManagement.infrastructure.databasePool')}
            </div>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{db.open_conns} CONNS</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 pt-0 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              <span>{t('systemManagement.infrastructure.poolSaturation')}</span>
              <span>{dbUsage.toFixed(1)}%</span>
            </div>
            <Progress value={dbUsage} className="h-1.5 bg-slate-100 dark:bg-white/[0.08]" indicatorClassName={cn(
              dbUsage > 80 ? "bg-rose-500" : dbUsage > 50 ? "bg-amber-500" : "bg-blue-500"
            )} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: t('systemManagement.infrastructure.metrics.inUse'), value: db.in_use, color: 'text-blue-600' },
              { label: t('systemManagement.infrastructure.metrics.idle'), value: db.idle, color: 'text-slate-400' },
              { label: t('systemManagement.infrastructure.metrics.wait'), value: db.wait_count, color: 'text-rose-400' },
            ].map(item => (
              <div key={item.label} className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-slate-100/30 p-3 dark:border-white/10 dark:bg-white/[0.05]">
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{item.label}</span>
                <span className={cn("text-xs font-mono font-bold", item.color)}>{item.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
