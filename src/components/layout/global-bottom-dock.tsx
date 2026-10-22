import {
  Children,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { motion } from 'framer-motion'

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
  '--dock-border': string
  '--dock-border-dark': string
}

type DockContentStyle = CSSProperties & {
  '--dock-content-padding-x': string
}

const DEFAULT_DOCK_SIZE: DockSize = {
  width: 320,
  height: 72,
}

const DOCK_ITEM_BASE_SIZE = 44
const DOCK_ITEM_HOVER_SPRING = {
  mass: 0.1,
  stiffness: 260,
  damping: 20,
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

type DockMaskStyle = CSSProperties & {
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

interface FloatingDockItemProps {
  children: ReactNode
}

function FloatingDockItem({ children }: FloatingDockItemProps) {
  return (
    <motion.div
      initial='idle'
      animate='idle'
      whileHover='hover'
      style={{
        width: DOCK_ITEM_BASE_SIZE,
        height: DOCK_ITEM_BASE_SIZE,
      }}
      className='relative flex shrink-0 items-center justify-center'
    >
      <motion.div
        aria-hidden='true'
        initial={false}
        variants={{
          idle: { opacity: 0, scale: 0.85 },
          hover: { opacity: 0.9, scale: 1.24 },
        }}
        transition={DOCK_ITEM_HOVER_SPRING}
        className='pointer-events-none absolute inset-0 -z-10 hidden rounded-full bg-primary/20 blur-xl sm:block'
      />
      <motion.div
        variants={{
          idle: { y: 0, scale: 1 },
          hover: { y: -10, scale: 1.18 },
        }}
        transition={DOCK_ITEM_HOVER_SPRING}
        className='relative z-10 flex items-center justify-center will-change-transform'
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

export function GlobalBottomDock({ children }: GlobalBottomDockProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const dockItems = Children.toArray(children)
  const dockSurfaceVars: DockSurfaceStyle = {
    '--dock-surface': '#dce6f2',
    '--dock-surface-dark': '#263449',
    '--dock-border': '#a9bdd5',
    '--dock-border-dark': '#52647d',
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
    '--dock-content-padding-x': `${mobileDockGeometry.safePaddingX}px`,
  }
  return (
    <div
      data-slot='global-bottom-dock'
      style={dockSurfaceVars}
      className='pointer-events-none fixed right-(--header-fixed-right,0px) bottom-0 left-(--header-fixed-left,0px) z-9 flex items-end justify-center px-2 sm:bottom-3 sm:items-center sm:px-4'
    >
      <div ref={wrapperRef} className='relative isolate overflow-visible'>
        <div
          data-slot='global-bottom-dock-mobile-surface'
          aria-hidden='true'
          style={mobileDockMaskStyle}
          className='pointer-events-none absolute inset-0 -z-10 bg-(--dock-surface) sm:hidden dark:bg-(--dock-surface-dark)'
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
            className='stroke-(--dock-border) dark:stroke-(--dock-border-dark)'
            strokeWidth='1.2'
          />
        </svg>
        <div
          data-slot='global-bottom-dock-content'
          style={dockContentStyle}
          className='pointer-events-auto relative z-10 flex min-w-0 items-center justify-center gap-3 px-(--dock-content-padding-x) pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] transition-[border-color,box-shadow] duration-500 ease-out motion-reduce:transition-none sm:rounded-full sm:border sm:border-(--dock-border) sm:bg-(--dock-surface) sm:px-3 sm:py-2 sm:pb-2 sm:shadow-xl sm:shadow-black/20 sm:hover:shadow-2xl dark:sm:border-(--dock-border-dark) dark:sm:bg-(--dock-surface-dark)'
        >
          {dockItems.map((child, index) => (
            <FloatingDockItem key={index}>{child}</FloatingDockItem>
          ))}
        </div>
      </div>
    </div>
  )
}
