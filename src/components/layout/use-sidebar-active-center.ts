import { useEffect, useRef, type RefObject } from 'react'

const ACTIVE_PATH_SELECTOR = '[data-sidebar-active-path="true"]'

type SidebarCenterMetrics = {
  viewportTop: number
  viewportHeight: number
  currentScrollTop: number
  scrollHeight: number
  activeTop: number
  activeBottom: number
}

type UseSidebarActiveCenterOptions = {
  viewportRef: RefObject<HTMLDivElement | null>
  activePathKey?: string
  enabled: boolean
}

export function calculateSidebarCenterScrollTop({
  viewportTop,
  viewportHeight,
  currentScrollTop,
  scrollHeight,
  activeTop,
  activeBottom,
}: SidebarCenterMetrics): number {
  const activeCenterInViewport = (activeTop + activeBottom) / 2
  const activeCenterInContent =
    currentScrollTop + activeCenterInViewport - viewportTop
  const desiredScrollTop = activeCenterInContent - viewportHeight / 2
  const maxScrollTop = Math.max(0, scrollHeight - viewportHeight)

  return Math.min(maxScrollTop, Math.max(0, desiredScrollTop))
}

export function centerActiveSidebarPath(
  viewport: HTMLDivElement,
  behavior: ScrollBehavior
): boolean {
  const activeElements = Array.from(
    viewport.querySelectorAll<HTMLElement>(ACTIVE_PATH_SELECTOR)
  )

  if (activeElements.length === 0) {
    return false
  }

  const viewportRect = viewport.getBoundingClientRect()
  const activeRects = activeElements.map((element) =>
    element.getBoundingClientRect()
  )
  const activeTop = Math.min(...activeRects.map((rect) => rect.top))
  const activeBottom = Math.max(...activeRects.map((rect) => rect.bottom))
  const top = calculateSidebarCenterScrollTop({
    viewportTop: viewportRect.top,
    viewportHeight: viewport.clientHeight,
    currentScrollTop: viewport.scrollTop,
    scrollHeight: viewport.scrollHeight,
    activeTop,
    activeBottom,
  })

  viewport.scrollTo({ top, behavior })
  return true
}

export function useSidebarActiveCenter({
  viewportRef,
  activePathKey,
  enabled,
}: UseSidebarActiveCenterOptions) {
  const hasCentered = useRef(false)

  useEffect(() => {
    if (!enabled) {
      return
    }

    let resolveFrame = 0
    let layoutFrame = 0
    let centerFrame = 0
    let resizeObserver: ResizeObserver | null = null

    const cancelCenterFrames = () => {
      window.cancelAnimationFrame(layoutFrame)
      window.cancelAnimationFrame(centerFrame)
    }

    const initializeViewport = (attempt = 0) => {
      const viewport = viewportRef.current

      if (!viewport) {
        if (attempt < 4) {
          resolveFrame = window.requestAnimationFrame(() =>
            initializeViewport(attempt + 1)
          )
        }
        return
      }

      if (!activePathKey) {
        viewport.style.setProperty('--sidebar-focus-padding', '0px')
        viewport.scrollTo({ top: 0, behavior: 'auto' })
        return
      }

      const scheduleCenter = () => {
        cancelCenterFrames()
        viewport.style.setProperty(
          '--sidebar-focus-padding',
          `${viewport.clientHeight / 2}px`
        )

        layoutFrame = window.requestAnimationFrame(() => {
          centerFrame = window.requestAnimationFrame(() => {
            const prefersReducedMotion =
              window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ??
              false
            const behavior =
              hasCentered.current && !prefersReducedMotion ? 'smooth' : 'auto'

            if (centerActiveSidebarPath(viewport, behavior)) {
              hasCentered.current = true
            }
          })
        })
      }

      scheduleCenter()

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(scheduleCenter)
        resizeObserver.observe(viewport)
      }
    }

    initializeViewport()

    return () => {
      resizeObserver?.disconnect()
      window.cancelAnimationFrame(resolveFrame)
      cancelCenterFrames()
    }
  }, [activePathKey, enabled, viewportRef])
}
