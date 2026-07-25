import type { ElementType } from 'react'
import type { NavGroup, NavNode } from './types'

export type SidebarCategoryLink = {
  id: string
  title: string
  url: string
  icon?: ElementType
  badge?: string
}

export type SidebarCategorySection = {
  id: string
  title: string
  links: SidebarCategoryLink[]
}

export type SidebarCategoryPreview = {
  id: string
  title: string
  sections: SidebarCategorySection[]
  directLinks: SidebarCategoryLink[]
  linkCount: number
}

export type FloatingPosition = {
  top: number
  left: number
}

export type SidebarScrubberPointerTargetRect = {
  id: string
  top: number
  bottom: number
}

const VIEWPORT_PADDING = 12
const FLOATING_GAP = 12

function isVisibleNavLink(node: NavNode): node is NavNode & { url: string } {
  return typeof node.url === 'string' && node.url.length > 0
}

function collectLinks(nodes: NavNode[]): SidebarCategoryLink[] {
  return nodes.flatMap((node) => {
    const currentLink = isVisibleNavLink(node)
      ? [
          {
            id: node.id,
            title: node.title,
            url: node.url,
            icon: node.icon,
            badge: node.badge,
          },
        ]
      : []

    return node.children?.length
      ? [...currentLink, ...collectLinks(node.children)]
      : currentLink
  })
}

export function createSidebarCategoryPreviews(
  navGroups: NavGroup[]
): SidebarCategoryPreview[] {
  return navGroups.map((group) => {
    const sections: SidebarCategorySection[] = []
    const directLinks: SidebarCategoryLink[] = []

    group.children.forEach((node) => {
      if (node.children?.length) {
        const links = collectLinks(node.children)

        if (links.length > 0) {
          sections.push({
            id: node.id,
            title: node.title,
            links,
          })
        }

        return
      }

      if (isVisibleNavLink(node)) {
        directLinks.push({
          id: node.id,
          title: node.title,
          url: node.url,
          icon: node.icon,
          badge: node.badge,
        })
      }
    })

    const linkCount =
      directLinks.length +
      sections.reduce((total, section) => total + section.links.length, 0)

    return {
      id: group.id,
      title: group.title,
      sections,
      directLinks,
      linkCount,
    }
  })
}

export function calculateFloatingPosition({
  anchorRect,
  floatingWidth,
  floatingHeight,
  viewportWidth,
  viewportHeight,
}: {
  anchorRect: DOMRect
  floatingWidth: number
  floatingHeight: number
  viewportWidth: number
  viewportHeight: number
}): FloatingPosition {
  const preferredTop =
    anchorRect.top + anchorRect.height / 2 - floatingHeight / 2
  const maxTop = Math.max(
    VIEWPORT_PADDING,
    viewportHeight - floatingHeight - VIEWPORT_PADDING
  )
  const preferredLeft = anchorRect.right + FLOATING_GAP
  const maxLeft = Math.max(
    VIEWPORT_PADDING,
    viewportWidth - floatingWidth - VIEWPORT_PADDING
  )

  return {
    top: Math.min(maxTop, Math.max(VIEWPORT_PADDING, preferredTop)),
    left: Math.min(maxLeft, Math.max(VIEWPORT_PADDING, preferredLeft)),
  }
}

export function resolveSidebarScrubberPointerTarget({
  pointerY,
  targets,
}: {
  pointerY: number
  targets: SidebarScrubberPointerTargetRect[]
}): string | null {
  const orderedTargets = targets
    .filter(
      (target) =>
        target.id.length > 0 &&
        Number.isFinite(target.top) &&
        Number.isFinite(target.bottom) &&
        target.bottom >= target.top
    )
    .sort((a, b) => a.top - b.top)

  if (orderedTargets.length === 0) {
    return null
  }

  if (orderedTargets.length === 1) {
    return orderedTargets[0].id
  }

  const centers = orderedTargets.map(
    (target) => target.top + (target.bottom - target.top) / 2
  )

  const targetIndex = orderedTargets.findIndex((_, index) => {
    const zoneTop =
      index === 0
        ? Number.NEGATIVE_INFINITY
        : (centers[index - 1] + centers[index]) / 2
    const zoneBottom =
      index === orderedTargets.length - 1
        ? Number.POSITIVE_INFINITY
        : (centers[index] + centers[index + 1]) / 2

    return pointerY >= zoneTop && pointerY < zoneBottom
  })

  return orderedTargets[targetIndex]?.id ?? null
}
