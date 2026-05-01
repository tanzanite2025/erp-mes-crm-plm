import type { TabItem } from '@/components/module-tabs'
import type { TranslationKey } from '@/locales'

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string

export const warehouseTabs: TabItem[] = [
  { key: 'stock', label: '', href: '/warehouse' },
  { key: 'reports', label: '', href: '/warehouse/reports' },
  { key: 'inbound', label: '', href: '/warehouse/inbound' },
  { key: 'shipment', label: '', href: '/warehouse/shipment' },
  { key: 'stocktake', label: '', href: '/warehouse/stocktake' },
  { key: 'adjustments', label: '', href: '/warehouse/adjustments' },
]

export function getWarehouseTabs(t: TranslateFn): TabItem[] {
  return [
    { key: 'stock', label: t('warehouse.tabs.stock'), href: '/warehouse' },
    { key: 'reports', label: t('warehouse.tabs.reports'), href: '/warehouse/reports' },
    { key: 'inbound', label: t('warehouse.tabs.inbound'), href: '/warehouse/inbound' },
    { key: 'shipment', label: t('warehouse.tabs.shipment'), href: '/warehouse/shipment' },
    { key: 'stocktake', label: t('warehouse.tabs.stocktake'), href: '/warehouse/stocktake' },
    { key: 'adjustments', label: t('warehouse.tabs.adjustments'), href: '/warehouse/adjustments' },
  ]
}
