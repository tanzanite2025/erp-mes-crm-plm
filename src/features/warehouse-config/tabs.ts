import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export const warehouseConfigTabs: TabItem[] = [
  {
    key: 'packaging-assembly',
    label: '',
    href: '/warehouse-config/packaging-assembly',
  },
  {
    key: 'category',
    label: '',
    href: '/warehouse-config/category',
  },
  {
    key: 'material-thresholds',
    label: '',
    href: '/warehouse-config/material-thresholds',
  },
]

export function getWarehouseConfigTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'packaging-assembly',
      label: t('warehouseConfig.tabs.packagingAssembly'),
      href: '/warehouse-config/packaging-assembly',
    },
    {
      key: 'category',
      label: t('warehouse.tabs.category'),
      href: '/warehouse-config/category',
    },
    {
      key: 'material-thresholds',
      label: t('warehouseConfig.tabs.materialThresholds'),
      href: '/warehouse-config/material-thresholds',
    },
  ]
}
