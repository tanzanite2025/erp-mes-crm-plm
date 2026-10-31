import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export const PURCHASE_OPERATION_GUIDE_PATH =
  '/purchase/purchase-operation-guide'

export function getPurchaseOperationGuideTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'purchase-operation-guide',
      label: t('purchase.operationGuide.title'),
      href: PURCHASE_OPERATION_GUIDE_PATH,
    },
  ]
}

export function getPurchaseTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'suppliers',
      label: t('purchase.tabs.suppliers'),
      href: '/purchase/suppliers',
    },
    {
      key: 'orders',
      label: t('purchase.tabs.orders'),
      href: '/purchase/orders',
    },
    {
      key: 'logistics',
      label: t('purchase.tabs.logistics'),
      href: '/purchase/logistics',
    },
  ]
}
