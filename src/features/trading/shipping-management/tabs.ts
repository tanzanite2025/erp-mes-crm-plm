import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export function getShippingManagementTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'vehicle-match',
      label: t('trading.shippingManagement.tabs.vehicleMatch'),
      href: '/shipping-management/vehicle-match',
    },
    {
      key: 'vehicle-contacts',
      label: t('trading.shippingManagement.tabs.vehicleContacts'),
      href: '/shipping-management/vehicle-contacts',
    },
    {
      key: 'logistics',
      label: t('trading.shippingManagement.tabs.logistics'),
      href: '/shipping-management/logistics',
    },
  ]
}
