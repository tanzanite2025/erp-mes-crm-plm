import { ArrowRight } from 'lucide-react'
import type { BoxCellProps } from './vehicle-loading-diagram-types'

function Arrow({ direction }: { direction: 'horizontal' | 'vertical' }) {
  return (
    <div
      className={`flex items-center justify-center text-primary/70 ${direction === 'horizontal' ? 'h-4 w-full' : 'h-full w-4 rotate-90'}`}
    >
      <ArrowRight className='size-4 stroke-[2.5]' />
    </div>
  )
}

export function VehicleLoadingBoxCell({
  index,
  total,
  orientation,
  className = '',
  style,
  fitToContainer = false,
}: BoxCellProps) {
  const isVertical = orientation.heightAxis === 'height'
  const isLength = orientation.lengthAxis === 'length'
  const isWidth = orientation.widthAxis === 'width'
  const toneClass = isVertical
    ? 'border-emerald-400 bg-emerald-100 text-emerald-700 dark:border-emerald-500/60 dark:bg-emerald-500/15 dark:text-emerald-200'
    : isLength
      ? 'border-sky-400 bg-sky-100 text-sky-700 dark:border-sky-500/60 dark:bg-sky-500/15 dark:text-sky-200'
      : isWidth
        ? 'border-amber-400 bg-amber-100 text-amber-700 dark:border-amber-500/60 dark:bg-amber-500/15 dark:text-amber-200'
        : 'border-primary/40 bg-primary/15 text-primary'
  const arrowDirection = isVertical ? 'vertical' : 'horizontal'

  return (
    <div
      className={`relative flex items-center justify-center rounded-md border ${toneClass} text-[10px] font-black shadow-sm ${fitToContainer ? 'h-full min-h-0 w-full min-w-0' : 'min-h-14 min-w-14 flex-1'} ${className}`.trim()}
      style={style}
    >
      <div className='absolute top-1 left-1 text-[8px] font-black opacity-60'>
        {index + 1}
      </div>
      <div className='flex h-full w-full items-center justify-center gap-1 px-1'>
        <Arrow direction={arrowDirection} />
        <div className='flex-1 text-center leading-tight'>
          <div>箱</div>
          <div className='text-[8px] font-medium opacity-70'>
            {orientation.label}
          </div>
        </div>
        <Arrow direction={arrowDirection} />
      </div>
      <div className='absolute right-1 bottom-1 text-[8px] font-black opacity-60'>
        {total}
      </div>
    </div>
  )
}
