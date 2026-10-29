import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

export function getProductionMaterialIssuanceOperationGuideTabs(
  translate: (key: TranslationKey) => string
): TabItem[] {
  return [
    {
      key: 'production-material-issuance-guide',
      label: translate('mrp.productionMaterialIssuanceGuide.title'),
      href: '/mrp/production-material-issuance-guide',
    },
  ]
}
