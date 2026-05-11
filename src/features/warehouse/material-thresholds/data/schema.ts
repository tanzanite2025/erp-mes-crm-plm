import { z } from 'zod'

const optionalStringSchema = z.string().nullable().optional().transform((value) => value ?? undefined)

export const inventoryThresholdTargetTypeSchema = z.enum(['MATERIAL', 'BOM'])

export const inventoryThresholdRuleSchema = z.object({
  id: z.string(),
  targetType: inventoryThresholdTargetTypeSchema,
  materialId: optionalStringSchema,
  bomId: optionalStringSchema,
  targetNameSnapshot: z.string(),
  targetCodeSnapshot: z.string().default(''),
  thresholdQty: z.number(),
  enabled: z.boolean(),
  notes: z.string().default(''),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const inventoryThresholdRuleListResponseSchema = z.object({
  items: z.array(inventoryThresholdRuleSchema),
})

export const inventoryThresholdMaterialOptionSchema = z.object({
  id: z.string(),
  code: z.string().default(''),
  name: z.string(),
  category: z.string().default(''),
  spec: z.string().default(''),
  uom: z.string().default(''),
  status: z.string().default(''),
})

export const inventoryThresholdBOMOptionSchema = z.object({
  id: z.string(),
  bomNo: z.string().default(''),
  productId: z.string().default(''),
  productName: z.string().default(''),
  productSku: z.string().default(''),
  status: z.string().default(''),
})

export const inventoryThresholdTargetOptionsResponseSchema = z.object({
  materials: z.array(inventoryThresholdMaterialOptionSchema),
  boms: z.array(inventoryThresholdBOMOptionSchema),
})

export const inventoryThresholdRuleWritePayloadSchema = z.object({
  targetType: inventoryThresholdTargetTypeSchema,
  materialId: z.string().optional(),
  bomId: z.string().optional(),
  thresholdQty: z.number().min(0),
  enabled: z.boolean(),
  notes: z.string(),
})

export type InventoryThresholdTargetType = z.infer<typeof inventoryThresholdTargetTypeSchema>
export type InventoryThresholdRule = z.infer<typeof inventoryThresholdRuleSchema>
export type InventoryThresholdMaterialOption = z.infer<typeof inventoryThresholdMaterialOptionSchema>
export type InventoryThresholdBOMOption = z.infer<typeof inventoryThresholdBOMOptionSchema>
export type InventoryThresholdTargetOptionsResponse = z.infer<typeof inventoryThresholdTargetOptionsResponseSchema>
export type InventoryThresholdRuleWritePayload = z.infer<typeof inventoryThresholdRuleWritePayloadSchema>
