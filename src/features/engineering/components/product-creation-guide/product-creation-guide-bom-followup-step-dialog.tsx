import { useRef } from 'react'
import { toast } from 'sonner'
import { createLogger } from '@/lib/logger'
import { useLanguage } from '@/context/language-provider'
import { BOMActionDialog } from '@/features/product-structure/components/bom-action-dialog'
import { useBOMWriteActions } from '@/features/product-structure/hooks/use-bom-write-actions'
import type { SaveBOMInput } from '@/features/product-structure/mutation-types'
import { useProductCreationGuideSubmissionLock } from '../../hooks/use-product-creation-guide-submission-lock'
import type { ProductCreationGuideOperationDialogProps } from './product-creation-guide-step-dialog-contracts'

const logger = createLogger('ProductCreationGuideBusinessOperationDialog')

export function ProductCreationGuideBomCreationDialog(
  props: ProductCreationGuideOperationDialogProps
) {
  const { t } = useLanguage()
  const hasSavedBomRef = useRef(false)
  const { saveBOM, isSavingBOM } = useBOMWriteActions()
  const productId = props.progress.completedSteps.product?.id
  useProductCreationGuideSubmissionLock(isSavingBOM, props.onBusyChange)
  async function saveProductCreationGuideBom(data: SaveBOMInput) {
    if (!productId || data.productId !== productId) {
      toast.error(t('engineering.productCreationGuide.bomProductMismatch'))
      return null
    }
    try {
      const savedBom = await saveBOM({ data })
      hasSavedBomRef.current = true
      props.onCompleted({
        id: savedBom.id,
        label:
          [savedBom.bomNo, savedBom.bomVersion].filter(Boolean).join(' / ') ||
          savedBom.id,
      })
      return savedBom
    } catch (error) {
      logger.error('Could not save BOM from product creation guide', error)
      return null
    }
  }
  return (
    <BOMActionDialog
      open
      wizardHeader={props.wizardHeader}
      initialProductId={productId}
      onOpenChange={(open) => {
        if (!open && !hasSavedBomRef.current) props.onClose()
      }}
      onSubmit={saveProductCreationGuideBom}
    />
  )
}
