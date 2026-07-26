import type { ReactNode } from 'react'

type Props = {
  className?: string
  compact?: boolean
}

function LegendItem({
  label,
  description,
  compact = false,
}: {
  label: string
  description: ReactNode
  compact?: boolean
}) {
  return (
    <div
      className={`flex items-start gap-2 border border-dashed border-border/60 bg-background/80 ${compact ? 'rounded-xl px-2 py-1.5' : 'rounded-2xl px-3 py-2'}`}
    >
      <div
        className={`flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-black text-primary ${compact ? 'size-6' : 'size-7'}`}
      >
        {label}
      </div>
      <div
        className={`${compact ? 'text-[10px] leading-snug' : 'text-[11px] leading-relaxed'} text-muted-foreground`}
      >
        {description}
      </div>
    </div>
  )
}

export function OrientationLegend({ className = '', compact = false }: Props) {
  return (
    <div className={`grid grid-cols-1 gap-2 md:grid-cols-3 ${className}`}>
      <LegendItem
        label='L'
        description={compact ? '长度 / 长边' : '车厢长度方向 / 箱体长边方向'}
        compact={compact}
      />
      <LegendItem
        label='W'
        description={compact ? '宽度 / 宽边' : '车厢宽度方向 / 箱体宽边方向'}
        compact={compact}
      />
      <LegendItem
        label='H'
        description={compact ? '高度 / 高边' : '车厢高度方向 / 箱体高度方向'}
        compact={compact}
      />
    </div>
  )
}
