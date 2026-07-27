import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import { Link } from '@tanstack/react-router'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { useSidebar } from '@/components/ui/sidebar'
import { getProjectedTabsFromPermissionSnapshot } from '@/features/authz/guards/route-access'
import {
  createSidebarCategoryPreviews,
  resolveSidebarScrubberPointerTarget,
  type SidebarCategoryDomainLink,
  type SidebarCategoryTabLink,
  type SidebarCategoryPreview,
  type SidebarScrubberPointerTargetRect,
} from './sidebar-category-scrubber-utils'
import { resolveSidebarNodeTabPreviews } from './sidebar-tab-preview-registry'
import type { NavGroup } from './types'
import {
  centerSidebarNavGroup,
  resolveCenteredSidebarNavGroupId,
} from './use-sidebar-active-center'

type SidebarCategoryScrubberProps = {
  navGroups: NavGroup[]
  activeGroupId?: string
  navViewportRef: RefObject<HTMLDivElement | null>
  onCategoryActivate?: (categoryId: string) => void
}

const CLOSE_DELAY_MS = 140
const FLOATING_CARD_WIDTH_PX = 560
const FLOATING_CARD_MAX_HEIGHT_PX = 768
const FLOATING_CARD_MIN_WIDTH_PX = 360
const FLOATING_CARD_VIEWPORT_GAP_PX = 48
const FLOATING_CARD_VIEWPORT_HEIGHT_RATIO = 0.8
const FLOATING_CARD_EDGE_PADDING_PX = 12
const FLOATING_CARD_ESTIMATED_INITIAL_HEIGHT_PX = 360
const SCRUBBER_ITEM_SELECTOR = '[data-sidebar-scrubber-item]'
const SCRUBBER_ITEM_SPRING = {
  mass: 0.12,
  stiffness: 320,
  damping: 24,
}

function resolveFloatingCardViewportBounds() {
  const viewportSafeWidth = Math.max(
    FLOATING_CARD_MIN_WIDTH_PX,
    window.innerWidth - FLOATING_CARD_VIEWPORT_GAP_PX
  )
  const viewportSafeHeight = Math.max(
    320,
    Math.floor(window.innerHeight * FLOATING_CARD_VIEWPORT_HEIGHT_RATIO)
  )

  return {
    width: Math.min(FLOATING_CARD_WIDTH_PX, viewportSafeWidth),
    maxHeight: Math.min(FLOATING_CARD_MAX_HEIGHT_PX, viewportSafeHeight),
  }
}

function resolveFloatingCardMeasuredHeightForCentering({
  measuredHeight,
  maxHeight,
}: {
  measuredHeight?: number
  maxHeight: number
}) {
  if (typeof measuredHeight === 'number' && measuredHeight > 0) {
    return Math.min(measuredHeight, maxHeight)
  }

  return Math.min(FLOATING_CARD_ESTIMATED_INITIAL_HEIGHT_PX, maxHeight)
}

function resolveAdjacentFloatingCardLeft({
  floatingWidth,
  viewportWidth,
  scrubberColumnRight = 0,
}: {
  floatingWidth: number
  viewportWidth: number
  scrubberColumnRight?: number
}) {
  const leftBoundary = Math.max(
    FLOATING_CARD_EDGE_PADDING_PX,
    scrubberColumnRight + FLOATING_CARD_EDGE_PADDING_PX
  )
  const rightBoundary = Math.max(
    leftBoundary + floatingWidth,
    viewportWidth - FLOATING_CARD_EDGE_PADDING_PX
  )

  return Math.min(rightBoundary - floatingWidth, leftBoundary)
}

function resolveCenteredFloatingCardTop({
  floatingHeight,
  viewportHeight,
}: {
  floatingHeight: number
  viewportHeight: number
}) {
  return Math.max(
    FLOATING_CARD_EDGE_PADDING_PX,
    Math.floor((viewportHeight - floatingHeight) / 2)
  )
}

