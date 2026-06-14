import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

type TabTranslator = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export function getCuttingOperationTabs(t: TabTranslator): TabItem[] {
  return [
    {
      key: 'cutting-issuance',
      label: t('cuttingOperations.tabs.cuttingIssuance'),
      href: '/cutting-operations/cutting-issuance',
    },
    {
      key: 'product-binding',
      label: t('cuttingOperations.tabs.productBinding'),
      href: '/cutting-operations/product-binding',
    },
    {
      key: 'size-inventory',
      label: t('cuttingOperations.tabs.sizeInventory'),
      href: '/cutting-operations/size-inventory',
    },
  ]
}
