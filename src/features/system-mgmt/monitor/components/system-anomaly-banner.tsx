import { useEffect, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { AlertCircle, ArrowRight, Loader2, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { canOpenRouteEntryNonBlocking } from '@/features/authz/guards/route-entry-access'
import { useNotificationStore } from '@/features/system-mgmt/notifications/notification-store'

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
  const canOpenBasicSettings = canOpenRouteEntryNonBlocking(
    user,
    '/basic-settings'
  )
  const bannerRef = useRef<HTMLDivElement>(null)

  // 提取系统级核心异常
  const criticalAnomalies = messages.filter(
    (m) =>
      m.priority === 'critical' &&
      ((m.metadata as SystemAnomalyMetadata | undefined)?.uniqueKey?.startsWith(
        'system_anomaly'
      ) ??
        false) &&
      !m.isArchived
  )

  // 始终以首条报警为核心上下文
  const mainAnomaly = criticalAnomalies[0]
  const mainMetadata = mainAnomaly?.metadata as
    | SystemAnomalyMetadata
    | undefined
  const isHealing = mainMetadata?.isHealing ?? false
  const details = mainMetadata?.details ?? []

  useEffect(() => {
    if (criticalAnomalies.length > 0 && bannerRef.current) {
      const height = bannerRef.current.offsetHeight
      document.documentElement.style.setProperty(
        '--header-offset',
        `${height}px`
      )
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
      className={`sticky top-0 z-100 flex animate-in items-center justify-between gap-4 overflow-hidden border-b px-6 py-3.5 shadow-2xl transition-all duration-500 slide-in-from-top ${isHealing ? 'border-amber-500/30 bg-amber-600' : 'border-rose-500/30 bg-rose-600'} `}
    >
      {/* 视觉装饰：高频率扫描线特效 */}
      <div className='pointer-events-none absolute inset-0 animate-[shimmer_1.5s_infinite] bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)] bg-size-[200%_100%]' />

      <div className='relative z-10 flex items-center gap-5'>
        <div className='shrink-0 rounded-2xl bg-white/20 p-2.5 shadow-inner ring-4 ring-white/10'>
          {isHealing ? (
            <Loader2 className='size-5 animate-spin' />
          ) : (
            <AlertCircle className='size-5 animate-pulse' />
          )}
        </div>
        <div className='flex flex-col gap-1'>
          <div className='flex items-center gap-3'>
            <span className='flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase italic opacity-80'>
              <ShieldCheck className='size-3' /> System Integrity Watchdog /
              完整性实时监管
            </span>
            <span
              className={`rounded px-2 py-0.5 text-[8px] leading-none font-black tracking-widest uppercase ${isHealing ? 'bg-amber-700 text-amber-100' : 'bg-white text-rose-600'}`}
            >
              {isHealing ? 'REPAIRING' : mainMetadata?.errorCode || 'ALARM'}
            </span>
            {criticalAnomalies.length > 1 && (
              <span className='rounded bg-black/30 px-1.5 py-0.5 text-[8px] font-black'>
                + {criticalAnomalies.length - 1} OTHER ANOMALIES
              </span>
            )}
          </div>

          <div className='flex flex-col'>
            <span className='text-xs font-black tracking-tight opacity-100 shadow-black/40 drop-shadow'>
              {mainAnomaly.title}: {mainAnomaly.content.split('。')[0]}
            </span>
            {/* 指纹详情展示层 (Depth Inspection) */}
            {details.length > 0 && (
              <div className='mt-1.5 flex flex-wrap gap-2'>
                {details.map((d: string) => (
                  <span
                    key={d}
                    className='rounded-sm border border-white/10 bg-black/40 px-2 py-0.5 font-mono text-[7px] text-white/90'
                  >
                    {d}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className='relative z-10 flex shrink-0 items-center gap-3'>
        {!isHealing && canOpenBasicSettings ? (
          <Link
            to='/basic-settings'
            className='flex items-center gap-2 rounded-full border-none bg-white px-6 py-2.5 text-[10px] font-black tracking-widest text-rose-600 uppercase shadow-lg shadow-rose-900/40 transition-all hover:bg-rose-50 active:scale-95'
          >
            Emergency Intervention / 深度修复{' '}
            <ArrowRight className='size-3.5' />
          </Link>
        ) : (
          <div className='flex flex-col items-end gap-1'>
            <span className='flex items-center gap-2 text-[10px] font-black tracking-widest uppercase italic opacity-80'>
              Auto-Heal Protocol <Loader2 className='size-3 animate-spin' />
            </span>
            <span className='text-[8px] opacity-60'>
              DO NOT DISCONNECT / 请等待自愈完成
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
