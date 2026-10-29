import { z } from 'zod'

const finiteQuantity = z.number().finite().nonnegative()

export const productionMaterialRequirementBomSelectionSchema = z.object({
  salesOrderId: z.string().min(1),
  salesOrderLineId: z.number().int().positive(),
  bomId: z.string().min(1),
})

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

export const productionMaterialRequirementSourceLineSchema = z.object({
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
    'BOM_SELECTION_REQUIRED',
    'BOM_SELECTION_CHANGED',
    'MISSING_BOM',
    'INVALID_SOURCE_LINE',
    'INVALID_MATERIAL',
    'MATERIAL_UNIT_MISMATCH',
    'INVALID_STANDARD_USAGE',
    'EMPTY_BOM_REQUIREMENT',
  ]),
})

export type ProductionMaterialRequirementBomSelection = z.infer<
  typeof productionMaterialRequirementBomSelectionSchema
>
export type ProductionMaterialRequirementSourceLine = z.infer<
  typeof productionMaterialRequirementSourceLineSchema
>
