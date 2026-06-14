import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export function getQualityTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'standards',
      label: t('quality.layout.tabs.standards'),
      href: '/quality/standards',
    },
    {
      key: 'formulas',
      label: t('quality.layout.tabs.formulas'),
      href: '/quality/formulas',
    },
  ]
}
