import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

export function getBOMCreationOperationGuideTabs(
  translate: (key: TranslationKey) => string
): TabItem[] {
  return [
    {
      key: 'bom-creation-guide',
      label: translate('engineering.tabs.bomCreationGuide'),
      href: '/engineering/bom-creation-guide',
    },
  ]
}
