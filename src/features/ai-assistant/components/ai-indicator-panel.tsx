import { Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface IndicatorItem {
  label: string
  val: number | undefined
  color: 'emerald' | 'rose' | 'indigo' | 'amber'
  sub: string
}

interface AiIndicatorPanelProps {
  items: IndicatorItem[]
  mobile?: boolean
}

export function AiIndicatorPanel({
  items,
  mobile = false,
}: AiIndicatorPanelProps) {
  if (mobile) {
    return (
      <div className='border-b border-dashed border-indigo-100 bg-slate-50/40 md:hidden'>
        <div className='px-3 py-2'>
          <div className='grid grid-cols-3 gap-2'>
            {items.map((item, index) => (
              <div
                key={item.label}
                className={cn(
                  'min-h-[68px] min-w-0 rounded-[16px] border bg-white/95 px-2.5 py-2 shadow-sm',
                  items.length % 3 === 1 &&
                    index === items.length - 1 &&
                    'col-span-3',
                  `border-${item.color}-100`
                )}
              >
                <p
                  className={cn(
                    'truncate text-[9px] leading-tight font-black tracking-tight',
                    `text-${item.color}-500`
                  )}
                >
                  {item.label}
                </p>
                <div className='mt-1.5 flex items-end justify-between gap-1'>
                  <p
                    className={cn(
                      'text-[1.8rem] leading-none font-black tracking-tighter italic',
                      `text-${item.color}-700`
                    )}
                  >
                    {item.val ?? 0}
                  </p>
                  <span className='shrink-0 pb-0.5 text-[8px] leading-none font-black text-slate-300'>
                    {item.sub}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <aside className='hidden h-full space-y-5 overflow-y-auto border-l border-dashed border-indigo-100 bg-slate-50/30 p-6 md:block lg:p-8'>
      <h3 className='flex items-center gap-3 px-1 text-[10px] font-black tracking-[0.28em] text-slate-400 uppercase italic opacity-70'>
        <Activity className='size-3.5 animate-pulse text-indigo-500' />
        决策核心指标
      </h3>
      <div className='grid grid-cols-2 gap-4'>
        {items.map((item) => (
          <div
            key={item.label}
            className={cn(
              'min-h-[120px] rounded-[24px] border bg-white/95 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
              `border-${item.color}-100`
            )}
          >
            <p
              className={cn(
                'mb-4 text-[10px] font-black tracking-widest uppercase opacity-60',
                `text-${item.color}-500`
              )}
            >
              {item.label}
            </p>
            <div className='flex items-end justify-between gap-3'>
              <p
                className={cn(
                  'text-3xl leading-none font-black tracking-tighter italic tabular-nums lg:text-[2.4rem]',
                  `text-${item.color}-700`
                )}
              >
                {item.val ?? 0}
              </p>
              <span className='pb-1 text-[9px] leading-none font-black text-slate-300'>
                {item.sub}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className='border-t border-dashed border-slate-200 pt-6'>
        <p className='mb-2 text-[8px] font-black tracking-widest text-slate-400 uppercase opacity-40'>
          System Integrity Sentinel
        </p>
        <div className='flex items-center gap-2'>
          <div className='size-1.5 animate-pulse rounded-full bg-emerald-500' />
          <span className='text-[9px] font-black text-slate-500 italic'>
            Rust Engine Active
          </span>
        </div>
      </div>
    </aside>
  )
}
