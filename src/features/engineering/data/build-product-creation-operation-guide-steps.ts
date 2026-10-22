import type { TranslationKey } from '@/locales'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'
import type { AuthSessionUserLike } from '@/features/authz/utils/auth-session'
import { engineeringPermissionTabs } from '@/features/engineering/tab-config'
import { getProductStructureTabs } from '@/features/product-structure/tab-config'
import type { ProductCreationOperationGuideStepKey } from './product-creation-operation-guide-progress'

const productCreationGuideStepDefinitions = [
  { key: 'template', tabKey: 'templates', stage: 'configuration' },
  { key: 'baseModel', tabKey: 'types', stage: 'configuration' },
  { key: 'product', tabKey: 'products', stage: 'product' },
  { key: 'bom', tabKey: 'bom', stage: 'followup' },
] as const

export type ProductCreationOperationGuideStep = {
  key: ProductCreationOperationGuideStepKey
  number: number
  title: string
  action: string
  fields: string
  result: string
  href: string
  pageLabel: string
  stage: 'configuration' | 'product' | 'followup'
  canAccess: boolean
}

export function buildProductCreationOperationGuideSteps(
  user: AuthSessionUserLike | null | undefined,
  t: (key: TranslationKey) => string
): ProductCreationOperationGuideStep[] {
  const productModuleTabs = [
    ...engineeringPermissionTabs(t),
    ...getProductStructureTabs(t),
  ]

  return productCreationGuideStepDefinitions.flatMap((definition, index) => {
    const targetTab = productModuleTabs.find(
      (tab) => tab.key === definition.tabKey
    )
    if (!targetTab) return []

    return [
      {
        key: definition.key,
        number: index + 1,
        title: t(
          `engineering.productCreationGuide.steps.${definition.key}.title`
        ),
        action: t(
          `engineering.productCreationGuide.steps.${definition.key}.action`
        ),
        fields: t(
          `engineering.productCreationGuide.steps.${definition.key}.fields`
        ),
        result: t(
          `engineering.productCreationGuide.steps.${definition.key}.result`
        ),
        href: targetTab.href,
        pageLabel: targetTab.label,
        stage: definition.stage,
        canAccess: matchesPathPermissionProjection(user, targetTab.href),
      },
    ]
  })
}
