import type { TranslationKey } from '@/locales'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'
import type { AuthSessionUserLike } from '@/features/authz/utils/auth-session'
import { engineeringPermissionTabs } from '@/features/engineering/tab-config'
import { getProductStructureTabs } from '@/features/product-structure/tab-config'
import {
  productCreationOperationGuideStepDefinitions,
  productCreationOperationGuideStepKeys,
  type ProductCreationOperationGuideStepKey,
  type ProductCreationOperationGuideStepStage,
} from './product-creation-operation-guide-step-definitions'

export type ProductCreationOperationGuideStep = {
  key: ProductCreationOperationGuideStepKey
  number: number
  title: string
  action: string
  fields: string
  result: string
  href: string
  pageLabel: string
  stage: ProductCreationOperationGuideStepStage
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

  return productCreationOperationGuideStepKeys.flatMap((stepKey, index) => {
    const definition = productCreationOperationGuideStepDefinitions[stepKey]
    const targetTab = productModuleTabs.find(
      (tab) => tab.key === definition.tabKey
    )
    if (!targetTab) return []

    return [
      {
        key: stepKey,
        number: index + 1,
        title: t(`engineering.productCreationGuide.steps.${stepKey}.title`),
        action: t(`engineering.productCreationGuide.steps.${stepKey}.action`),
        fields: t(`engineering.productCreationGuide.steps.${stepKey}.fields`),
        result: t(`engineering.productCreationGuide.steps.${stepKey}.result`),
        href: targetTab.href,
        pageLabel: targetTab.label,
        stage: definition.stage,
        canAccess: matchesPathPermissionProjection(user, targetTab.href),
      },
    ]
  })
}
