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
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { useSidebar } from '@/components/ui/sidebar'
import { getProjectedTabsFromPermissionSnapshot } from '@/features/authz/guards/route-access'
import {
  createSidebarCategoryPreviews,
  type SidebarCategoryDomainLink,
  type SidebarCategoryTabLink,
  type SidebarCategoryPreview,
} from './sidebar-category-scrubber-utils'
import { resolveSidebarNodeTabPreviews } from './sidebar-tab-preview-registry'
import type { NavGroup } from './types'

type SidebarCategoryScrubberProps = {
  navGroups: NavGroup[]
  navViewportRef: RefObject<HTMLDivElement | null>
  pinnedCategoryId?: string | null
  onPinnedCategoryChange?: (categoryId: string | null) => void
}

const FLOATING_CARD_WIDTH_PX = 560
const FLOATING_CARD_MAX_HEIGHT_PX = 768
const FLOATING_CARD_MIN_WIDTH_PX = 360
const FLOATING_CARD_VIEWPORT_GAP_PX = 48
const FLOATING_CARD_VIEWPORT_HEIGHT_RATIO = 0.8
const FLOATING_CARD_EDGE_PADDING_PX = 12
const FLOATING_CARD_ESTIMATED_INITIAL_HEIGHT_PX = 360

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
  anchorRight = 0,
}: {
  floatingWidth: number
  viewportWidth: number
  anchorRight?: number
}) {
  const leftBoundary = Math.max(
    FLOATING_CARD_EDGE_PADDING_PX,
    anchorRight + FLOATING_CARD_EDGE_PADDING_PX
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

export function SidebarCategoryScrubber({
  navGroups,
  navViewportRef,
  pinnedCategoryId,
  onPinnedCategoryChange,
}: SidebarCategoryScrubberProps) {
  const { isMobile } = useSidebar()
  const { t } = useLanguage()
  const user = useAuthStore((store) => store.user)
  const isIdentitySynced = useAuthStore((store) => store.isIdentitySynced)
  const floatingRef = useRef<HTMLDivElement>(null)
  const [uncontrolledPinnedCategoryId, setUncontrolledPinnedCategoryId] =
    useState<string | null>(null)
  const [floatingPosition, setFloatingPosition] = useState({
    top: 0,
    left: 0,
  })
  const isPinnedCategoryControlled = pinnedCategoryId !== undefined
  const activePinnedCategoryId = isPinnedCategoryControlled
    ? pinnedCategoryId
    : uncontrolledPinnedCategoryId

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
  const activePreviewCategoryId = activePinnedCategoryId
  const activePreviewCategory = useMemo(
    () =>
      categoryPreviews.find(
        (category) => category.id === activePreviewCategoryId
      ) ?? null,
    [activePreviewCategoryId, categoryPreviews]
  )

  const setPinnedCategory = useCallback(
    (categoryId: string | null) => {
      if (isPinnedCategoryControlled) {
        onPinnedCategoryChange?.(categoryId)
        return
      }

      setUncontrolledPinnedCategoryId(categoryId)
    },
    [isPinnedCategoryControlled, onPinnedCategoryChange]
  )

  const closeCategory = useCallback(() => {
    setPinnedCategory(null)
  }, [setPinnedCategory])

  const updateFloatingPosition = useCallback(() => {
    const floatingBounds = resolveFloatingCardViewportBounds()
    const floatingHeight = resolveFloatingCardMeasuredHeightForCentering({
      measuredHeight: floatingRef.current?.offsetHeight,
      maxHeight: floatingBounds.maxHeight,
    })
    const anchorRight =
      navViewportRef.current?.getBoundingClientRect().right ?? 0

    const nextPosition = {
      top: resolveCenteredFloatingCardTop({
        floatingHeight,
        viewportHeight: window.innerHeight,
      }),
      left: resolveAdjacentFloatingCardLeft({
        floatingWidth: floatingBounds.width,
        viewportWidth: window.innerWidth,
        anchorRight,
      }),
    }

    setFloatingPosition((currentPosition) =>
      currentPosition.top === nextPosition.top &&
      currentPosition.left === nextPosition.left
        ? currentPosition
        : nextPosition
    )
  }, [navViewportRef])

  useLayoutEffect(() => {
    if (!activePreviewCategoryId) {
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
  }, [activePreviewCategoryId, updateFloatingPosition])

  useEffect(() => {
    if (!activePreviewCategoryId) {
      return
    }

    window.addEventListener('resize', updateFloatingPosition)

    return () => {
      window.removeEventListener('resize', updateFloatingPosition)
    }
  }, [activePreviewCategoryId, updateFloatingPosition])

  if (isMobile || categoryPreviews.length === 0 || !activePreviewCategory) {
    return null
  }

  return (
    <SidebarCategoryFloatingCard
      category={activePreviewCategory}
      floatingRef={floatingRef}
      pinned={Boolean(activePinnedCategoryId)}
      position={floatingPosition}
      onClose={closeCategory}
      onNavigate={closeCategory}
    />
  )
}

function SidebarCategoryFloatingCard({
  category,
  floatingRef,
  pinned,
  position,
  onClose,
  onNavigate,
}: {
  category: SidebarCategoryPreview | null
  floatingRef: RefObject<HTMLDivElement | null>
  pinned: boolean
  position: { top: number; left: number }
  onClose: () => void
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
          className={cn(
            'fixed z-50 flex max-h-[min(80vh,48rem)] w-[min(35rem,calc(100vw-3rem))] flex-col overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-2xl backdrop-blur-xl',
            pinned
              ? 'border-sky-500/40 ring-1 shadow-sky-500/10 ring-sky-500/18'
              : 'border-border/70 shadow-black/15'
          )}
          style={{
            top: position.top,
            left: position.left,
          }}
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
              <div className='flex shrink-0 items-center gap-2'>
                <span
                  className={cn(
                    'rounded-full px-2 py-1 text-[10px] leading-none font-black',
                    pinned
                      ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300'
                      : 'bg-orange-500/10 text-orange-600 dark:text-orange-300'
                  )}
                >
                  {pinned ? '已固定' : '快速定位'}
                </span>
                <button
                  type='button'
                  aria-label='关闭快捷导航'
                  className='flex size-6 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/55 focus-visible:outline-none'
                  onClick={onClose}
                >
                  <X className='size-3.5' />
                </button>
              </div>
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
              {hasTabs ? (
                <span className='shrink-0 rounded-full bg-orange-500/10 px-1.5 py-0.5 text-[9px] leading-none font-black text-orange-600 dark:text-orange-300'>
                  {link.tabs.length} TAB
                </span>
              ) : null}
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
