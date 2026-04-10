import type { TabItem } from '@/components/module-tabs'
import type { TranslationKey } from '@/locales'

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string

export const basicSettingsTabs: TabItem[] = [
  { key: 'dm-numbering', label: 'DM Numbering', href: '/basic-settings/dm-numbering' },
  { key: 'linear-barcode', label: 'Linear Barcode', href: '/basic-settings/linear-barcode' },
  { key: 'units', label: 'Unit Management', href: '/basic-settings/units' },
  { key: 'sequences', label: 'Business Sequences', href: '/basic-settings/sequences' },
  { key: 'enterprise', label: 'Enterprise Info', href: '/basic-settings/enterprise' },
  { key: 'security', label: 'Security Settings', href: '/basic-settings/security' },
]

export function getBasicSettingsTabs(t: TranslateFn): TabItem[] {
  return [
    { key: 'dm-numbering', label: t('basicSettings.tabs.dmNumbering'), href: '/basic-settings/dm-numbering' },
    { key: 'linear-barcode', label: t('basicSettings.tabs.linearBarcode'), href: '/basic-settings/linear-barcode' },
    { key: 'units', label: t('basicSettings.tabs.units'), href: '/basic-settings/units' },
    { key: 'sequences', label: t('basicSettings.tabs.sequences'), href: '/basic-settings/sequences' },
    { key: 'enterprise', label: t('basicSettings.tabs.enterprise'), href: '/basic-settings/enterprise' },
    { key: 'security', label: t('basicSettings.tabs.security'), href: '/basic-settings/security' },
  ]
}