function getScrubberPointerTargetElement(
  scrubberNav: HTMLElement,
  pointerY: number
): HTMLElement | null {
  const elements = Array.from(
    scrubberNav.querySelectorAll<HTMLElement>(SCRUBBER_ITEM_SELECTOR)
  )
  const targetId = resolveSidebarScrubberPointerTarget({
    pointerY,
    targets: elements.map<SidebarScrubberPointerTargetRect>((element) => {
      const rect = element.getBoundingClientRect()

      return {
        id: element.dataset.sidebarScrubberItem ?? '',
        top: rect.top,
        bottom: rect.bottom,
      }
    }),
  })

  if (!targetId) {
    return null
  }

  return (
    elements.find(
      (element) => element.dataset.sidebarScrubberItem === targetId
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
  onCategoryActivate,
}: SidebarCategoryScrubberProps) {
  const { isMobile, setOpen, state } = useSidebar()
  const { t } = useLanguage()
  const user = useAuthStore((store) => store.user)
  const isIdentitySynced = useAuthStore((store) => store.isIdentitySynced)
  const shouldReduceMotion = useReducedMotion()
  const floatingRef = useRef<HTMLDivElement>(null)
  const scrubberColumnRef = useRef<HTMLElement>(null)
  const closeTimerRef = useRef<number | null>(null)
  const centerRetryTimerRef = useRef<number | null>(null)
  const lastPointerActivationRef = useRef<{
    categoryId: string
    activatedAt: number
  } | null>(null)
  const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(
    null
  )
  const [floatingPosition, setFloatingPosition] = useState({
    top: 0,
    left: 0,
  })

  const categoryPreviews = useMemo(
    () =>
      createSidebarCategoryPreviews(navGroups, (node) => {
        const tabs = resolveSidebarNodeTabPreviews(node, t)

        return isIdentitySynced
          ? getProjectedTabsFromPermissionSnapshot(user, tabs)
          : tabs
      }),
    [isIdentitySynced, navGroups, t, user]
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

  const clearCenterRetryTimer = useCallback(() => {
    if (centerRetryTimerRef.current !== null) {
      window.clearTimeout(centerRetryTimerRef.current)
      centerRetryTimerRef.current = null
    }
  }, [])

  const openCategory = useCallback(
    (categoryId: string) => {
      clearCloseTimer()
      setHoveredCategoryId(categoryId)
    },
    [clearCloseTimer]
  )

  const openCategoryFromPointer = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const anchor = getScrubberPointerTargetElement(
        event.currentTarget,
        event.clientY
      )
      const categoryId = anchor?.dataset.sidebarScrubberItem

      if (!anchor || !categoryId) {
        return
      }

      if (categoryId === hoveredCategoryId) {
        clearCloseTimer()
        return
      }

      openCategory(categoryId)
    },
    [clearCloseTimer, hoveredCategoryId, openCategory]
  )

  const scheduleClose = useCallback(() => {
    clearCloseTimer()
    closeTimerRef.current = window.setTimeout(() => {
      setHoveredCategoryId(null)
    }, CLOSE_DELAY_MS)
  }, [clearCloseTimer])

  const closeCategory = useCallback(() => {
    clearCloseTimer()
    setHoveredCategoryId(null)
  }, [clearCloseTimer])

  const centerCategoryInSidebar = useCallback(
    (categoryId: string) => {
      clearCenterRetryTimer()
      onCategoryActivate?.(categoryId)
      setOpen(true)

      const behavior: ScrollBehavior = shouldReduceMotion ? 'auto' : 'smooth'
      const centerCategory = () => {
        const viewport = navViewportRef.current

        if (viewport) {
          centerSidebarNavGroup(viewport, categoryId, behavior)
        }
      }

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          centerCategory()
        })
      })

      if (state !== 'expanded') {
        centerRetryTimerRef.current = window.setTimeout(() => {
          centerRetryTimerRef.current = null
          centerCategory()
        }, 220)
      }
    },
    [
      clearCenterRetryTimer,
      navViewportRef,
      onCategoryActivate,
      setOpen,
      shouldReduceMotion,
      state,
    ]
  )

  const activateCategoryFromPointer = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, categoryId: string) => {
      if (event.button !== 0) {
        return
      }

      lastPointerActivationRef.current = {
        categoryId,
        activatedAt: window.performance.now(),
      }
      centerCategoryInSidebar(categoryId)
    },
    [centerCategoryInSidebar]
  )

  const activateCategoryFromClick = useCallback(
    (categoryId: string) => {
      const lastPointerActivation = lastPointerActivationRef.current
      const activationAlreadyHandledByPointer =
        lastPointerActivation?.categoryId === categoryId &&
        window.performance.now() - lastPointerActivation.activatedAt < 500

      if (activationAlreadyHandledByPointer) {
        return
      }

      centerCategoryInSidebar(categoryId)
    },
    [centerCategoryInSidebar]
  )

  const updateFloatingPosition = useCallback(() => {
    const floatingBounds = resolveFloatingCardViewportBounds()
    const floatingHeight = resolveFloatingCardMeasuredHeightForCentering({
      measuredHeight: floatingRef.current?.offsetHeight,
      maxHeight: floatingBounds.maxHeight,
    })
    const scrubberColumnRight =
      scrubberColumnRef.current?.getBoundingClientRect().right ?? 0

    const nextPosition = {
      top: resolveCenteredFloatingCardTop({
        floatingHeight,
        viewportHeight: window.innerHeight,
      }),
      left: resolveAdjacentFloatingCardLeft({
        floatingWidth: floatingBounds.width,
        viewportWidth: window.innerWidth,
        scrubberColumnRight,
      }),
    }

    setFloatingPosition((currentPosition) =>
      currentPosition.top === nextPosition.top &&
      currentPosition.left === nextPosition.left
        ? currentPosition
        : nextPosition
    )
  }, [])

  useLayoutEffect(() => {
    if (!hoveredCategoryId) {
      return
    }

    const frameId = window.requestAnimationFrame(updateFloatingPosition)

    if (typeof ResizeObserver === 'undefined' || floatingRef.current === null) {
      return () => {
        window.cancelAnimationFrame(frameId)
      }
    }

    const resizeObserver = new ResizeObserver(() => {
      updateFloatingPosition()
    })
    resizeObserver.observe(floatingRef.current)

    return () => {
      window.cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
    }
  }, [hoveredCategoryId, updateFloatingPosition])

  useEffect(() => {
    if (!hoveredCategoryId) {
      return
    }

    window.addEventListener('resize', updateFloatingPosition)

    return () => {
      window.removeEventListener('resize', updateFloatingPosition)
    }
  }, [hoveredCategoryId, updateFloatingPosition])

  useEffect(
    () => () => {
      clearCloseTimer()
      clearCenterRetryTimer()
    },
    [clearCenterRetryTimer, clearCloseTimer]
  )

  if (isMobile || categoryPreviews.length === 0) {
    return null
  }

  return (
    <>
      <aside
        ref={scrubberColumnRef}
        data-sidebar-scrubber-column
        className='sticky top-0 z-30 hidden h-svh w-(--sidebar-gutter-width) shrink-0 items-center justify-center md:flex'
      >
        <nav
          aria-label='侧边栏顶级分类快速索引'
          className='pointer-events-auto flex flex-col items-center gap-2 rounded-full px-1 py-2.5'
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleClose}
          onPointerEnter={openCategoryFromPointer}
          onPointerMove={openCategoryFromPointer}
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
                className='group/category-scrubber flex h-6 w-14 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                onPointerDown={(event) =>
                  activateCategoryFromPointer(event, category.id)
                }
                onClick={() => activateCategoryFromClick(category.id)}
                onFocus={() => openCategory(category.id)}
                onMouseEnter={() => openCategory(category.id)}
              >
                <motion.span
                  aria-hidden='true'
                  initial={false}
                  animate={{
                    width: isHovered
                      ? 42
                      : isCentered
                        ? 32
                        : isCurrentRoute
                          ? 26
                          : 20,
                    opacity:
                      isHovered || isCentered || isCurrentRoute ? 1 : 0.46,
                  }}
                  transition={
                    shouldReduceMotion ? { duration: 0 } : SCRUBBER_ITEM_SPRING
                  }
                  className={cn(
                    'h-[3px] rounded-full bg-muted-foreground/70 shadow-none transition-colors',
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
      </aside>
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
          key='sidebar-category-floating-card'
          role='dialog'
          aria-label={`${category.title}快捷导航`}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className='fixed z-50 flex max-h-[min(80vh,48rem)] w-[min(35rem,calc(100vw-3rem))] flex-col overflow-hidden rounded-2xl border border-border/70 bg-popover text-popover-foreground shadow-2xl shadow-black/15 backdrop-blur-xl'
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
                <p className='truncate text-[13px] leading-tight font-black tracking-tight text-foreground'>
                  {category.title}
                </p>
                <p className='mt-1 text-[10px] leading-none font-semibold tracking-wide text-muted-foreground'>
                  {category.linkCount} 个可直达入口
                </p>
              </div>
              <span className='shrink-0 rounded-full bg-orange-500/10 px-2 py-1 text-[10px] leading-none font-black text-orange-600 dark:text-orange-300'>
                快速定位
              </span>
            </div>
          </div>
          <div className='no-scrollbar min-h-0 overflow-y-auto px-3 py-3'>
            <div className='space-y-2.5'>
              {category.directLinks.length > 0 ? (
                <SidebarCategoryDomainList
                  links={category.directLinks}
                  onNavigate={onNavigate}
                />
              ) : null}
              {category.sections.map((section) => (
                <section key={section.id} className='space-y-1.5'>
                  <div className='px-1 text-[10px] leading-none font-black tracking-widest text-muted-foreground uppercase'>
                    {section.title}
                  </div>
                  <SidebarCategoryDomainList
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
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  )
}

function SidebarCategoryDomainList({
  links,
  onNavigate,
}: {
  links: SidebarCategoryDomainLink[]
  onNavigate: () => void
}) {
  return (
    <div className='grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-2'>
      {links.map((link) => {
        const Icon = link.icon
        const hasTabs = link.tabs.length > 0

        return (
          <div
            key={link.id}
            className='rounded-2xl border border-border/60 bg-background/45 p-1.5'
          >
            <div className='flex min-h-8 min-w-0 items-center gap-2 rounded-xl px-2 py-1.5 text-[12px] leading-tight font-black tracking-tight text-popover-foreground/82'>
              {Icon ? <Icon className='size-3.5 shrink-0 opacity-70' /> : null}
              <span className='min-w-0 flex-1 truncate'>{link.title}</span>
              <span className='shrink-0 rounded-full bg-orange-500/10 px-1.5 py-0.5 text-[9px] leading-none font-black text-orange-600 dark:text-orange-300'>
                {link.tabs.length} TAB
              </span>
            </div>
            {hasTabs ? (
              <div className='mt-1 grid grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))] gap-1'>
                {link.tabs.map((tab) => (
                  <SidebarCategoryTabChip
                    key={tab.id}
                    tab={tab}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function SidebarCategoryTabChip({
  tab,
  onNavigate,
}: {
  tab: SidebarCategoryTabLink
  onNavigate: () => void
}) {
  return (
    <Link
      to={tab.url}
      className='min-w-0 truncate rounded-xl border border-transparent bg-muted/40 px-2 py-1.5 text-[11px] leading-tight font-black tracking-tight text-muted-foreground transition-colors hover:border-orange-500/25 hover:bg-orange-500/10 hover:text-popover-foreground focus-visible:ring-2 focus-visible:ring-primary/55 focus-visible:outline-none'
      onClick={onNavigate}
    >
      {tab.title}
    </Link>
  )
}
