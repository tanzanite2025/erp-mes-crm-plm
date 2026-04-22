import type { TabItem } from '@/components/module-tabs'
import type { TranslationKey } from '@/locales'

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string

export function getPrintMgmtTabs(t: TranslateFn): TabItem[] {
  return [
    { key: 'records', label: t('printMgmt.tabs.records'), href: '/print-mgmt/records' },
  ]
}
