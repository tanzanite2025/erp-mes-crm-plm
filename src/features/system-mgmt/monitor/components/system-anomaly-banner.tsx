import { AlertCircle, ArrowRight, Loader2, ShieldCheck } from 'lucide-react'
import { useNotificationStore } from '@/features/system-mgmt/notifications/notification-store'
import { Link } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { canOpenRouteEntryNonBlocking } from '@/features/authz/guards/route-entry-access'
import { useAuthStore } from '@/stores/auth-store'

type SystemAnomalyMetadata = {
  uniqueKey?: string
  isHealing?: boolean
  details?: string[]
  errorCode?: string
}

/**
 * 极致监控全局横幅 (UDS 1.0 旗舰版)
 * 支持多重异常指纹详情展示、实时自愈感知及高层级视觉反馈
 */
export function SystemAnomalyBanner() {
  const messages = useNotificationStore((s) => s.messages)
  const user = useAuthStore((state) => state.user)
  const canOpenBasicSettings = canOpenRouteEntryNonBlocking(user, '/basic-settings')
  const bannerRef = useRef<HTMLDivElement>(null)

  // 提取系统级核心异常
  const criticalAnomalies = messages.filter(
    (m) =>
      m.priority === 'critical' &&
      ((m.metadata as SystemAnomalyMetadata | undefined)?.uniqueKey?.startsWith('system_anomaly') ?? false) &&
      !m.isArchived,
  )

  // 始终以首条报警为核心上下文
  const mainAnomaly = criticalAnomalies[0]
  const mainMetadata = mainAnomaly?.metadata as SystemAnomalyMetadata | undefined
  const isHealing = mainMetadata?.isHealing ?? false
  const details = mainMetadata?.details ?? []

  useEffect(() => {
    if (criticalAnomalies.length > 0 && bannerRef.current) {
      const height = bannerRef.current.offsetHeight
      document.documentElement.style.setProperty('--header-offset', `${height}px`)
    } else {
      document.documentElement.style.setProperty('--header-offset', '0px')
    }

    return () => {
      document.documentElement.style.setProperty('--header-offset', '0px')
    }
  }, [criticalAnomalies.length])

  if (!mainAnomaly) return null

  return (
    <div
      ref={bannerRef}
      className={`
      py-3.5 px-6 flex items-center justify-between gap-4 animate-in slide-in-from-top duration-500 sticky top-0 z-100 shadow-2xl border-b transition-all overflow-hidden
      ${isHealing ? 'bg-amber-600 border-amber-500/30' : 'bg-rose-600 border-rose-500/30'}
    `}>
      {/* 视觉装饰：高频率扫描线特效 */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)] bg-size-[200%_100%] animate-[shimmer_1.5s_infinite] pointer-events-none" />
      
      <div className="flex items-center gap-5 relative z-10">
        <div className="bg-white/20 p-2.5 rounded-2xl ring-4 ring-white/10 shrink-0 shadow-inner">
          {isHealing ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <AlertCircle className="size-5 animate-pulse" />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest italic opacity-80 flex items-center gap-1.5">
              <ShieldCheck className="size-3" /> System Integrity Watchdog / 完整性实时监管
            </span>
            <span className={`text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-widest leading-none ${isHealing ? 'bg-amber-700 text-amber-100' : 'bg-white text-rose-600'}`}>
              {isHealing ? 'REPAIRING' : (mainMetadata?.errorCode || 'ALARM')}
            </span>
            {criticalAnomalies.length > 1 && (
                <span className="text-[8px] bg-black/30 px-1.5 py-0.5 rounded font-black">+ {criticalAnomalies.length-1} OTHER ANOMALIES</span>
            )}
          </div>
          
          <div className="flex flex-col">
            <span className="text-xs font-black tracking-tight opacity-100 drop-shadow shadow-black/40">
              {mainAnomaly.title}: {mainAnomaly.content.split('。')[0]}
            </span>
            {/* 指纹详情展示层 (Depth Inspection) */}
            {details.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1.5">
                    {details.map((d: string) => (
                        <span key={d} className="text-[7px] font-mono bg-black/40 text-white/90 px-2 py-0.5 rounded-sm border border-white/10">
                            {d}
                        </span>
                    ))}
                </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3 shrink-0 relative z-10">
        {!isHealing && canOpenBasicSettings ? (
           <Link
             to="/basic-settings"
             className="text-[10px] font-black uppercase tracking-widest bg-white text-rose-600 px-6 py-2.5 rounded-full hover:bg-rose-50 transition-all flex items-center gap-2 shadow-lg shadow-rose-900/40 active:scale-95 border-none"
           >
             Emergency Intervention / 深度修复 <ArrowRight className="size-3.5" />
           </Link>
        ) : (
            <div className="flex flex-col items-end gap-1">
                 <span className="text-[10px] font-black uppercase tracking-widest opacity-80 italic flex items-center gap-2">
                    Auto-Heal Protocol <Loader2 className="size-3 animate-spin" />
                 </span>
                 <span className="text-[8px] opacity-60">DO NOT DISCONNECT / 请等待自愈完成</span>
            </div>
        )}
      </div>
    </div>
  )
}
