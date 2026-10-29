import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

export const PRODUCTION_MATERIAL_CREATION_OPERATION_GUIDE_PATH =
  '/materials/production-material-creation-guide'

export function getProductionMaterialCreationOperationGuideTabs(
  translate: (key: TranslationKey) => string
): TabItem[] {
  return [
    {
      key: 'production-material-creation-guide',
      label: translate('materialArchive.operationGuide.title'),
      href: PRODUCTION_MATERIAL_CREATION_OPERATION_GUIDE_PATH,
    },
  ]
}
