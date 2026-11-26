import { z } from 'zod'
import { apiFetch } from '@/lib/api-client'
import { isApiClientError } from '@/lib/api-error'
import { normalizeMachineCode } from '@/lib/codecs/code-normalization'

export const productionExecutionProductBarcodeLifecycleHistoryPageSize = 50
const productBarcodeLifecycleHistoryNotFoundErrorCode =
  'PRODUCT_BARCODE_LIFECYCLE_NOT_FOUND'

const productionExecutionProductBarcodeLifecycleCurrentStateSchema = z.object({
  id: z.string(),
  productBarcode: z.string().min(1),
  productId: z.string(),
  productName: z.string(),
  routeId: z.string(),
  routeStepId: z.string(),
  currentProcessStepId: z.string(),
  currentProcessStep: z
    .object({ id: z.string(), code: z.string(), name: z.string() })
    .nullish(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'HOLD', 'REWORK']),
  lastEventId: z.string(),
  startedAt: z.string(),
  completedAt: z.string(),
  updatedAt: z.string(),
})

const productionExecutionProductBarcodeLifecycleStateEventSchema = z.object({
  id: z.string(),
  stateId: z.string(),
  operationId: z.string().optional(),
  productBarcode: z.string().min(1),
  eventType: z.string(),
  fromProcessStepId: z.string(),
  toProcessStepId: z.string(),
  routeId: z.string(),
  routeStepId: z.string(),
  operator: z.string(),
  payloadSnapshot: z.string(),
  occurredAt: z.string(),
})

const productionExecutionProductBarcodeLifecycleOperationSchema = z.object({
  submittedByUserId: z.string(),
  id: z.string(),
  executionRound: z.number().int().nonnegative(),
  productBarcode: z.string().min(1),
  stateId: z.string(),
  executionLotId: z.string(),
  routeId: z.string(),
  routeStepId: z.string(),
  processStepId: z.string(),
  productionWorkLocationId: z.string(),
  executionMode: z.string(),
  partnerId: z.string(),
  action: z.string(),
  status: z.string(),
  result: z.string(),
  operator: z.string(),
  startedAt: z.string(),
  completedAt: z.string(),
  notes: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const productionExecutionProductBarcodeLifecycleTransferEventSchema = z.object({
  id: z.string(),
  productBarcode: z.string().min(1),
  stateId: z.string(),
  operationId: z.string(),
  transferType: z.string(),
  routeId: z.string(),
  fromRouteStepId: z.string(),
  toRouteStepId: z.string(),
  fromProcessStepId: z.string(),
  toProcessStepId: z.string(),
  fromHolderType: z.string(),
  fromHolderId: z.string(),
  toHolderType: z.string(),
  toHolderId: z.string(),
  operator: z.string(),
  payloadSnapshot: z.string(),
  occurredAt: z.string(),
})

const productionExecutionProductBarcodeLifecycleHistoryPageSchema = z.object({
  currentState: productionExecutionProductBarcodeLifecycleCurrentStateSchema,
  stateEvents: z.array(
    productionExecutionProductBarcodeLifecycleStateEventSchema
  ),
  stateEventTotal: z.number().int().nonnegative(),
  operationExecutions: z.array(
    productionExecutionProductBarcodeLifecycleOperationSchema
  ),
  operationExecutionTotal: z.number().int().nonnegative(),
  transferEvents: z.array(
    productionExecutionProductBarcodeLifecycleTransferEventSchema
  ),
  transferEventTotal: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
})

export type ProductionExecutionProductBarcodeLifecycleHistoryPage = z.infer<
  typeof productionExecutionProductBarcodeLifecycleHistoryPageSchema
>

export async function queryProductionExecutionProductBarcodeLifecycleHistory(
  barcode: string,
  offset = 0,
  signal?: AbortSignal
): Promise<ProductionExecutionProductBarcodeLifecycleHistoryPage | null> {
  const productBarcode = normalizeMachineCode(barcode)
  if (!productBarcode) throw new Error('A product barcode is required')
  if (!Number.isInteger(offset) || offset < 0) {
    throw new Error('Lifecycle history offset must be a non-negative integer')
  }

  const query = new URLSearchParams({
    limit: String(productionExecutionProductBarcodeLifecycleHistoryPageSize),
    offset: String(offset),
  })

  try {
    const page =
      productionExecutionProductBarcodeLifecycleHistoryPageSchema.parse(
        await apiFetch<unknown>(
          '/production/product-barcode-lifecycle/' +
            encodeURIComponent(productBarcode) +
            '?' +
            query.toString(),
          { signal, suppressErrorStatuses: [404] }
        )
      )
    if (
      page.offset !== offset ||
      page.limit !== productionExecutionProductBarcodeLifecycleHistoryPageSize
    ) {
      throw new Error(
        'The product barcode lifecycle page does not match the requested range'
      )
    }
    if (
      page.stateEvents.length > page.limit ||
      page.operationExecutions.length > page.limit ||
      page.transferEvents.length > page.limit
    ) {
      throw new Error(
        'The product barcode lifecycle page exceeds its requested limit'
      )
    }
    if (page.currentState.productBarcode !== productBarcode) {
      throw new Error(
        'The product barcode lifecycle belongs to a different product barcode'
      )
    }
    if (
      page.stateEvents.some(
        (event) => event.productBarcode !== productBarcode
      ) ||
      page.operationExecutions.some(
        (operation) => operation.productBarcode !== productBarcode
      ) ||
      page.transferEvents.some(
        (event) => event.productBarcode !== productBarcode
      )
    ) {
      throw new Error(
        'The product barcode lifecycle contains records for a different product barcode'
      )
    }
    return page
  } catch (error) {
    if (
      isApiClientError(error) &&
      error.status === 404 &&
      error.code === productBarcodeLifecycleHistoryNotFoundErrorCode
    ) {
      return null
    }
    throw error
  }
}
