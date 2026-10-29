import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export function getMrpTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'requirements',
      label: t('mrp.tabs.requirements'),
      href: '/mrp/requirements',
    },
    {
      key: 'production-material-issuance',
      label: t('mrp.productionMaterialIssuance.title'),
      href: '/mrp/production-material-issuance',
    },
  ]
}
