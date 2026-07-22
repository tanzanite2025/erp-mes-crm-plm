import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export function getLogisticsSettingsTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'platforms',
      label: t('logisticsConfig.tabs.platforms'),
      href: '/logistics-settings/platforms',
    },
  ]
}
