import { apiFetch } from '@/lib/api-client'
import {
  productionMaterialIssuanceWarehouseReviewSchema,
  productionMaterialIssuanceMaterialBatchRequestSchema,
  productionMaterialIssuanceMaterialBatchResponseSchema,
  productionMaterialIssuanceAllocationSuggestionRequestSchema,
  productionMaterialIssuanceAllocationSuggestionResponseSchema,
  productionMaterialIssuanceWarehouseCommandSchema,
  productionMaterialIssuanceWarehouseCommandResultSchema,
  type ProductionMaterialIssuanceMaterialBatchRequest,
  type ProductionMaterialIssuanceAllocationSuggestionRequest,
  type ProductionMaterialIssuanceWarehouseCommand,
} from '../contracts/production-material-issuance-warehouse-review-batch-availability-and-confirmed-movement-api-dto'

const documentEndpoint = '/mrp/production-material-issuance/documents'

export async function getProductionMaterialIssuanceWarehouseReview(
  documentId: string,
  signal?: AbortSignal
) {
  const id =
    productionMaterialIssuanceMaterialBatchRequestSchema.shape.documentId.parse(
      documentId
    )
  const result = productionMaterialIssuanceWarehouseReviewSchema.parse(
    await apiFetch<unknown>(`${documentEndpoint}/${id}/warehouse-review`, {
      signal,
    })
  )
  if (result.document.id !== id)
    throw new Error('[CRITICAL] Warehouse review returned a different document')
  return result
}

export async function getProductionMaterialIssuanceMaterialBatchAvailability(
  input: ProductionMaterialIssuanceMaterialBatchRequest,
  signal?: AbortSignal
) {
  const { documentId, ...body } =
    productionMaterialIssuanceMaterialBatchRequestSchema.parse(input)
  const result = productionMaterialIssuanceMaterialBatchResponseSchema.parse(
    await apiFetch<unknown>(
      `${documentEndpoint}/${documentId}/material-batches`,
      { method: 'POST', body: JSON.stringify(body), signal }
    )
  )
  if (
    result.documentId !== documentId ||
    result.materialId !== body.materialId ||
    result.expectedVersion !== body.expectedVersion
  )
    throw new Error(
      '[CRITICAL] Batch query returned a different material or version'
    )
  return result
}

export async function suggestProductionMaterialIssuanceOrdinaryAllocations(
  input: ProductionMaterialIssuanceAllocationSuggestionRequest
) {
  const { documentId, ...body } =
    productionMaterialIssuanceAllocationSuggestionRequestSchema.parse(input)
  const result =
    productionMaterialIssuanceAllocationSuggestionResponseSchema.parse(
      await apiFetch<unknown>(
        `${documentEndpoint}/${documentId}/ordinary-allocation-suggestion`,
        { method: 'POST', body: JSON.stringify(body) }
      )
    )
  if (
    result.documentId !== documentId ||
    result.materialId !== body.materialId ||
    result.expectedVersion !== body.expectedVersion ||
    result.quantity !== body.quantity ||
    result.allocations.some((entry) => entry.originalAllocationId !== null)
  )
    throw new Error(
      '[CRITICAL] Allocation suggestion returned a different scope'
    )
  return result
}

export async function confirmProductionMaterialIssuanceWarehouseMovement(
  input: ProductionMaterialIssuanceWarehouseCommand,
  expectedActorId: string
) {
  const { documentId, action, ...body } =
    productionMaterialIssuanceWarehouseCommandSchema.parse(input)
  const result = productionMaterialIssuanceWarehouseCommandResultSchema.parse(
    await apiFetch<unknown>(`${documentEndpoint}/${documentId}/${action}`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  )
  const movement = result.movement
  if (
    result.document.id !== documentId ||
    result.document.status !== 'DISPATCHED' ||
    movement.movement.documentId !== documentId ||
    movement.movement.kind !== action.toUpperCase() ||
    movement.movement.confirmedBy !== expectedActorId ||
    movement.movement.reason !== body.reason ||
    movement.movement.documentVersionAfter !== body.expectedVersion + 1 ||
    result.document.version < movement.movement.documentVersionAfter ||
    !result.document.warehouseExecutionAt ||
    movement.materials.length !== body.materials.length ||
    movement.materials.some((item) => {
      const expected = body.materials.find(
        (material) =>
          material.materialId === item.material.materialId &&
          material.batchNo === item.material.batchNo
      )
      return (
        !expected ||
        Math.abs(expected.quantity - item.material.quantity) > 1e-9 ||
        item.allocations.length !== expected.allocations.length ||
        item.allocations.some(
          (allocation) =>
            !expected.allocations.some(
              (entry) =>
                entry.salesOrderLineId === allocation.salesOrderLineId &&
                entry.originalAllocationId ===
                  allocation.originalAllocationId &&
                Math.abs(entry.quantity - allocation.quantity) <= 1e-9
            )
        )
      )
    })
  )
    throw new Error(
      '[CRITICAL] Warehouse confirmation returned a different command result'
    )
  return result
}
