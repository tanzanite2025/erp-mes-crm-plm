import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react'
import { Link } from '@tanstack/react-router'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/components/ui/sidebar'
import {
  calculateFloatingPosition,
  createSidebarCategoryPreviews,
  type SidebarCategoryLink,
  type SidebarCategoryPreview,
} from './sidebar-category-scrubber-utils'
import type { NavGroup } from './types'
import {
  centerSidebarNavGroup,
  resolveCenteredSidebarNavGroupId,
} from './use-sidebar-active-center'

type SidebarCategoryScrubberProps = {
  navGroups: NavGroup[]
  activeGroupId?: string
  navViewportRef: RefObject<HTMLDivElement | null>
}

const CLOSE_DELAY_MS = 140
const SCRUBBER_ITEM_SELECTOR = '[data-sidebar-scrubber-item]'
const SCRUBBER_ITEM_SPRING = {
  mass: 0.12,
  stiffness: 320,
  damping: 24,
}

function getScrubberItemElement(categoryId: string): HTMLElement | null {
  const elements = document.querySelectorAll<HTMLElement>(
    SCRUBBER_ITEM_SELECTOR
  )

  return (
    Array.from(elements).find(
      (element) => element.dataset.sidebarScrubberItem === categoryId
    ) ?? null
  )
}

function useSidebarCenteredGroup(
  navViewportRef: RefObject<HTMLDivElement | null>,
  groupIds: string[],
  fallbackGroupId?: string
) {
  const [centeredGroupId, setCenteredGroupId] = useState<string | null>(
    fallbackGroupId ?? groupIds[0] ?? null
  )

  const updateCenteredGroup = useCallback(() => {
    const viewport = navViewportRef.current

    if (!viewport || groupIds.length === 0) {
      setCenteredGroupId(fallbackGroupId ?? null)
      return
    }

    setCenteredGroupId(
      resolveCenteredSidebarNavGroupId(viewport, groupIds) ??
        fallbackGroupId ??
        groupIds[0] ??
        null
    )
  }, [fallbackGroupId, groupIds, navViewportRef])

  useEffect(() => {
    const viewport = navViewportRef.current
    let frameId = 0
    let resizeObserver: ResizeObserver | null = null

    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(updateCenteredGroup)
    }

    scheduleUpdate()

    if (!viewport) {
      return () => {
        window.cancelAnimationFrame(frameId)
      }
    }

    viewport.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scheduleUpdate)
      resizeObserver.observe(viewport)
      if (viewport.firstElementChild instanceof HTMLElement) {
        resizeObserver.observe(viewport.firstElementChild)
      }
    }

    return () => {
      viewport.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      window.cancelAnimationFrame(frameId)
      resizeObserver?.disconnect()
    }
  }, [navViewportRef, updateCenteredGroup])

  return centeredGroupId
}

