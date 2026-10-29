import { z } from 'zod'
import { productionMaterialRequirementSourceLineSchema } from '@/features/production-material-requirements/contracts/production-material-requirement-source-bom-and-contribution-api-dto'

const finiteQuantity = z.number().finite().nonnegative()

export const materialRequirementSchema = z.object({
  materialId: z.string().min(1),
  materialCode: z.string(),
  materialName: z.string(),
  materialSpec: z.string(),
  section: z.string(),
  totalRequired: finiteQuantity,
  inventoryQty: finiteQuantity,
  lockedQty: finiteQuantity,
  onWayPurchaseQty: finiteQuantity,
  wipQty: finiteQuantity,
  usableStock: finiteQuantity,
  allocatedStockQty: finiteQuantity,
  totalSupply: finiteQuantity,
  effectiveGap: finiteQuantity,
  shortageGap: finiteQuantity,
  unit: z.string().min(1),
  sourceOrders: z.array(
    z.object({
      orderNo: z.string(),
      customerName: z.string(),
      qty: finiteQuantity,
      productName: z.string(),
      lineNo: z.number().int(),
      totalLines: z.number().int(),
      salesOrderId: z.string().min(1),
      salesOrderLineId: z.number().int().positive(),
      orderVersion: z.number().int(),
      bomId: z.string().min(1),
      bomVersion: z.number().int(),
      revisionNo: z.string(),
      versionLevel: z.string(),
      bomItemIds: z.array(z.string().min(1)),
      standardUsage: finiteQuantity,
      requiredQty: finiteQuantity,
    })
  ),
  hasBOM: z.boolean(),
  packaging: z
    .object({
      packUnit: z.string(),
      factor: z.number().finite().positive(),
      packQty: z.number().int().nonnegative(),
      direction: z.enum(['forward', 'reverse']),
    })
    .optional(),
})

export const mrpRequirementStatsSchema = z.object({
  totalMaterials: z.number().int().nonnegative(),
  missingBOMCount: z.number().int().nonnegative(),
  activeOrderCount: z.number().int().nonnegative(),
  analyzedModels: z.array(
    z.object({ modelName: z.string(), totalQty: z.number().finite() })
  ),
})

export const productionMaterialRequirementAnalysisResponseSchema = z.object({
  requirements: z.array(materialRequirementSchema),
  stats: mrpRequirementStatsSchema,
  sourceLines: z.array(productionMaterialRequirementSourceLineSchema),
  isComplete: z.boolean(),
  warehouseCategoryCode: z.literal('MATERIAL'),
})

export type ProductionMaterialRequirementAnalysisResponse = z.infer<
  typeof productionMaterialRequirementAnalysisResponseSchema
>
