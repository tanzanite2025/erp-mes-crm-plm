import type { TabItem } from '@/components/module-tabs'
import type { TranslationKey } from '@/locales'

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string

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
  ]
}
