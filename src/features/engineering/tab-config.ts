import type { TabItem } from '@/components/module-tabs'
import type { TranslationKey } from '@/locales'

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string

export const engineeringTabs: TabItem[] = [
  { key: 'products', label: '产品管理', href: '/engineering/products' },
  { key: 'bom', label: 'BOM 配方', href: '/engineering/bom' },
  { key: 'changes', label: 'ECO / ECN', href: '/engineering/changes' },
  { key: 'templates', label: '产品模板', href: '/engineering/templates' },
]

export function getEngineeringTabs(t: TranslateFn): TabItem[] {
  return [
    { key: 'products', label: t('engineering.tabs.products'), href: '/engineering/products' },
    { key: 'bom', label: t('engineering.tabs.bom'), href: '/engineering/bom' },
    { key: 'changes', label: t('engineering.tabs.changes'), href: '/engineering/changes' },
    { key: 'templates', label: t('engineering.tabs.templates'), href: '/engineering/templates' },
  ]
}

export const engineeringPermissionTabs = (t: TranslateFn): TabItem[] => [
  ...getEngineeringTabs(t),
  { key: 'types', label: t('engineering.tabs.types'), href: '/engineering/types' },
]
