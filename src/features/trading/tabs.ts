import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export const SALES_OPERATION_GUIDE_PATH = '/trading/sales-operation-guide'

export function getSalesOperationGuideTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'sales-operation-guide',
      label: t('trading.operationGuide.title'),
      href: SALES_OPERATION_GUIDE_PATH,
    },
  ]
}

/** @deprecated Use getTradingTabs(t) instead */
export const tradingTabs: TabItem[] = [
  { key: 'customers', label: '', href: '/trading/customers' },
  { key: 'sales-orders', label: '', href: '/trading/sales-orders' },
  { key: 'sales-returns', label: '', href: '/trading/sales-returns' },
  { key: 'sales-exchanges', label: '', href: '/trading/sales-exchanges' },
]

export function getTradingTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'customers',
      label: t('trading.tabs.customers'),
      href: '/trading/customers',
    },
    {
      key: 'sales-orders',
      label: t('trading.tabs.salesOrders'),
      href: '/trading/sales-orders',
    },
    {
      key: 'sales-returns',
      label: t('trading.tabs.salesReturns'),
      href: '/trading/sales-returns',
    },
    {
      key: 'sales-exchanges',
      label: t('trading.tabs.salesExchanges'),
      href: '/trading/sales-exchanges',
    },
  ]
}
