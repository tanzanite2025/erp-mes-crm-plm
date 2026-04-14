import type { TabItem } from '@/components/module-tabs'
import type { TranslationKey } from '@/locales'

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string

export function getShippingManagementTabs(t: TranslateFn): TabItem[] {
  return [
    { key: 'vehicle-match', label: t('trading.shippingManagement.tabs.vehicleMatch'), href: '/shipping-management/vehicle-match' },
    { key: 'contacts', label: t('trading.shippingManagement.tabs.contacts'), href: '/shipping-management/contacts' },
    { key: 'history', label: t('trading.shippingManagement.tabs.history'), href: '/shipping-management/history' },
  ]
}