export function SidebarCategoryScrubber({
  navGroups,
  activeGroupId,
  navViewportRef,
}: SidebarCategoryScrubberProps) {
  const { isMobile, setOpen, state } = useSidebar()
  const shouldReduceMotion = useReducedMotion()
  const floatingRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<number | null>(null)
  const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(
    null
  )
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const [floatingPosition, setFloatingPosition] = useState({
    top: 0,
    left: 0,
  })

  const categoryPreviews = useMemo(
    () => createSidebarCategoryPreviews(navGroups),
    [navGroups]
  )
  const categoryIds = useMemo(
    () => categoryPreviews.map((category) => category.id),
    [categoryPreviews]
  )
  const centeredGroupId = useSidebarCenteredGroup(
    navViewportRef,
    categoryIds,
    activeGroupId
  )
  const hoveredCategory = useMemo(
    () =>
      categoryPreviews.find((category) => category.id === hoveredCategoryId) ??
      null,
    [categoryPreviews, hoveredCategoryId]
  )

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const openCategory = useCallback(
    (categoryId: string, anchor: HTMLElement) => {
      clearCloseTimer()
      setHoveredCategoryId(categoryId)
      setAnchorRect(anchor.getBoundingClientRect())
    },
    [clearCloseTimer]
  )

  const scheduleClose = useCallback(() => {
    clearCloseTimer()
    closeTimerRef.current = window.setTimeout(() => {
      setHoveredCategoryId(null)
      setAnchorRect(null)
    }, CLOSE_DELAY_MS)
  }, [clearCloseTimer])

  const closeCategory = useCallback(() => {
    clearCloseTimer()
    setHoveredCategoryId(null)
    setAnchorRect(null)
  }, [clearCloseTimer])

  const centerCategoryInSidebar = useCallback(
    (categoryId: string) => {
      setOpen(true)

      const behavior: ScrollBehavior = shouldReduceMotion ? 'auto' : 'smooth'

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const viewport = navViewportRef.current

          if (viewport) {
            centerSidebarNavGroup(viewport, categoryId, behavior)
          }
        })
      })
    },
    [navViewportRef, setOpen, shouldReduceMotion]
  )

  useLayoutEffect(() => {
    if (!anchorRect || !hoveredCategory) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      const floatingElement = floatingRef.current
      const floatingWidth = floatingElement?.offsetWidth || 360
      const floatingHeight = floatingElement?.offsetHeight || 360

      setFloatingPosition(
        calculateFloatingPosition({
          anchorRect,
          floatingWidth,
          floatingHeight,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
        })
      )
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [anchorRect, hoveredCategory])

  useEffect(() => {
    if (!hoveredCategoryId) {
      return
    }

    const refreshAnchorRect = () => {
      const anchor = getScrubberItemElement(hoveredCategoryId)

      if (anchor) {
        setAnchorRect(anchor.getBoundingClientRect())
      }
    }

    window.addEventListener('resize', refreshAnchorRect)
    window.addEventListener('scroll', refreshAnchorRect, true)

    return () => {
      window.removeEventListener('resize', refreshAnchorRect)
      window.removeEventListener('scroll', refreshAnchorRect, true)
    }
  }, [hoveredCategoryId])

  useEffect(
    () => () => {
      clearCloseTimer()
    },
    [clearCloseTimer]
  )

  if (isMobile || categoryPreviews.length <= 1) {
    return null
  }

  const railLeft =
    state === 'expanded' ? 'calc(var(--sidebar-width) + 0.35rem)' : '0.45rem'

  return (
    <>
      <nav
        aria-label='侧边栏顶级分类快速索引'
        className='pointer-events-auto fixed top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center gap-1.5 rounded-full px-1.5 py-2 transition-[left] duration-200 ease-out motion-reduce:transition-none md:flex'
        style={{ left: railLeft }}
        onMouseEnter={clearCloseTimer}
        onMouseLeave={scheduleClose}
      >
        {categoryPreviews.map((category) => {
          const isHovered = hoveredCategoryId === category.id
          const isCurrentRoute = activeGroupId === category.id
          const isCentered = centeredGroupId === category.id

          return (
            <button
              key={category.id}
              type='button'
              data-sidebar-scrubber-item={category.id}
              aria-label={`定位到${category.title}`}
              aria-current={isCurrentRoute ? 'location' : undefined}
              className='group/category-scrubber flex h-3 w-8 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
              onClick={() => centerCategoryInSidebar(category.id)}
              onFocus={(event) =>
                openCategory(category.id, event.currentTarget)
              }
              onMouseEnter={(event) =>
                openCategory(category.id, event.currentTarget)
              }
              onMouseLeave={scheduleClose}
            >
              <motion.span
                aria-hidden='true'
                initial={false}
                animate={{
                  width: isHovered
                    ? 30
                    : isCentered
                      ? 22
                      : isCurrentRoute
                        ? 18
                        : 13,
                  opacity: isHovered || isCentered || isCurrentRoute ? 1 : 0.42,
                }}
                transition={
                  shouldReduceMotion ? { duration: 0 } : SCRUBBER_ITEM_SPRING
                }
                className={cn(
                  'h-0.5 rounded-full bg-muted-foreground/70 shadow-none transition-colors',
                  isCurrentRoute && 'bg-primary/80',
                  isCentered &&
                    'bg-orange-500 shadow-[0_0_10px_hsl(var(--primary)/0.18)]',
                  isHovered && 'bg-orange-500'
                )}
              />
            </button>
          )
        })}
      </nav>
      <SidebarCategoryFloatingCard
        category={hoveredCategory}
        floatingRef={floatingRef}
        position={floatingPosition}
        onClose={closeCategory}
        onEnter={clearCloseTimer}
        onLeave={scheduleClose}
        onNavigate={closeCategory}
      />
    </>
  )
}

