import { z } from 'zod'
import { productionMaterialIssuanceDocumentSchema } from './production-material-issuance-source-review-and-frozen-document-api-dto'

const uuid = z.uuid().refine((value) => value === value.toLowerCase())
const positiveInteger = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
const quantity = z.number().finite().nonnegative()
const text = z.string().trim().min(1)

export const productionMaterialIssuanceWarehouseActionSchema = z.enum([
  'issue',
  'supplement',
  'return',
])
export type ProductionMaterialIssuanceWarehouseAction = z.infer<
  typeof productionMaterialIssuanceWarehouseActionSchema
>

const allocationSchema = z.object({
  id: uuid,
  movementMaterialId: uuid,
  sourceSnapshotId: uuid,
  salesOrderLineId: positiveInteger,
  quantity: quantity.positive(),
  originalAllocationId: uuid.nullable(),
})
const materialSchema = z.object({
  id: uuid,
  movementId: uuid,
  materialId: uuid,
  batchNo: z.string(),
  unit: text,
  quantity: quantity.positive(),
  unitCost: quantity,
  totalValue: quantity,
  sourceInventoryId: uuid,
  targetInventoryId: uuid,
  outboundLedgerEntryId: uuid,
  inboundLedgerEntryId: uuid,
})
const movementSchema = z
  .object({
    movement: z.object({
      id: uuid,
      documentId: uuid,
      documentVersionAfter: positiveInteger,
      kind: z.enum(['ISSUE', 'SUPPLEMENT', 'RETURN']),
      reason: z.string(),
      confirmedBy: text,
      confirmedAt: z.iso.datetime({ offset: true }),
    }),
    materials: z
      .array(
        z.object({
          material: materialSchema,
          allocations: z.array(allocationSchema).min(1),
        })
      )
      .min(1),
  })
  .superRefine((result, context) => {
    if (
      new Set(result.materials.map((item) => item.material.id)).size !==
        result.materials.length ||
      result.materials.some(
        (item) =>
          item.material.movementId !== result.movement.id ||
          item.allocations.some(
            (allocation) =>
              allocation.movementMaterialId !== item.material.id ||
              (result.movement.kind === 'RETURN'
                ? !allocation.originalAllocationId
                : allocation.originalAllocationId !== null)
          )
      )
    )
      context.addIssue({
        code: 'custom',
        message: 'Inconsistent warehouse movement identities',
      })
  })

export const productionMaterialIssuanceWarehouseReviewSchema = z
  .object({
    warehouseActionBlockers: z.object({
      issue: z.string(),
      supplement: z.string(),
      return: z.string(),
    }),
    document: productionMaterialIssuanceDocumentSchema,
    sourceMaterials: z.array(
      z.object({
        sourceSnapshotId: uuid,
        salesOrderLineId: positiveInteger,
        position: positiveInteger,
        materialId: uuid,
        materialCode: z.string(),
        materialName: z.string(),
        unit: text,
        standardQty: quantity,
        issuedQty: quantity,
        returnedQty: quantity,
        netQty: quantity,
        remainingQty: quantity,
        excessQty: quantity,
      })
    ),
    materialTotals: z.array(
      z.object({
        materialId: uuid,
        unit: text,
        standardQty: quantity,
        issuedQty: quantity,
        returnedQty: quantity,
        netQty: quantity,
        remainingQty: quantity,
        excessQty: quantity,
      })
    ),
    movements: z.array(movementSchema),
    returnableAllocations: z.array(
      z.object({
        originalAllocationId: uuid,
        salesOrderLineId: positiveInteger,
        materialId: uuid,
        batchNo: z.string(),
        unit: text,
        returnableQty: quantity.positive(),
      })
    ),
  })
  .superRefine((result, context) => {
    const rows = new Set(
      result.sourceMaterials.map(
        (row) => `${row.salesOrderLineId}/${row.materialId}`
      )
    )
    if (
      rows.size !== result.sourceMaterials.length ||
      new Set(result.materialTotals.map((row) => row.materialId)).size !==
        result.materialTotals.length ||
      result.materialTotals.some(
        (total) =>
          !result.sourceMaterials.some(
            (row) =>
              row.materialId === total.materialId && row.unit === total.unit
          )
      ) ||
      result.sourceMaterials.some(
        (row) =>
          !result.materialTotals.some(
            (total) =>
              total.materialId === row.materialId && total.unit === row.unit
          )
      ) ||
      result.movements.some(
        (entry) =>
          entry.movement.documentId !== result.document.id ||
          entry.movement.documentVersionAfter > result.document.version
      ) ||
      new Set(result.movements.map((entry) => entry.movement.id)).size !==
        result.movements.length ||
      new Set(
        result.returnableAllocations.map((entry) => entry.originalAllocationId)
      ).size !== result.returnableAllocations.length ||
      result.returnableAllocations.some(
        (entry) =>
          !result.movements.some(
            (movement) =>
              movement.movement.kind !== 'RETURN' &&
              movement.materials.some(
                (item) =>
                  item.material.materialId === entry.materialId &&
                  item.material.batchNo === entry.batchNo &&
                  item.material.unit === entry.unit &&
                  item.allocations.some(
                    (allocation) =>
                      allocation.id === entry.originalAllocationId &&
                      allocation.salesOrderLineId === entry.salesOrderLineId &&
                      entry.returnableQty <= allocation.quantity + 1e-9
                  )
              )
          )
      )
    )
      context.addIssue({
        code: 'custom',
        message: 'Inconsistent warehouse review scope',
      })
  })

