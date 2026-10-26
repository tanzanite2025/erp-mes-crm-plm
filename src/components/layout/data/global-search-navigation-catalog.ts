import { translate, type TranslationKey } from '@/locales'
import { Layout } from 'lucide-react'
import { getAuthenticatedRoutePaths } from '@/features/authz/data/authenticated-route-paths'
import { getMaterialRouteTabs } from '@/features/material-archive/tab-config'
import { resolveRecentVisitCanonicalLabelKey } from '@/features/recent-visits/recent-visit-labels'
import { resolveSidebarNodeTabPreviews } from '../sidebar-tab-preview-registry'
import type { NavNode } from '../types'
import type { SearchItem } from './search-data'
import { getSidebarData } from './sidebar-data'

type NavigationTranslator = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

function collectGlobalSearchNavigationItems(t: NavigationTranslator) {
  const itemsByHref = new Map<string, SearchItem>()

  function registerGlobalSearchNavigationItem(
    href: string,
    title: string,
    parentTitles: string[],
    icon: SearchItem['icon'] = Layout
  ) {
    const existing = itemsByHref.get(href)
    itemsByHref.set(href, {
      id: `navigation-${href}`,
      href,
      title,
      category: 'modules',
      icon,
      parentTitle: parentTitles.join(' / '),
      keywords: [...(existing?.keywords ?? []), title, ...parentTitles],
    })
  }

  function collectSidebarNodeSearchItems(
    nodes: NavNode[],
    parentTitles: string[]
  ) {
    for (const node of nodes) {
      if (node.url) {
        registerGlobalSearchNavigationItem(
          node.url,
          node.title,
          parentTitles,
          node.icon
        )
        const tabs =
          node.id === 'material-archive'
            ? getMaterialRouteTabs('zh-CN', t)
            : resolveSidebarNodeTabPreviews(node, t)
        for (const tab of tabs) {
          const materialLabelKey =
            node.id === 'material-archive'
              ? resolveRecentVisitCanonicalLabelKey(tab.href)
              : undefined
          registerGlobalSearchNavigationItem(
            tab.href,
            materialLabelKey ? t(materialLabelKey) : tab.label,
            [...parentTitles, node.title],
            node.icon
          )
        }
      }
      if (node.children) {
        collectSidebarNodeSearchItems(node.children, [
          ...parentTitles,
          node.title,
        ])
      }
    }
  }

  for (const group of getSidebarData(t).navGroups) {
    collectSidebarNodeSearchItems(group.children, [group.title])
  }

  // Include named nested pages as well as sidebar domains and their tabs.
  // Parameterized detail routes require a record and cannot be navigation links.
  for (const href of getAuthenticatedRoutePaths()) {
    if (itemsByHref.has(href) || href.includes(':')) continue
    const labelKey = resolveRecentVisitCanonicalLabelKey(href)
    if (!labelKey) continue
    const parentPath = href.slice(0, href.lastIndexOf('/'))
    const parentKey = resolveRecentVisitCanonicalLabelKey(parentPath)
    registerGlobalSearchNavigationItem(
      href,
      t(labelKey),
      parentKey ? [t(parentKey)] : []
    )
  }

  return itemsByHref
}

export function buildGlobalSearchNavigationItems(
  t: NavigationTranslator
): SearchItem[] {
  const localizedItems = collectGlobalSearchNavigationItems(t)
  for (const locale of ['zh-CN', 'en-US'] as const) {
    const translatedItems = collectGlobalSearchNavigationItems((key, params) =>
      translate(locale, key, params)
    )
    for (const [href, translatedItem] of translatedItems) {
      const item = localizedItems.get(href)
      if (item) item.keywords?.push(...(translatedItem.keywords ?? []))
    }
  }
  return [...localizedItems.values()]
}
