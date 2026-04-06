import { cn } from '@/lib/utils'
import { Activity } from 'lucide-react'

export interface IndicatorItem {
  label: string;
  val: number | undefined;
  color: 'emerald' | 'rose' | 'indigo' | 'amber';
  sub: string;
}

interface AiIndicatorPanelProps {
  items: IndicatorItem[];
  mobile?: boolean;
}

export function AiIndicatorPanel({ items, mobile = false }: AiIndicatorPanelProps) {
  if (mobile) {
    return (
      <div className='md:hidden border-b border-dashed border-indigo-100 bg-slate-50/40'>
        <div className='px-3 py-2'>
          <div className='grid grid-cols-3 gap-2'>
            {items.map((item, index) => (
              <div
                key={item.label}
                className={cn(
                  'min-w-0 min-h-[68px] rounded-[16px] border bg-white/95 px-2.5 py-2 shadow-sm',
                  items.length % 3 === 1 && index === items.length - 1 && 'col-span-3',
                  `border-${item.color}-100`,
                )}
              >
                <p className={cn('text-[9px] font-black tracking-tight truncate leading-tight', `text-${item.color}-500`)}>
                  {item.label}
                </p>
                <div className='mt-1.5 flex items-end justify-between gap-1'>
                  <p className={cn('text-[1.8rem] font-black italic tracking-tighter leading-none', `text-${item.color}-700`)}>
                    {item.val ?? 0}
                  </p>
                  <span className='text-[8px] font-black text-slate-300 leading-none pb-0.5 shrink-0'>{item.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <aside className='hidden md:block bg-slate-50/30 p-6 lg:p-8 space-y-5 h-full border-l border-dashed border-indigo-100 overflow-y-auto'>
      <h3 className='text-[10px] font-black text-slate-400 tracking-[0.28em] flex items-center gap-3 italic opacity-70 px-1 uppercase'>
        <Activity className='size-3.5 text-indigo-500 animate-pulse' />
        决策核心指标
      </h3>
      <div className='grid grid-cols-2 gap-4'>
        {items.map((item) => (
          <div
            key={item.label}
            className={cn(
              'min-h-[120px] rounded-[24px] bg-white/95 p-5 border shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5',
              `border-${item.color}-100`,
            )}
          >
            <p className={cn('text-[10px] font-black tracking-widest mb-4 uppercase opacity-60', `text-${item.color}-500`)}>
              {item.label}
            </p>
            <div className='flex items-end justify-between gap-3'>
              <p className={cn('text-3xl lg:text-[2.4rem] font-black italic tracking-tighter leading-none tabular-nums', `text-${item.color}-700`)}>
                {item.val ?? 0}
              </p>
              <span className='text-[9px] font-black text-slate-300 leading-none pb-1'>{item.sub}</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="pt-6 border-t border-dashed border-slate-200">
        <p className="text-[8px] font-black text-slate-400 opacity-40 tracking-widest uppercase mb-2">
          System Integrity Sentinel
        </p>
        <div className="flex items-center gap-2">
          <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] font-black text-slate-500 italic">Rust Engine Active</span>
        </div>
      </div>
    </aside>
  );
}
