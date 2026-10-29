import { z } from 'zod'
import { productionMaterialRequirementSourceLineSchema } from '@/features/production-material-requirements/contracts/production-material-requirement-source-bom-and-contribution-api-dto'

const positiveIdentity = z
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER)
export const productionMaterialIssuanceSourceOptionsQuerySchema = z
  .strictObject({
    search: z.string().trim().max(200),
    page: positiveIdentity,
    pageSize: positiveIdentity.max(100),
  })
  .refine((query) => Number.isSafeInteger((query.page - 1) * query.pageSize))

export const productionMaterialIssuanceSourceOptionSchema = z.object({
  salesOrderId: z.uuid(),
  salesOrderLineId: positiveIdentity,
  orderNo: z.string().min(1),
  lineNo: z.number().int(),
  orderVersion: z.number().int(),
  status: z.enum(['Pending', 'Scheduling', 'InProgress']),
  customerName: z.string(),
  productName: z.string(),
  finishedQty: z.number().finite(),
  finishedUnit: z.string(),
  documentId: z.union([z.literal(''), z.uuid()]),
  documentNo: z.string(),
})

export const productionMaterialIssuanceSourceOptionsSchema =
  productionMaterialIssuanceSourceOptionsQuerySchema
    .safeExtend({
      items: z.array(productionMaterialIssuanceSourceOptionSchema),
      total: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    })
    .superRefine((result, context) => {
      const expected = Math.min(
        result.pageSize,
        Math.max(0, result.total - (result.page - 1) * result.pageSize)
      )
      if (
        result.items.length !== expected ||
        new Set(result.items.map((item) => item.salesOrderLineId)).size !==
          result.items.length ||
        result.items.some(
          (item) => Boolean(item.documentId) !== Boolean(item.documentNo)
        )
      )
        context.addIssue({
          code: 'custom',
          message: 'Incomplete or inconsistent production source page',
        })
    })

export const productionMaterialIssuanceSourcePreparationSelectionSchema =
  z.strictObject({
    salesOrderId: z.uuid(),
    salesOrderLineId: positiveIdentity,
    bomId: z.uuid().optional(),
  })
export const productionMaterialIssuanceSourcePreparationRequestSchema = z
  .strictObject({
    sources: z
      .array(productionMaterialIssuanceSourcePreparationSelectionSchema)
      .min(1)
      .max(500),
  })
  .refine(
    (request) =>
      new Set(request.sources.map((source) => source.salesOrderLineId)).size ===
      request.sources.length,
    'Duplicate source identities'
  )

export const productionMaterialIssuanceSourcePreparationResponseSchema = z
  .object({
    sourceLines: z
      .array(
        productionMaterialRequirementSourceLineSchema.extend({
          salesOrderId: z.uuid(),
          salesOrderLineId: positiveIdentity,
        })
      )
      .min(1)
      .max(500),
    issues: z.array(
      z.object({
        salesOrderLineId: positiveIdentity,
        code: z.enum([
          'MISSING_PRODUCT',
          'BOM_SELECTION_REQUIRED',
          'BOM_SELECTION_CHANGED',
          'MISSING_BOM',
          'INVALID_SOURCE_LINE',
          'INVALID_MATERIAL',
          'MATERIAL_UNIT_MISMATCH',
          'INVALID_STANDARD_USAGE',
          'EMPTY_BOM_REQUIREMENT',
          'MISSING_FINISHED_UNIT',
          'INVALID_SOURCE_VERSION',
          'INVALID_FINISHED_WEIGHT',
        ]),
      })
    ),
    isReady: z.boolean(),
    warehouseCategoryCode: z.literal('MATERIAL'),
  })
  .superRefine((result, context) => {
    const identities = new Set(
      result.sourceLines.map((source) => source.salesOrderLineId)
    )
    if (
      identities.size !== result.sourceLines.length ||
      result.issues.some((issue) => !identities.has(issue.salesOrderLineId)) ||
      result.isReady !== (result.issues.length === 0) ||
      (result.isReady &&
        result.sourceLines.some(
          (source) =>
            !source.bom ||
            source.issueCode ||
            source.orderVersion <= 0 ||
            source.bom.version <= 0 ||
            source.bom.measuredWeight <= 0 ||
            !source.bom.measuredWeightUnit.trim() ||
            source.finishedQty <= 0 ||
            !source.contributions.some((item) => item.requiredQty > 0)
        ))
    )
      context.addIssue({
        code: 'custom',
        message: 'Inconsistent source preparation prerequisites',
      })
  })

export type ProductionMaterialIssuanceSourceOptionsQuery = z.infer<
  typeof productionMaterialIssuanceSourceOptionsQuerySchema
>
export type ProductionMaterialIssuanceSourceOption = z.infer<
  typeof productionMaterialIssuanceSourceOptionSchema
>
export type ProductionMaterialIssuanceSourcePreparationSelection = z.infer<
  typeof productionMaterialIssuanceSourcePreparationSelectionSchema
>
export type ProductionMaterialIssuanceSourcePreparation = z.infer<
  typeof productionMaterialIssuanceSourcePreparationResponseSchema
>
export type ProductionMaterialIssuanceSelectedSource =
  ProductionMaterialIssuanceSourcePreparationSelection & {
    orderNo: string
    lineNo: number
    productName: string
  }
