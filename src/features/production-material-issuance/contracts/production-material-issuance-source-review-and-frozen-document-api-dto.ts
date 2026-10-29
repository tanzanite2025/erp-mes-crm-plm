import { z } from 'zod'
import {
  productionMaterialRequirementBomCandidateSchema,
  productionMaterialRequirementContributionSchema,
} from '@/features/production-material-requirements/contracts/production-material-requirement-source-bom-and-contribution-api-dto'

const positiveSafeInteger = z
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER)
const nonemptyText = z.string().trim().min(1)

export const productionMaterialIssuanceSourceSelectionSchema = z.strictObject({
  salesOrderId: z.uuid(),
  salesOrderLineId: positiveSafeInteger,
  bomId: z.uuid(),
})

export const productionMaterialIssuanceSourceReviewRequestSchema = z
  .strictObject({
    sources: z
      .array(productionMaterialIssuanceSourceSelectionSchema)
      .min(1)
      .max(500),
  })
  .superRefine((request, context) => {
    if (
      new Set(request.sources.map((source) => source.salesOrderLineId)).size !==
      request.sources.length
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Duplicate production material source lines',
      })
    }
  })

export const productionMaterialIssuanceReviewedSourceBasisSchema = z
  .object({
    salesOrderId: z.uuid(),
    salesOrderLineId: positiveSafeInteger,
    orderVersion: positiveSafeInteger,
    orderNo: nonemptyText,
    lineNo: positiveSafeInteger,
    customerId: z.string(),
    customerName: z.string(),
    productId: z.uuid(),
    productName: z.string(),
    finishedQty: z.number().finite().positive(),
    finishedUnit: nonemptyText,
    bom: productionMaterialRequirementBomCandidateSchema.extend({
      id: z.uuid(),
      version: positiveSafeInteger,
      measuredWeight: z.number().finite().positive(),
      measuredWeightUnit: nonemptyText,
    }),
    contributions: z
      .array(
        productionMaterialRequirementContributionSchema.extend({
          bomItemId: z.uuid(),
          materialId: z.uuid(),
          materialCode: z.string(),
          materialName: z.string(),
          materialSpec: z.string(),
        })
      )
      .min(1),
    basisFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .superRefine((basis, context) => {
    if (
      new Set(basis.contributions.map((item) => item.bomItemId)).size !==
        basis.contributions.length ||
      !basis.contributions.some((item) => item.requiredQty > 0)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Invalid production material recipe contributions',
      })
    }
  })

const reviewedSourcesSchema = z
  .array(productionMaterialIssuanceReviewedSourceBasisSchema)
  .min(1)
  .max(500)
  .superRefine((sources, context) => {
    if (
      new Set(sources.map((source) => source.salesOrderLineId)).size !==
      sources.length
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Duplicate frozen source identities',
      })
    }
  })

export const productionMaterialIssuanceSourceReviewResponseSchema = z.object({
  warehouseCategoryCode: z.literal('MATERIAL'),
  sources: reviewedSourcesSchema,
})

export const productionMaterialIssuanceDocumentSchema = z
  .object({
    id: z.uuid(),
    documentNo: nonemptyText,
    version: positiveSafeInteger,
    status: z.enum(['DISPATCHED', 'WITHDRAWN']),
    warehouseCategoryCode: z.literal('MATERIAL'),
    dispatchedBy: nonemptyText,
    dispatchedAt: z.iso.datetime({ offset: true }),
    withdrawnBy: z.string(),
    withdrawnAt: z.iso.datetime({ offset: true }).nullable(),
    withdrawalReason: z.string(),
    warehouseExecutionAt: z.iso.datetime({ offset: true }).nullable(),
  })
  .superRefine((document, context) => {
    if (
      (document.status === 'WITHDRAWN' &&
        (!document.withdrawnAt ||
          !document.withdrawnBy.trim() ||
          !document.withdrawalReason.trim() ||
          document.warehouseExecutionAt)) ||
      (document.status === 'DISPATCHED' &&
        (document.withdrawnAt ||
          document.withdrawnBy ||
          document.withdrawalReason))
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Inconsistent production material document status',
      })
    }
  })

export const productionMaterialIssuanceDocumentDetailSchema = z.object({
  document: productionMaterialIssuanceDocumentSchema,
  sources: reviewedSourcesSchema,
})

export const productionMaterialIssuanceDocumentListQuerySchema = z
  .strictObject({
    status: z.enum(['', 'DISPATCHED', 'WITHDRAWN']),
    page: positiveSafeInteger,
    pageSize: positiveSafeInteger.max(200),
  })
  .refine(
    (query) => Number.isSafeInteger((query.page - 1) * query.pageSize),
    'Invalid production material document pagination'
  )

export const productionMaterialIssuanceDocumentListSchema = z
  .object({
    items: z.array(productionMaterialIssuanceDocumentSchema),
    total: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    page: positiveSafeInteger,
    pageSize: positiveSafeInteger.max(200),
  })
  .superRefine((result, context) => {
    const offset = (result.page - 1) * result.pageSize
    if (
      !Number.isSafeInteger(offset) ||
      result.items.length !==
        Math.min(Math.max(result.total - offset, 0), result.pageSize) ||
      new Set(result.items.map((document) => document.id)).size !==
        result.items.length
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Incomplete production material document page',
      })
    }
  })

export type ProductionMaterialIssuanceSourceSelection = z.infer<
  typeof productionMaterialIssuanceSourceSelectionSchema
>
export type ProductionMaterialIssuanceReviewedSourceBasis = z.infer<
  typeof productionMaterialIssuanceReviewedSourceBasisSchema
>
export type ProductionMaterialIssuanceSourceReviewResponse = z.infer<
  typeof productionMaterialIssuanceSourceReviewResponseSchema
>
export type ProductionMaterialIssuanceDocumentListQuery = z.infer<
  typeof productionMaterialIssuanceDocumentListQuerySchema
>
export type ProductionMaterialIssuanceDocument = z.infer<
  typeof productionMaterialIssuanceDocumentSchema
>
