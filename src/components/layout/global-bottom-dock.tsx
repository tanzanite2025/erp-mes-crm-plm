import {
  Children,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'

interface GlobalBottomDockProps {
  children: ReactNode
}

type DockSize = {
  width: number
  height: number
}

type DockSurfaceStyle = CSSProperties & {
  '--dock-surface': string
  '--dock-surface-dark': string
  '--dock-surface-supported': string
  '--dock-surface-dark-supported': string
}

type DockContentStyle = DockSurfaceStyle & {
  '--dock-content-padding-x': string
}

const DEFAULT_DOCK_SIZE: DockSize = {
  width: 320,
  height: 72,
}

const formatDockUnit = (value: number) => Number(value.toFixed(2))

const buildMobileDockGeometry = (width: number, height: number) => {
  const resolvedWidth = Math.max(Math.floor(width), DEFAULT_DOCK_SIZE.width)
  const resolvedHeight = Math.max(Math.floor(height), DEFAULT_DOCK_SIZE.height)
  const cornerDiameter = formatDockUnit(resolvedHeight)
  const cornerRadius = formatDockUnit(cornerDiameter / 2)
  const leftTopStartX = formatDockUnit(cornerRadius * 2)
  const rightTopEndX = formatDockUnit(resolvedWidth - cornerRadius * 2)
  const rightInverseJoinX = formatDockUnit(resolvedWidth - cornerRadius)

  const path = [
    `M 0 ${resolvedHeight}`,
    `A ${cornerRadius} ${cornerRadius} 0 0 0 ${cornerRadius} ${cornerRadius}`,
    `A ${cornerRadius} ${cornerRadius} 0 0 1 ${leftTopStartX} 0`,
    `H ${rightTopEndX}`,
    `A ${cornerRadius} ${cornerRadius} 0 0 1 ${rightInverseJoinX} ${cornerRadius}`,
    `A ${cornerRadius} ${cornerRadius} 0 0 0 ${resolvedWidth} ${cornerDiameter}`,
    'Z',
  ].join(' ')

  const viewBox = `0 0 ${resolvedWidth} ${resolvedHeight}`
  const maskImage = `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='${viewBox}' preserveAspectRatio='none'><path fill='white' d='${path}'/></svg>`
  )}")`

  return {
    path,
    viewBox,
    maskImage,
    safePaddingX: formatDockUnit(cornerRadius + 10),
  }
}

type DockMaskStyle = DockSurfaceStyle & {
  WebkitMaskImage: string
  maskImage: string
  filter: string
  WebkitMaskPosition: string
  maskPosition: string
  WebkitMaskRepeat: string
  maskRepeat: string
  WebkitMaskSize: string
  maskSize: string
}

