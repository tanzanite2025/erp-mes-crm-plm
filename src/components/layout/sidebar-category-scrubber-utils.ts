import type { ElementType } from 'react'
import type { TabItem } from '@/components/module-tabs'
import type { NavGroup, NavNode } from './types'

export type SidebarCategoryTabLink = {
  id: string
  title: string
  url: string
  icon?: ElementType
  badge?: string
}

export type SidebarCategoryDomainLink = SidebarCategoryTabLink & {
  tabs: SidebarCategoryTabLink[]
}

export type SidebarCategorySection = {
  id: string
  title: string
  links: SidebarCategoryDomainLink[]
}

export type SidebarCategoryPreview = {
  id: string
  title: string
  sections: SidebarCategorySection[]
  directLinks: SidebarCategoryDomainLink[]
  linkCount: number
}

function isVisibleNavLink(node: NavNode): node is NavNode & { url: string } {
  return typeof node.url === 'string' && node.url.length > 0
}

function toTabLinks(tabs: TabItem[]): SidebarCategoryTabLink[] {
  return tabs.map((tab) => ({
    id: tab.key,
    title: tab.label,
    url: tab.href,
  }))
}

function createDomainLink(
  node: NavNode & { url: string },
  tabs: TabItem[]
): SidebarCategoryDomainLink {
  return {
    id: node.id,
    title: node.title,
    url: node.url,
    icon: node.icon,
    badge: node.badge,
    tabs: toTabLinks(tabs),
  }
}

function collectLinks(
  nodes: NavNode[],
  resolveTabs: (node: NavNode) => TabItem[]
): SidebarCategoryDomainLink[] {
  return nodes.flatMap((node) => {
    const currentLink = isVisibleNavLink(node)
      ? [createDomainLink(node, resolveTabs(node))]
      : []

    return node.children?.length
      ? [...currentLink, ...collectLinks(node.children, resolveTabs)]
      : currentLink
  })
}

export function createSidebarCategoryPreviews(
  navGroups: NavGroup[],
  resolveTabs: (node: NavNode) => TabItem[] = () => []
): SidebarCategoryPreview[] {
  return navGroups.map((group) => {
    const sections: SidebarCategorySection[] = []
    const directLinks: SidebarCategoryDomainLink[] = []

    group.children.forEach((node) => {
      if (node.children?.length) {
        const links = collectLinks(node.children, resolveTabs)

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
        directLinks.push(createDomainLink(node, resolveTabs(node)))
      }
    })

    const linkCount =
      countDomainAndTabLinks(directLinks) +
      sections.reduce(
        (total, section) => total + countDomainAndTabLinks(section.links),
        0
      )

    return {
      id: group.id,
      title: group.title,
      sections,
      directLinks,
      linkCount,
    }
  })
}

function countDomainAndTabLinks(links: SidebarCategoryDomainLink[]): number {
  return links.reduce((total, link) => total + Math.max(link.tabs.length, 1), 0)
}