export const productionMaterialIssuanceMaterialBatchRequestSchema =
  z.strictObject({
    documentId: uuid,
    expectedVersion: positiveInteger,
    materialId: uuid,
  })
export const productionMaterialIssuanceMaterialBatchResponseSchema = z
  .object({
    documentId: uuid,
    expectedVersion: positiveInteger,
    materialId: uuid,
    unit: text,
    items: z.array(
      z.object({
        inventoryId: uuid,
        materialId: uuid,
        categoryCode: z.literal('MATERIAL'),
        batchNo: z.string(),
        unit: text,
        inventoryQty: quantity,
        reservedQty: quantity,
        availableQty: quantity,
      })
    ),
  })
  .superRefine((result, context) => {
    if (
      new Set(result.items.map((item) => item.batchNo)).size !==
        result.items.length ||
      result.items.some(
        (item) =>
          item.materialId !== result.materialId ||
          item.unit.toLowerCase() !== result.unit.toLowerCase() ||
          item.availableQty > item.inventoryQty
      ) ||
      new Set(result.items.map((item) => item.inventoryId)).size !==
        result.items.length
    )
      context.addIssue({
        code: 'custom',
        message: 'Inconsistent production material batch response',
      })
  })

export const productionMaterialIssuanceAllocationInputSchema = z.strictObject({
  salesOrderLineId: positiveInteger,
  quantity: quantity.positive(),
  originalAllocationId: uuid.nullable(),
})
export const productionMaterialIssuanceAllocationSuggestionRequestSchema =
  productionMaterialIssuanceMaterialBatchRequestSchema.extend({
    quantity: quantity.positive(),
  })
export const productionMaterialIssuanceAllocationSuggestionResponseSchema =
  productionMaterialIssuanceAllocationSuggestionRequestSchema.extend({
    allocations: z
      .array(productionMaterialIssuanceAllocationInputSchema)
      .min(1),
  })
export const productionMaterialIssuanceWarehouseCommandSchema = z
  .strictObject({
    documentId: uuid,
    commandId: uuid,
    expectedVersion: positiveInteger,
    action: productionMaterialIssuanceWarehouseActionSchema,
    reason: z
      .string()
      .trim()
      .refine((value) => new TextEncoder().encode(value).length <= 2000),
    materials: z
      .array(
        z.strictObject({
          materialId: uuid,
          batchNo: z.string().max(100),
          quantity: quantity.positive(),
          allocations: z
            .array(productionMaterialIssuanceAllocationInputSchema)
            .min(1)
            .max(500),
        })
      )
      .min(1)
      .max(200),
  })
  .superRefine((command, context) => {
    if (
      (command.action !== 'issue' && !command.reason) ||
      new Set(
        command.materials.map((item) => `${item.materialId}/${item.batchNo}`)
      ).size !== command.materials.length ||
      command.materials.some((item) => {
        const allocated = item.allocations.reduce(
          (total, entry) => total + entry.quantity,
          0
        )
        const identities = item.allocations.map((entry) =>
          command.action === 'return'
            ? entry.originalAllocationId
            : entry.salesOrderLineId
        )
        return (
          !Number.isFinite(allocated) ||
          Math.abs(allocated - item.quantity) > 1e-9 ||
          new Set(identities).size !== identities.length
        )
      }) ||
      command.materials.some((item) =>
        item.allocations.some((allocation) =>
          command.action === 'return'
            ? !allocation.originalAllocationId
            : allocation.originalAllocationId !== null
        )
      )
    )
      context.addIssue({
        code: 'custom',
        message: 'Missing reason or invalid return origin',
      })
  })
export const productionMaterialIssuanceWarehouseCommandResultSchema = z.object({
  document: productionMaterialIssuanceDocumentSchema,
  movement: movementSchema,
})

export type ProductionMaterialIssuanceWarehouseReview = z.infer<
  typeof productionMaterialIssuanceWarehouseReviewSchema
>
export type ProductionMaterialIssuanceWarehouseCommand = z.infer<
  typeof productionMaterialIssuanceWarehouseCommandSchema
>
export type ProductionMaterialIssuanceWarehouseCommandResult = z.infer<
  typeof productionMaterialIssuanceWarehouseCommandResultSchema
>
export type ProductionMaterialIssuanceMaterialBatchRequest = z.infer<
  typeof productionMaterialIssuanceMaterialBatchRequestSchema
>
export type ProductionMaterialIssuanceAllocationSuggestionRequest = z.infer<
  typeof productionMaterialIssuanceAllocationSuggestionRequestSchema
>
export type ProductionMaterialIssuanceAllocationInput = z.infer<
  typeof productionMaterialIssuanceAllocationInputSchema
>
