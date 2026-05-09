import type { TabItem } from '@/components/module-tabs'
import type { TranslationKey } from '@/locales'

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string

export function getProductStructureTabs(t: TranslateFn): TabItem[] {
  return [
    { key: 'bom', label: t('engineering.tabs.bom'), href: '/product-structure/bom' },
    { key: 'section-config', label: t('engineering.tabs.sectionConfig'), href: '/product-structure/section-config' },
  ]
}
