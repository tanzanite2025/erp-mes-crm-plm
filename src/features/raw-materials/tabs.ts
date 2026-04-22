import type { TabItem } from '@/components/module-tabs'
import type { TranslationKey } from '@/locales'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export function getRawMaterialsTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'catalog',
      label: t('rawMaterials.tabs.catalog'),
      href: '/raw-materials/catalog',
    },
  ]
}
