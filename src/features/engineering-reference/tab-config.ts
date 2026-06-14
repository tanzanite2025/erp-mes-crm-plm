import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export function getEngineeringReferenceTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'spoke-length',
      label: t('engineering.spokeLength.overview.title'),
      href: '/engineering-reference/spoke-length',
    },
    {
      key: 'hubs',
      label: t('engineering.hubs.overview.title'),
      href: '/engineering-reference/hubs',
    },
    {
      key: 'nipples',
      label: t('engineering.nipples.overview.title'),
      href: '/engineering-reference/nipples',
    },
  ]
}
