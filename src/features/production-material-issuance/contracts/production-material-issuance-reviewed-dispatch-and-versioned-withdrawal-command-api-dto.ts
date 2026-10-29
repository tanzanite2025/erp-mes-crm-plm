import { z } from 'zod'
import {
  productionMaterialIssuanceDocumentSchema,
  productionMaterialIssuanceReviewedSourceBasisSchema,
  productionMaterialIssuanceSourceSelectionSchema,
} from './production-material-issuance-source-review-and-frozen-document-api-dto'

const positiveVersion = productionMaterialIssuanceDocumentSchema.shape.version

export const productionMaterialIssuanceDispatchCommandSchema = z
  .strictObject({
    commandId: z.uuid(),
    sources: z
      .array(
        productionMaterialIssuanceSourceSelectionSchema.extend({
          expectedOrderVersion: positiveVersion,
          expectedBomVersion: positiveVersion,
          basisFingerprint:
            productionMaterialIssuanceReviewedSourceBasisSchema.shape
              .basisFingerprint,
        })
      )
      .min(1)
      .max(500),
  })
  .refine(
    (request) =>
      new Set(request.sources.map((source) => source.salesOrderLineId)).size ===
      request.sources.length,
    'Duplicate production material dispatch sources'
  )

export const productionMaterialIssuanceWithdrawalCommandSchema = z.strictObject(
  {
    commandId: z.uuid(),
    documentId: z.uuid(),
    expectedVersion: positiveVersion,
    reason: z
      .string()
      .trim()
      .min(1)
      .refine(
        (reason) => new TextEncoder().encode(reason).length <= 2000,
        'Withdrawal reason is too long'
      ),
  }
)

export type ProductionMaterialIssuanceDispatchCommand = z.infer<
  typeof productionMaterialIssuanceDispatchCommandSchema
>
export type ProductionMaterialIssuanceWithdrawalCommand = z.infer<
  typeof productionMaterialIssuanceWithdrawalCommandSchema
>
