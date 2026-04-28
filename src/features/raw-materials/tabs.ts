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
    {
      key: 'binding-qr',
      label: t('rawMaterials.tabs.bindingQr'),
      href: '/raw-materials/binding-qr',
    },
    {
      key: 'batch-engine',
      label: t('rawMaterials.tabs.batchEngine'),
      href: '/raw-materials/batch-engine',
    },
    {
      key: 'cut-size-library',
      label: t('rawMaterials.tabs.cutSizeLibrary'),
      href: '/raw-materials/cut-size-library',
    },
    {
      key: 'cutting-plan',
      label: t('rawMaterials.tabs.cuttingPlan'),
      href: '/raw-materials/cutting-plan',
    },
  ]
}
