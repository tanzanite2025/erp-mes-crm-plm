import type { TabItem } from '@/components/module-tabs'
import type { TranslationKey } from '@/locales'

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string

/** @deprecated Use getTradingTabs(t) instead */
export const tradingTabs: TabItem[] = [
  { key: 'customers', label: '', href: '/trading/customers' },
  { key: 'sales-orders', label: '', href: '/trading/sales-orders' },
  { key: 'logistics', label: '', href: '/trading/logistics' },
]

export function getTradingTabs(t: TranslateFn): TabItem[] {
  return [
    { key: 'customers', label: t('trading.tabs.customers'), href: '/trading/customers' },
    { key: 'sales-orders', label: t('trading.tabs.salesOrders'), href: '/trading/sales-orders' },
    { key: 'logistics', label: t('trading.tabs.logistics'), href: '/trading/logistics' },
    { key: 'orders-analysis', label: t('trading.tabs.ordersAnalysis'), href: '/trading/orders-analysis' },
  ]
}
