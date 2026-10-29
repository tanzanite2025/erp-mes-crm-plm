import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

export function getPartRequirementsOperationGuideTabs(
  translate: (key: TranslationKey) => string
): TabItem[] {
  return [
    {
      key: 'requirements-guide',
      label: translate('mrp.operationGuide.title'),
      href: '/mrp/requirements-guide',
    },
  ]
}
