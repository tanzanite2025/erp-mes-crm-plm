import { useLanguage } from '@/context/language-provider'

interface OverviewProps {
  data: {
    name: string
    total: number
  }[]
}

export function Overview({ data }: OverviewProps) {
  const { t } = useLanguage()

  if (!data || data.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center h-[350px] text-muted-foreground border-2 border-dashed rounded-[24px] border-muted/30 bg-muted/5'>
        <div className='size-16 rounded-full bg-background flex items-center justify-center mb-4 shadow-inner border border-muted/10'>
           <div className='size-8 rounded-full bg-muted-foreground/10 animate-pulse' />
        </div>
        <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{t('dashboard.page.throughput.empty.title' as any)}</p>
        <p className='text-[9px] mt-2 opacity-40 uppercase font-black italic'>{t('dashboard.page.throughput.empty.description' as any)}</p>
      </div>
    )
  }

  const maxValue = Math.max(...data.map((item) => item.total), 0)

  return (
    <div className='h-[350px] rounded-[24px] border border-dashed border-muted/30 bg-linear-to-b from-blue-500/[0.03] via-background to-background p-4'>
      <div className='grid h-full grid-cols-[auto_1fr] gap-4'>
        <div className='flex h-full flex-col justify-between py-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground/40'>
          {[1, 0.75, 0.5, 0.25, 0].map((step) => (
            <span key={step} className='font-mono'>
              {Math.round(maxValue * step)}
            </span>
          ))}
        </div>

        <div className='relative flex h-full items-end gap-3 overflow-x-auto rounded-[20px] border border-dashed border-blue-500/10 bg-white/70 p-4'>
          <div className='pointer-events-none absolute inset-x-4 inset-y-4 grid grid-rows-4'>
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className='border-t border-dashed border-blue-500/10' />
            ))}
          </div>

          {data.map((item) => {
            const heightPercent = maxValue > 0 ? Math.max((item.total / maxValue) * 100, 4) : 4

            return (
              <div
                key={item.name}
                className='relative z-10 flex min-w-[56px] flex-1 flex-col items-center justify-end gap-2'
                title={`${item.name}: ${item.total}`}
              >
                <span className='text-[9px] font-black font-mono tracking-tight text-blue-700/80'>
                  {item.total}
                </span>
                <div className='flex h-[240px] w-full items-end rounded-full bg-blue-500/5 p-1'>
                  <div
                    className='w-full rounded-full bg-linear-to-t from-blue-600 via-blue-500 to-cyan-400 shadow-[0_0_18px_rgba(37,99,235,0.28)] transition-all duration-700'
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <span className='w-full truncate text-center text-[8px] font-black uppercase tracking-widest text-muted-foreground/60'>
                  {item.name}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
