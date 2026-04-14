import type { ReactNode } from 'react'

type Props = {
  className?: string
}

function LegendItem({ label, description }: { label: string; description: ReactNode }) {
  return (
    <div className='flex items-start gap-2 rounded-2xl border border-dashed border-border/60 bg-background/80 px-3 py-2'>
      <div className='flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-black text-primary'>
        {label}
      </div>
      <div className='text-[11px] leading-relaxed text-muted-foreground'>{description}</div>
    </div>
  )
}

export function OrientationLegend({ className = '' }: Props) {
  return (
    <div className={`grid grid-cols-1 gap-2 md:grid-cols-3 ${className}`}>
      <LegendItem label='L' description='车厢长度方向 / 箱体长边方向' />
      <LegendItem label='W' description='车厢宽度方向 / 箱体宽边方向' />
      <LegendItem label='H' description='车厢高度方向 / 箱体高度方向' />
    </div>
  )
}
