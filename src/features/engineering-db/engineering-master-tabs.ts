import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export function getEngineeringMasterTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'weaving-mode',
      label: t('engineering.masterData.tabs.weavingMode'),
      href: '/engineering-db/engineering-master/weaving-mode',
    },
  ]
}
