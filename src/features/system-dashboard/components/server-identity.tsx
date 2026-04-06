import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Server, Activity, Clock } from "lucide-react"
import { useLanguage } from '@/context/language-provider'

interface Props {
  hostname: string
  os: string
  arch: string
  runtime: string
  uptime: string
}

export function ServerIdentity({ hostname, os, arch, runtime, uptime }: Props) {
  const { t } = useLanguage()

  return (
    <Card className="relative overflow-hidden rounded-[32px] border-dashed border-slate-200 bg-slate-50/50 shadow-none group dark:border-white/10 dark:bg-white/[0.03]">
      <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
        <Server className="size-32" />
      </div>
      
      <CardContent className="p-8">
        <div className="flex flex-col gap-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-background shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
                <Server className="size-7 text-emerald-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black italic tracking-tighter uppercase text-slate-800 dark:text-slate-100">
                  {hostname || t('systemManagement.serverIdentity.initializing')}
                </h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full border-dashed bg-background text-[9px] font-black uppercase tracking-widest dark:border-white/10 dark:bg-white/[0.05]">
                    {os} / {arch}
                  </Badge>
                  <span className="text-[10px] font-mono text-slate-400 opacity-60 dark:text-slate-500">
                    {t('systemManagement.serverIdentity.runtimeLabel', { runtime })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 rounded-2xl border border-dashed border-slate-200 bg-background/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                <Clock className="size-3" />
                {t('systemManagement.serverIdentity.systemUptime')}
              </span>
              <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-200">{uptime}</span>
            </div>
            <div className="flex flex-col gap-1 rounded-2xl border border-dashed border-slate-200 bg-background/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                <Activity className="size-3 text-emerald-500" />
                {t('systemManagement.serverIdentity.environment')}
              </span>
              <span className="text-sm font-black italic tracking-widest text-emerald-600 uppercase">
                {t('systemManagement.serverIdentity.environmentValue')}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
