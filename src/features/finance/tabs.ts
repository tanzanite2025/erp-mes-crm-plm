import type { TabItem } from '@/components/module-tabs'
import { generatePermissionId } from '@/features/authz/data/permission-catalog'
import type { TranslationKey } from '@/locales'

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string

export function getFinanceTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'payment-methods',
      label: t('finance.layout.tabs.paymentMethods'),
      href: '/finance-management/payment-methods',
      permissionId: generatePermissionId('tab', '/finance-management/payment-methods'),
    },
    {
      key: 'payment-terms',
      label: t('finance.layout.tabs.paymentTerms'),
      href: '/finance-management/payment-terms',
      permissionId: generatePermissionId('tab', '/finance-management/payment-terms'),
    },
    {
      key: 'currency',
      label: t('finance.layout.tabs.currencyRates'),
      href: '/finance-management/currency-rates',
      permissionId: generatePermissionId('tab', '/finance-management/currency-rates'),
    },
    {
      key: 'taxation',
      label: t('finance.layout.tabs.taxation'),
      href: '/finance-management/taxation',
      permissionId: generatePermissionId('tab', '/finance-management/taxation'),
    },
  ]
}
