import type { ComponentType } from 'react'
import type { ProductCreationOperationGuideStepKey } from '../../data/product-creation-operation-guide-step-definitions'
import { ProductCreationGuideBaseModelSelectionDialog } from './product-creation-guide-base-model-selection-step-dialog'
import { ProductCreationGuideBomCreationDialog } from './product-creation-guide-bom-followup-step-dialog'
import { ProductCreationGuideProductGenerationDialog } from './product-creation-guide-product-save-step-dialog'
import type { ProductCreationGuideOperationDialogProps } from './product-creation-guide-step-dialog-contracts'
import { ProductCreationGuideTemplateSelectionDialog } from './product-creation-guide-template-selection-step-dialog'

const productCreationGuideStepDialogs = {
  template: ProductCreationGuideTemplateSelectionDialog,
  baseModel: ProductCreationGuideBaseModelSelectionDialog,
  product: ProductCreationGuideProductGenerationDialog,
  bom: ProductCreationGuideBomCreationDialog,
} satisfies Record<
  ProductCreationOperationGuideStepKey,
  ComponentType<ProductCreationGuideOperationDialogProps>
>

export function ProductCreationGuideBusinessOperationDialog(
  props: ProductCreationGuideOperationDialogProps
) {
  const StepDialog = productCreationGuideStepDialogs[props.step.key]
  return <StepDialog {...props} />
}
