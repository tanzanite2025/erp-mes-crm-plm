import { z } from 'zod'
import {
  productionMaterialRequirementBomCandidateSchema,
  productionMaterialRequirementSourceLineSchema,
} from '@/features/production-material-requirements/contracts/production-material-requirement-source-bom-and-contribution-api-dto'

const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
const quantity = z.number().finite().nonnegative()
const quantities = {
  standardQty: quantity,
  issuedQty: quantity,
  returnedQty: quantity,
  netQty: quantity,
  remainingQty: quantity,
  excessQty: quantity,
}
const materialIdentity = {
  materialId: z.uuid(),
  materialCode: z.string(),
  materialName: z.string(),
  unit: z.string().trim().min(1),
}

export const productionMaterialIssuanceActiveProgressQuerySchema =
  z.strictObject({
    materialsPage: count.positive(),
    ordersPage: count.positive(),
    pageSize: count.positive().max(100),
  })

const sourceMaterialSchema = z.object({
  ...materialIdentity,
  ...quantities,
  salesOrderLineId: count.positive(),
  sourceSnapshotId: z.union([z.literal(''), z.uuid()]),
  position: count.positive(),
})

export const productionMaterialIssuanceActiveProgressResponseSchema = z
  .object({
    asOf: z.iso.datetime({ offset: true }),
    warehouseCategoryCode: z.literal('MATERIAL'),
    scope: z.object({
      activeOrderCount: count,
      sourceLineCount: count,
      dispatchedLineCount: count,
      undispatchedLineCount: count,
      issueLineCount: count,
      materialCount: count,
      isComplete: z.boolean(),
    }),
    materialsPage: count.positive(),
    ordersPage: count.positive(),
    pageSize: count.positive().max(100),
    materials: z.array(
      z.object({
        ...materialIdentity,
        ...quantities,
        sourceLineCount: count.positive(),
      })
    ),
    orderLines: z.array(
      z.object({
        salesOrderId: z.uuid(),
        salesOrderLineId: count.positive(),
        orderNo: z.string().min(1),
        lineNo: count.positive(),
        customerName: z.string(),
        productName: z.string(),
        finishedQty: z.number().finite(),
        finishedUnit: z.string(),
        documentId: z.union([z.literal(''), z.uuid()]),
        documentNo: z.string(),
        bom: productionMaterialRequirementBomCandidateSchema.nullable(),
        issueCode:
          productionMaterialRequirementSourceLineSchema.shape.issueCode,
        materials: z.array(sourceMaterialSchema),
      })
    ),
  })
  .superRefine((result, context) => {
    const scope = result.scope
    if (
      scope.sourceLineCount !==
        scope.dispatchedLineCount + scope.undispatchedLineCount ||
      scope.isComplete !== (scope.issueLineCount === 0) ||
      scope.issueLineCount > scope.undispatchedLineCount ||
      result.materials.length > result.pageSize ||
      result.orderLines.length > result.pageSize ||
      new Set(result.materials.map((row) => row.materialId)).size !==
        result.materials.length ||
      new Set(result.orderLines.map((row) => row.salesOrderLineId)).size !==
        result.orderLines.length ||
      result.orderLines.some(
        (line) =>
          (line.issueCode
            ? line.materials.length !== 0
            : !line.bom || line.materials.length === 0) ||
          Boolean(line.documentId) !== Boolean(line.documentNo) ||
          new Set(line.materials.map((row) => row.materialId)).size !==
            line.materials.length ||
          line.materials.some(
            (row) =>
              row.salesOrderLineId !== line.salesOrderLineId ||
              Boolean(row.sourceSnapshotId) !== Boolean(line.documentId)
          )
      )
    )
      context.addIssue({
        code: 'custom',
        message:
          'Inconsistent active production material scope or source identities',
      })
    const expectedMaterialCount = Math.min(
      result.pageSize,
      Math.max(
        0,
        scope.materialCount - (result.materialsPage - 1) * result.pageSize
      )
    )
    const expectedOrderCount = Math.min(
      result.pageSize,
      Math.max(
        0,
        scope.sourceLineCount - (result.ordersPage - 1) * result.pageSize
      )
    )
    if (
      result.materials.length !== expectedMaterialCount ||
      result.orderLines.length !== expectedOrderCount
    )
      context.addIssue({
        code: 'custom',
        message: 'Incomplete active progress page',
      })
  })

export type ProductionMaterialIssuanceActiveProgressQuery = z.infer<
  typeof productionMaterialIssuanceActiveProgressQuerySchema
>
export type ProductionMaterialIssuanceActiveProgressResponse = z.infer<
  typeof productionMaterialIssuanceActiveProgressResponseSchema
>
export type ProductionMaterialIssuanceActiveOrderLineProgress =
  ProductionMaterialIssuanceActiveProgressResponse['orderLines'][number]
export type ProductionMaterialIssuanceActiveMaterialProgress =
  ProductionMaterialIssuanceActiveProgressResponse['materials'][number]
