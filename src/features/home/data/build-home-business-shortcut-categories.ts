import type { ElementType } from 'react'
import type { TranslationKey } from '@/locales'
import { createSidebarCategoryPreviews } from '@/components/layout/sidebar-category-scrubber-utils'
import { resolveSidebarNodeTabPreviews } from '@/components/layout/sidebar-tab-preview-registry'
import type { NavGroup } from '@/components/layout/types'
import { getAccessibleNavGroups } from '@/features/authz/guards/navigation-access'
import {
  getProjectedTabsFromPermissionSnapshot,
  matchesPathPermissionProjection,
} from '@/features/authz/guards/route-access'
import type { AuthSessionUserLike } from '@/features/authz/utils/auth-session'

export type HomeBusinessShortcut = {
  id: string
  title: string
  url: string
  domainTitle: string
  description?: string
  icon?: ElementType
}

export type HomeBusinessShortcutCategory = {
  id: string
  title: string
  description: string
  icon?: ElementType
  shortcuts: HomeBusinessShortcut[]
}

const homeBusinessCategoryDescriptionKeys: Record<string, TranslationKey> = {
  'product-management': 'home.categories.product',
  'resource-management': 'home.categories.dashboard',
  'purchase-and-sales': 'home.categories.purchaseAndSales',
  'production-management': 'home.categories.production',
  'raw-materials-center': 'home.categories.rawMaterials',
  'business-analysis-management': 'home.categories.businessAnalysis',
  'engineering-management': 'home.categories.engineering',
  'quality-management': 'home.categories.quality',
  'warehouse-logistics': 'home.categories.warehouseAndLogistics',
  'asset-management': 'home.categories.assets',
  'finance-management': 'home.categories.finance',
  'message-and-approval': 'home.categories.messagesAndApproval',
  'system-management-root': 'home.categories.system',
}

// Promote the product and BOM starting points; URLs still come from module tabs.
const productStartingPointUrls = [
  '/engineering/product-creation-guide',
  '/engineering/bom-creation-guide',
  '/engineering/products',
  '/product-structure/bom',
  '/engineering/templates',
]

const homeBusinessShortcutDescriptionKeys: Record<string, TranslationKey> = {
  '/engineering/product-creation-guide':
    'home.productCreationGuideShortcutDescription',
  '/engineering/bom-creation-guide': 'home.bomCreationGuideShortcutDescription',
}

export function buildHomeBusinessShortcutCategories(
  user: AuthSessionUserLike | null | undefined,
  navGroups: NavGroup[],
  t: (key: TranslationKey) => string
): HomeBusinessShortcutCategory[] {
  const accessibleGroups = getAccessibleNavGroups(user, navGroups).filter(
    (group) => group.id !== 'home'
  )
  const categoryPreviews = createSidebarCategoryPreviews(
    accessibleGroups,
    (node) =>
      getProjectedTabsFromPermissionSnapshot(
        user,
        resolveSidebarNodeTabPreviews(node, t)
      )
  )

  return categoryPreviews
    .map((category) => {
      const shortcutsByUrl = new Map<string, HomeBusinessShortcut>()
      const domainLinks = [
        ...category.directLinks,
        ...category.sections.flatMap((section) => section.links),
      ]

      for (const domain of domainLinks) {
        for (const entry of domain.tabs.length ? domain.tabs : [domain]) {
          if (
            !shortcutsByUrl.has(entry.url) &&
            matchesPathPermissionProjection(user, entry.url)
          ) {
            const shortcutDescriptionKey =
              homeBusinessShortcutDescriptionKeys[entry.url]
            shortcutsByUrl.set(entry.url, {
              id: `${domain.id}-${entry.id}`,
              title: entry.title,
              url: entry.url,
              domainTitle: domain.title,
              description: shortcutDescriptionKey
                ? t(shortcutDescriptionKey)
                : undefined,
              icon: domain.icon,
            })
          }
        }
      }

      const shortcuts = [...shortcutsByUrl.values()]
      if (category.id === 'product-management') {
        shortcuts.sort((left, right) => {
          const leftPriority = productStartingPointUrls.indexOf(left.url)
          const rightPriority = productStartingPointUrls.indexOf(right.url)
          return (
            (leftPriority < 0
              ? productStartingPointUrls.length
              : leftPriority) -
            (rightPriority < 0
              ? productStartingPointUrls.length
              : rightPriority)
          )
        })
      }

      const descriptionKey = homeBusinessCategoryDescriptionKeys[category.id]
      return {
        id: category.id,
        title: category.title,
        description: descriptionKey ? t(descriptionKey) : '',
        icon: accessibleGroups.find((group) => group.id === category.id)?.icon,
        shortcuts,
      }
    })
    .filter((category) => category.shortcuts.length > 0)
    .sort(
      (left, right) =>
        Number(right.id === 'product-management') -
        Number(left.id === 'product-management')
    )
}
