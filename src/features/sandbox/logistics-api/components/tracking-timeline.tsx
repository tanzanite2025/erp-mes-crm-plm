import {
  Package,
  MapPin,
  Clock,
  CheckCircle2,
  Truck,
  AlertTriangle,
} from 'lucide-react'

export interface TrackingEvent {
  time: string
  context: string
  location?: string
}

interface TrackingTimelineProps {
  trackingNo: string
  carrierName: string
  status: string
  events: TrackingEvent[]
}

const STATUS_CONFIG: Record<
  string,
  { icon: React.ReactNode; color: string; label: string }
> = {
  Pending: {
    icon: <Package className='size-4' />,
    color: 'text-slate-400 bg-slate-100',
    label: '待揽收',
  },
  Collected: {
    icon: <Package className='size-4' />,
    color: 'text-blue-500 bg-blue-50',
    label: '已揽收',
  },
  InTransit: {
    icon: <Truck className='size-4' />,
    color: 'text-amber-500 bg-amber-50',
    label: '运输中',
  },
  Delivering: {
    icon: <MapPin className='size-4' />,
    color: 'text-indigo-500 bg-indigo-50',
    label: '派送中',
  },
  Signed: {
    icon: <CheckCircle2 className='size-4' />,
    color: 'text-emerald-600 bg-emerald-50',
    label: '已签收',
  },
  Exception: {
    icon: <AlertTriangle className='size-4' />,
    color: 'text-rose-500 bg-rose-50',
    label: '异常件',
  },
}

/**
 * TrackingTimeline - UDS 1.0 纵向轨迹时间轴
 * 以工业图纸感的垂直时间线展示物流路由信息
 */
export function TrackingTimeline({
  trackingNo,
  carrierName,
  status,
  events,
}: TrackingTimelineProps) {
  const statusInfo = STATUS_CONFIG[status] || STATUS_CONFIG['InTransit']

  return (
    <div className='w-full overflow-hidden rounded-[32px] border border-dashed border-slate-200 bg-white shadow-sm'>
      {/* 头部状态栏 */}
      <div className='flex items-center justify-between border-b border-dashed border-slate-100 px-6 py-5'>
        <div className='flex items-center gap-4'>
          <div
            className={`flex size-10 items-center justify-center rounded-2xl ${statusInfo.color}`}
          >
            {statusInfo.icon}
          </div>
          <div>
            <h4 className='text-sm font-black tracking-tighter text-slate-800 uppercase italic'>
              {carrierName}
            </h4>
            <span className='font-mono text-[8px] font-bold tracking-widest text-slate-400'>
              {trackingNo}
            </span>
          </div>
        </div>
        <span
          className={`rounded-full px-4 py-1.5 text-[10px] font-black tracking-widest uppercase ${statusInfo.color}`}
        >
          {statusInfo.label}
        </span>
      </div>

      {/* 时间轴主体 */}
      <div className='px-6 py-4'>
        {events.length === 0 ? (
          <div className='py-8 text-center text-slate-300'>
            <Clock className='mx-auto mb-2 size-8 opacity-30' />
            <p className='text-[10px] font-black tracking-widest uppercase'>
              Awaiting First Trace / 等待首条轨迹
            </p>
          </div>
        ) : (
          <div className='relative pl-8'>
            {/* 垂直连接线 */}
            <div className='absolute top-2 bottom-2 left-[11px] w-[2px] bg-gradient-to-b from-emerald-400 via-blue-300 to-slate-200' />

            {events.map((event, index) => (
              <div key={index} className='group relative pb-6 last:pb-0'>
                {/* 节点圆点 */}
                <div
                  className={`absolute top-0.5 -left-8 flex size-6 items-center justify-center rounded-full border-2 transition-all ${
                    index === 0
                      ? 'scale-110 border-emerald-300 bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                      : 'border-slate-200 bg-white text-slate-400 group-hover:scale-105 group-hover:border-blue-400'
                  }`}
                >
                  {index === 0 ? (
                    <CheckCircle2 className='size-3' />
                  ) : (
                    <div className='size-1.5 rounded-full bg-current' />
                  )}
                </div>

                {/* 轨迹内容 */}
                <div
                  className={`rounded-2xl px-4 py-3 transition-all ${
                    index === 0
                      ? 'border border-emerald-200/50 bg-emerald-50/80'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <p
                    className={`text-xs leading-relaxed font-bold ${index === 0 ? 'text-emerald-800' : 'text-slate-600'}`}
                  >
                    {event.context}
                  </p>
                  <div className='mt-1.5 flex items-center gap-3'>
                    <span className='flex items-center gap-1 font-mono text-[8px] font-bold tracking-wider text-slate-400'>
                      <Clock className='size-2.5' /> {event.time}
                    </span>
                    {event.location && (
                      <span className='flex items-center gap-1 font-mono text-[8px] font-bold tracking-wider text-blue-400'>
                        <MapPin className='size-2.5' /> {event.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
