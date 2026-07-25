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
