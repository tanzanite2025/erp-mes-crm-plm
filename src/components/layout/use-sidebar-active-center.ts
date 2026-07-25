import { useEffect, useRef, type RefObject } from 'react'

const ACTIVE_PATH_SELECTOR = '[data-sidebar-active-path="true"]'
const ACTIVE_FOCUS_SELECTOR = '[data-sidebar-active-focus="true"]'
const SIDEBAR_NAV_GROUP_SELECTOR = '[data-sidebar-nav-group]'

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

export function centerSidebarElement(
  viewport: HTMLDivElement,
  element: HTMLElement,
  behavior: ScrollBehavior
): boolean {
  const viewportRect = viewport.getBoundingClientRect()
  const elementRect = element.getBoundingClientRect()
  const top = calculateSidebarCenterScrollTop({
    viewportTop: viewportRect.top,
    viewportHeight: viewport.clientHeight,
    currentScrollTop: viewport.scrollTop,
    scrollHeight: viewport.scrollHeight,
    activeTop: elementRect.top,
    activeBottom: elementRect.bottom,
  })

  viewport.scrollTo({ top, behavior })
  return true
}

export function getSidebarNavGroupElement(
  viewport: HTMLDivElement,
  groupId: string
): HTMLElement | null {
  const groupElements = viewport.querySelectorAll<HTMLElement>(
    SIDEBAR_NAV_GROUP_SELECTOR
  )

  return (
    Array.from(groupElements).find(
      (element) => element.dataset.sidebarNavGroup === groupId
    ) ?? null
  )
}

export function centerSidebarNavGroup(
  viewport: HTMLDivElement,
  groupId: string,
  behavior: ScrollBehavior
): boolean {
  const groupElement = getSidebarNavGroupElement(viewport, groupId)

  return groupElement
    ? centerSidebarElement(viewport, groupElement, behavior)
    : false
}

export function resolveCenteredSidebarNavGroupId(
  viewport: HTMLDivElement,
  groupIds: string[]
): string | null {
  const viewportRect = viewport.getBoundingClientRect()
  const viewportCenter = viewportRect.top + viewport.clientHeight / 2
  let nearestGroupId: string | null = null
  let nearestDistance = Number.POSITIVE_INFINITY

  groupIds.forEach((groupId) => {
    const groupElement = getSidebarNavGroupElement(viewport, groupId)

    if (!groupElement) {
      return
    }

    const groupRect = groupElement.getBoundingClientRect()
    const groupCenter = groupRect.top + groupRect.height / 2
    const distance = Math.abs(groupCenter - viewportCenter)

    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestGroupId = groupId
    }
  })

  return nearestGroupId
}

export function centerActiveSidebarPath(
  viewport: HTMLDivElement,
  behavior: ScrollBehavior
): boolean {
  const explicitFocus = viewport.querySelector<HTMLElement>(
    ACTIVE_FOCUS_SELECTOR
  )
  const activeElements =
    viewport.querySelectorAll<HTMLElement>(ACTIVE_PATH_SELECTOR)
  const focusElement =
    explicitFocus ?? activeElements.item(activeElements.length - 1)

  if (!focusElement) {
    return false
  }

  return centerSidebarElement(viewport, focusElement, behavior)
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
        viewport.scrollTo({ top: 0, behavior: 'auto' })
        return
      }

      const scheduleCenter = () => {
        cancelCenterFrames()

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
        if (viewport.firstElementChild instanceof HTMLElement) {
          resizeObserver.observe(viewport.firstElementChild)
        }
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
