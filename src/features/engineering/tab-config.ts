import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export const engineeringTabs: TabItem[] = [
  { key: 'products', label: '产品管理', href: '/engineering/products' },
  {
    key: 'product-appearance',
    label: '产品外观',
    href: '/engineering/product-appearance',
  },
  { key: 'templates', label: '产品模板', href: '/engineering/templates' },
]

export function getEngineeringTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'products',
      label: t('engineering.tabs.products'),
      href: '/engineering/products',
    },
    {
      key: 'product-appearance',
      label: t('engineering.tabs.productAppearance'),
      href: '/engineering/product-appearance',
    },
    {
      key: 'templates',
      label: t('engineering.tabs.templates'),
      href: '/engineering/templates',
    },
  ]
}

export function getProductCreationGuideTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'product-creation-guide',
      label: t('engineering.tabs.productCreationGuide'),
      href: '/engineering/product-creation-guide',
    },
  ]
}

export const engineeringPermissionTabs = (t: TranslateFn): TabItem[] => [
  ...getEngineeringTabs(t),
  ...getProductCreationGuideTabs(t),
  {
    key: 'types',
    label: t('engineering.tabs.types'),
    href: '/engineering/types',
  },
]