export function GlobalBottomDock({ children }: GlobalBottomDockProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const dockItems = Children.toArray(children)
  const dockSurfaceVars: DockSurfaceStyle = {
    '--dock-surface': 'hsl(var(--muted) / 0.8)',
    '--dock-surface-dark': 'hsl(var(--background) / 0.95)',
    '--dock-surface-supported': 'hsl(var(--muted) / 0.7)',
    '--dock-surface-dark-supported': 'hsl(var(--background) / 0.8)',
  }
  const [dockSize, setDockSize] = useState<DockSize>(DEFAULT_DOCK_SIZE)

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return

    const element = wrapperRef.current
    if (!element) return

    const updateSize = () => {
      const nextWidth = Math.max(
        Math.floor(element.getBoundingClientRect().width),
        0
      )
      const nextHeight = Math.max(
        Math.floor(element.getBoundingClientRect().height),
        0
      )

      setDockSize((current) =>
        current.width === nextWidth && current.height === nextHeight
          ? current
          : {
              width: nextWidth,
              height: nextHeight,
            }
      )
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  const mobileDockGeometry = useMemo(
    () => buildMobileDockGeometry(dockSize.width, dockSize.height),
    [dockSize.height, dockSize.width]
  )

  const mobileDockMaskStyle: DockMaskStyle = {
    ...dockSurfaceVars,
    WebkitMaskImage: mobileDockGeometry.maskImage,
    maskImage: mobileDockGeometry.maskImage,
    filter:
      'drop-shadow(0 -7px 16px rgba(15, 23, 42, 0.1)) drop-shadow(0 16px 30px rgba(15, 23, 42, 0.18))',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskSize: '100% 100%',
    maskSize: '100% 100%',
  }
  const dockContentStyle: DockContentStyle = {
    ...dockSurfaceVars,
    '--dock-content-padding-x': `${mobileDockGeometry.safePaddingX}px`,
  }

  return (
    <div className='pointer-events-none fixed inset-x-0 bottom-0 z-9 flex items-end justify-center px-2 sm:bottom-3 sm:items-center sm:px-4'>
      <div ref={wrapperRef} className='relative isolate overflow-visible'>
        <div
          aria-hidden='true'
          style={mobileDockMaskStyle}
          className={cn(
            'pointer-events-none absolute inset-0 -z-10 bg-(--dock-surface) backdrop-blur-xl sm:hidden dark:bg-(--dock-surface-dark)',
            'supports-backdrop-filter:bg-(--dock-surface-supported) dark:supports-backdrop-filter:bg-(--dock-surface-dark-supported)'
          )}
        />
        <svg
          aria-hidden='true'
          viewBox={mobileDockGeometry.viewBox}
          preserveAspectRatio='none'
          className='pointer-events-none absolute inset-0 -z-10 h-full w-full sm:hidden'
        >
          <path
            d={mobileDockGeometry.path}
            fill='none'
            vectorEffect='non-scaling-stroke'
            strokeLinecap='round'
            strokeLinejoin='round'
            className='stroke-border/70'
            strokeWidth='1.2'
          />
        </svg>
        <div
          style={dockContentStyle}
          className={cn(
            'group/dock pointer-events-auto relative z-10 flex min-w-0 items-center justify-center gap-3 px-(--dock-content-padding-x) pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] transition-[border-color,box-shadow,transform] duration-300 ease-out motion-reduce:transition-none sm:rounded-full sm:border sm:border-border/70 sm:bg-(--dock-surface) sm:px-3 sm:py-2 sm:pb-2 sm:shadow-lg sm:shadow-black/10 sm:backdrop-blur-xl sm:hover:-translate-y-1 sm:hover:border-primary/25 sm:hover:shadow-2xl sm:hover:shadow-primary/10 motion-reduce:sm:hover:translate-y-0 dark:sm:bg-(--dock-surface-dark)',
            'supports-backdrop-filter:sm:bg-(--dock-surface-supported) dark:supports-backdrop-filter:sm:bg-(--dock-surface-dark-supported)'
          )}
        >
          {dockItems.map((child, index) => (
            <div
              key={index}
              className={cn(
                'group/dock-item relative flex items-center justify-center transition-[filter,transform] duration-300 ease-out will-change-transform motion-reduce:transition-none sm:focus-within:-translate-y-2 sm:focus-within:scale-110 sm:hover:-translate-y-2 sm:hover:scale-110 sm:active:scale-95 motion-reduce:sm:focus-within:translate-y-0 motion-reduce:sm:focus-within:scale-100 motion-reduce:sm:hover:translate-y-0 motion-reduce:sm:hover:scale-100',
                'before:pointer-events-none before:absolute before:-inset-1.5 before:-z-10 before:rounded-full before:bg-primary/0 before:opacity-0 before:blur-lg before:transition-[background-color,opacity] before:duration-300 before:content-[""] sm:focus-within:before:bg-primary/15 sm:focus-within:before:opacity-100 sm:hover:before:bg-primary/15 sm:hover:before:opacity-100 dark:sm:focus-within:before:bg-primary/20 dark:sm:hover:before:bg-primary/20'
              )}
            >
              {child}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