function SidebarCategoryFloatingCard({
  category,
  floatingRef,
  position,
  onClose,
  onEnter,
  onLeave,
  onNavigate,
}: {
  category: SidebarCategoryPreview | null
  floatingRef: RefObject<HTMLDivElement | null>
  position: { top: number; left: number }
  onClose: () => void
  onEnter: () => void
  onLeave: () => void
  onNavigate: () => void
}) {
  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <AnimatePresence>
      {category ? (
        <motion.div
          ref={floatingRef}
          key={category.id}
          role='dialog'
          aria-label={`${category.title}快捷导航`}
          initial={{ opacity: 0, x: -6, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -4, scale: 0.98 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className='fixed z-50 w-[min(22rem,calc(100vw-3rem))] overflow-hidden rounded-2xl border border-border/70 bg-popover text-popover-foreground shadow-2xl shadow-black/15 backdrop-blur-xl'
          style={{
            top: position.top,
            left: position.left,
          }}
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              onClose()
            }
          }}
        >
          <div className='border-b border-border/60 px-3.5 py-3'>
            <div className='flex items-center justify-between gap-3'>
              <div className='min-w-0'>
                <p className='truncate text-[13px] leading-tight font-black tracking-tight text-foreground italic'>
                  {category.title}
                </p>
                <p className='mt-1 text-[10px] leading-none font-semibold tracking-wide text-muted-foreground'>
                  {category.linkCount} 个业务域入口
                </p>
              </div>
              <span className='shrink-0 rounded-full bg-orange-500/10 px-2 py-1 text-[10px] leading-none font-black text-orange-600 dark:text-orange-300'>
                快速定位
              </span>
            </div>
          </div>
          <div className='no-scrollbar max-h-[min(70vh,34rem)] space-y-3 overflow-y-auto px-3 py-3'>
            {category.directLinks.length > 0 ? (
              <SidebarCategoryLinkGrid
                links={category.directLinks}
                onNavigate={onNavigate}
              />
            ) : null}
            {category.sections.map((section) => (
              <section key={section.id} className='space-y-1.5'>
                <div className='px-1 text-[10px] leading-none font-black tracking-widest text-muted-foreground uppercase'>
                  {section.title}
                </div>
                <SidebarCategoryLinkGrid
                  links={section.links}
                  onNavigate={onNavigate}
                />
              </section>
            ))}
            {category.linkCount === 0 ? (
              <p className='rounded-xl border border-dashed border-border/70 px-3 py-4 text-center text-[11px] font-semibold text-muted-foreground'>
                当前分类暂无可直接进入的业务域
              </p>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  )
}

function SidebarCategoryLinkGrid({
  links,
  onNavigate,
}: {
  links: SidebarCategoryLink[]
  onNavigate: () => void
}) {
  return (
    <div className='grid gap-1'>
      {links.map((link) => {
        const Icon = link.icon

        return (
          <Link
            key={link.id}
            to={link.url}
            className='group/category-link flex min-h-8 min-w-0 items-center gap-2 rounded-xl border border-transparent px-2.5 py-1.5 text-[12px] leading-tight font-black tracking-tight text-popover-foreground/78 italic transition-colors hover:border-orange-500/20 hover:bg-orange-500/10 hover:text-popover-foreground focus-visible:ring-2 focus-visible:ring-primary/55 focus-visible:outline-none'
            onClick={onNavigate}
          >
            {Icon ? (
              <Icon className='size-3.5 shrink-0 opacity-70 transition-opacity group-hover/category-link:opacity-100' />
            ) : null}
            <span className='min-w-0 flex-1 truncate'>{link.title}</span>
            {link.badge ? (
              <span className='shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none font-black text-muted-foreground'>
                {link.badge}
              </span>
            ) : null}
          </Link>
        )
      })}
    </div>
  )
}
