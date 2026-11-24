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
      key: 'defect-configuration',
      label: t('quality.defectConfiguration.title'),
      href: '/quality/defect-configuration',
    },
  ]
}

export function getQualityStandardCreationGuideTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'standard-creation-guide',
      label: t('quality.standardCreationGuide.title'),
      href: '/quality/standard-creation-guide',
    },
  ]
}
