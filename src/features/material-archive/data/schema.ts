import { z } from 'zod'

export const masterDataControlSchema = z.object({
  revisionNo: z.string().optional(),
  effectiveFrom: z.string().nullable().optional(),
  effectiveTo: z.string().nullable().optional(),
  changeType: z.enum(['MANUAL', 'ECO', 'ECN']).optional(),
  changeOrderNo: z.string().optional(),
  siteCode: z.string().optional(),
  isDefaultSite: z.boolean().optional(),
})

export const materialCategorySchema = z.string().min(1, 'Material category is required')

export type MaterialCategory = string

export const materialCategoryLabels: Record<string, string> = {
  RAW_MATERIAL: 'Raw Material',
  PACKAGING: 'Packaging',
  AUXILIARY: 'Auxiliary',
  CONSUMABLE: 'Consumable',
  CHEMICAL: 'Chemical',
}

export const dimensionsSchema = z.object({
  length: z.number().min(0).default(0),
  width: z.number().min(0).default(0),
  height: z.number().min(0).default(0),
  unit: z.string().default('mm'),
})

export type MaterialDimensions = z.infer<typeof dimensionsSchema>

export const materialOptionSchema = z.object({
  id: z.string(),
  code: z.string().min(1, 'Material code is required'),
  name: z.string().min(1, 'Material name is required'),
  category: materialCategorySchema,
  spec: z.string().optional(),
  uom: z.string().min(1, 'Unit is required').default('pcs'),
  status: z.enum(['Active', 'Inactive', 'Archived']).default('Active'),
  costPrice: z.number().min(0).optional(),
})

export type MaterialOption = z.infer<typeof materialOptionSchema>

export const materialSchema = z.object({
  id: z.string(),
  code: z.string().min(1, 'Material code is required'),
  name: z.string().min(1, 'Material name is required'),
  category: materialCategorySchema,
  spec: z.string().optional(),
  internalDimensions: dimensionsSchema.optional(),
  externalDimensions: dimensionsSchema.optional(),
  uom: z.string().min(1, 'Unit is required').default('pcs'),
  minStock: z.number().min(0).default(0),
  costPrice: z.number().min(0).optional(),
  supplierId: z.string().optional(),
  description: z.string().optional(),
  images: z.array(z.string()).optional(),
  status: z.enum(['Active', 'Inactive', 'Archived']).default('Active'),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().default(1),
}).extend(masterDataControlSchema.shape)

export type Material = z.infer<typeof materialSchema>

export interface MaterialListItem extends Material {
  supplierName?: string
}

export const packagingRuleSchema = z.object({
  id: z.string(),
  materialId: z.string(),
  packUnit: z.string(),
  baseUnit: z.string(),
  conversionFactor: z.number(),
  direction: z.enum(['forward', 'reverse']).default('forward'),
  updatedAt: z.string(),
})

export type PackagingRule = z.infer<typeof packagingRuleSchema>
