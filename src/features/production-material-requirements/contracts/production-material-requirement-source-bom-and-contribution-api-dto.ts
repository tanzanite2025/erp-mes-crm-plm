import { z } from 'zod'

const finiteQuantity = z.number().finite().nonnegative()

export const productionMaterialRequirementBomCandidateSchema = z.object({
  id: z.string().min(1),
  bomNo: z.string(),
  version: z.number().int(),
  revisionNo: z.string(),
  bomVersion: z.string(),
  versionLevel: z.string(),
  versionLevelLabelZh: z.string(),
  versionLevelLabelEn: z.string(),
  ownerType: z.string(),
  ownerCustomerId: z.string(),
  measuredWeight: finiteQuantity,
  measuredWeightUnit: z.string(),
})

export const productionMaterialRequirementContributionSchema = z.object({
  bomItemId: z.string().min(1),
  materialId: z.string().min(1),
  section: z.string(),
  unit: z.string().min(1),
  standardUsage: finiteQuantity,
  requiredQty: finiteQuantity,
})

export const productionMaterialRequirementSourceLineSchema = z
  .object({
    salesOrderId: z.string(),
    salesOrderLineId: z.number().int().nonnegative(),
    orderVersion: z.number().int(),
    orderNo: z.string(),
    lineNo: z.number().int(),
    totalLines: z.number().int(),
    customerId: z.string(),
    customerName: z.string(),
    productId: z.string(),
    productName: z.string(),
    productModel: z.string(),
    finishedQty: z.number().finite(),
    bom: productionMaterialRequirementBomCandidateSchema.nullable(),
    bomCandidates: z.array(productionMaterialRequirementBomCandidateSchema),
    contributions: z.array(productionMaterialRequirementContributionSchema),
    issueCode: z.enum([
      '',
      'DUPLICATE_EFFECTIVE_MBOM',
      'MISSING_BOM',
      'MISSING_MBOM_BRANCH',
      'INVALID_SOURCE_LINE',
      'INVALID_MATERIAL',
      'MATERIAL_UNIT_MISMATCH',
      'INVALID_STANDARD_USAGE',
      'EMPTY_BOM_REQUIREMENT',
    ]),
  })
  .superRefine((source, context) => {
    const candidateIds = source.bomCandidates.map((candidate) => candidate.id)
    const hasDuplicateCandidates = candidateIds.length > 1
    const hasUniqueCandidateMismatch = source.bom
      ? candidateIds.length !== 1 || source.bom.id !== candidateIds[0]
      : candidateIds.length === 1
    if (
      new Set(candidateIds).size !== candidateIds.length ||
      hasUniqueCandidateMismatch ||
      hasDuplicateCandidates !==
        (source.issueCode === 'DUPLICATE_EFFECTIVE_MBOM') ||
      (source.issueCode === '' && !source.bom)
    )
      context.addIssue({
        code: 'custom',
        message: 'Inconsistent effective MBOM candidates',
      })
  })

export type ProductionMaterialRequirementSourceLine = z.infer<
  typeof productionMaterialRequirementSourceLineSchema
>
