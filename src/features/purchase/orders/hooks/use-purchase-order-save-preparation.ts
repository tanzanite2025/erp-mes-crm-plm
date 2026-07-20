import { useCallback } from 'react'
import { type DeltaSet } from '@/lib/delta/types'
import { type PurchaseOrder } from '../data/schema'
import { buildPurchaseOrderSaveExecution } from './purchase-order-form-save-helpers'
import { preparePurchaseOrderForSubmit } from './purchase-order-form-submit-helpers'

interface UsePurchaseOrderSavePreparationOptions {
  initialOrder: PurchaseOrder | null | undefined
  formData: PurchaseOrder
  commit: () => DeltaSet
}

export function usePurchaseOrderSavePreparation({
  initialOrder,
  formData,
  commit,
}: UsePurchaseOrderSavePreparationOptions) {
  const prepareSubmitData = useCallback(() => {
    return preparePurchaseOrderForSubmit(formData)
  }, [formData])

  const prepareSaveExecution = useCallback(() => {
    const submitValues = preparePurchaseOrderForSubmit(formData)
    const delta = commit()

    return buildPurchaseOrderSaveExecution(initialOrder, submitValues, delta)
  }, [commit, formData, initialOrder])

  return {
    prepareSubmitData,
    prepareSaveExecution,
  }
}
