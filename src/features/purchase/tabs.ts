import type { TabItem } from '@/components/module-tabs'
import type { TranslationKey } from '@/locales'

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string

export function getPurchaseTabs(t: TranslateFn): TabItem[] {
  return [
    { key: 'suppliers', label: t('purchase.tabs.suppliers'), href: '/purchase/suppliers' },
    { key: 'orders', label: t('purchase.tabs.orders'), href: '/purchase/orders' },
    { key: 'payables', label: t('purchase.tabs.payables'), href: '/purchase/payables' },
    { key: 'logistics', label: t('purchase.tabs.logistics'), href: '/purchase/logistics' },
  ]
}
