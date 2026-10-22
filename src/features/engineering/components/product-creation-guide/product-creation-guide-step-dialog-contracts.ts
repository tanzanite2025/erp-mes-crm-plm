import { type ReactNode } from 'react'
import type { ProductCreationOperationGuideStep } from '../../data/build-product-creation-operation-guide-steps'
import type {
  ProductCreationGuideProgress,
  ProductCreationGuideStepResult,
} from '../../data/product-creation-operation-guide-progress'

export type ProductCreationGuideOperationDialogProps = {
  step: ProductCreationOperationGuideStep
  progress: ProductCreationGuideProgress
  wizardHeader: ReactNode
  onBusyChange: (busy: boolean) => void
  onClose: () => void
  onCompleted: (result: ProductCreationGuideStepResult) => void
}
