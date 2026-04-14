import type { BoxCellProps } from './vehicle-loading-diagram-types'

function Arrow({ direction }: { direction: 'horizontal' | 'vertical' }) {
  return (
    <div className={`flex items-center justify-center text-primary/70 ${direction === 'horizontal' ? 'h-4 w-full' : 'h-full w-4 rotate-90'}`}>
      <svg viewBox='0 0 24 24' className='size-4 fill-current'>
        <path d='M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z' />
      </svg>
    </div>
  )
}

export function VehicleLoadingBoxCell({ index, total, orientationLabel, orientationAxis }: BoxCellProps) {
  const isVertical = orientationAxis === 'height'
  const isLength = orientationAxis === 'length'
  const isWidth = orientationAxis === 'width'
  const toneClass = isVertical ? 'bg-emerald-100 border-emerald-400 text-emerald-700' : isLength ? 'bg-sky-100 border-sky-400 text-sky-700' : isWidth ? 'bg-amber-100 border-amber-400 text-amber-700' : 'bg-primary/15 border-primary/40 text-primary'
  const arrowDirection = isVertical ? 'vertical' : 'horizontal'

  return (
    <div className={`relative flex min-h-14 min-w-14 flex-1 items-center justify-center rounded-md border ${toneClass} text-[10px] font-black shadow-sm`}>
      <div className='absolute left-1 top-1 text-[8px] font-black opacity-60'>{index + 1}</div>
      <div className='flex h-full w-full items-center justify-center gap-1 px-1'>
        <Arrow direction={arrowDirection} />
        <div className='flex-1 text-center leading-tight'>
          <div>箱</div>
          <div className='text-[8px] font-medium opacity-70'>{orientationLabel}</div>
        </div>
        <Arrow direction={arrowDirection} />
      </div>
      <div className='absolute bottom-1 right-1 text-[8px] font-black opacity-60'>{total}</div>
    </div>
  )
}
