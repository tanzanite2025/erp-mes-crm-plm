import { z } from 'zod'
import {
  masterDataControlSchema,
  productSchema,
} from '@/features/engineering/data/schema'

export const bomSubstituteSchema = z.object({
  id: z.string().optional().default(''),
  bomItemId: z.string().optional(),
  materialId: z.string().min(1, 'Substitute material is required'),
  priority: z.number().int().min(1).default(1),
  conversionRate: z.number().positive().default(1),
  notes: z.string().optional(),
})

export const bomItemSchema = z.object({
  id: z.string(),
  section: z.string().min(1, 'Section is required'),
  materialId: z.string().min(1, 'Material is required'),
  materialName: z.string().optional(),
  materialSpec: z.string().optional(),
  unitPrice: z.number().default(0),
  unit: z.string().default('pcs'),
  unitUsage: z.number().min(0, 'Unit usage must be non-negative'),
  wastagePercent: z.number().min(0).max(100).default(3),
  standardUsage: z.number().default(0),
  materialType: z.string().optional(),
  supplyChannel: z.string().optional(),
  substitutes: z.array(bomSubstituteSchema).default([]),
})

export const bomSchema = z.object({
  id: z.string(),
  bomNo: z.string().trim().default(''),
  productId: z.string().min(1, 'Product is required'),
  product: productSchema.optional(),
  bomVersion: z.string().trim().regex(/^V[0-9]+(\.[0-9]+)*$/, 'Version must follow V1.0 format').default('V1.0'),
  bomDisplayVersion: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  items: z.array(bomItemSchema).default([]),
  description: z.string().optional(),
  createdAt: z.string().optional(),
  version: z.number().default(1),
}).extend(masterDataControlSchema.shape)

export const bomListSchema = z.object({
  items: z.array(bomSchema).default([]),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
})

export type Product = z.infer<typeof productSchema>
export type BOMSubstitute = z.infer<typeof bomSubstituteSchema>
export type BOMItem = z.infer<typeof bomItemSchema>
export type BOM = z.infer<typeof bomSchema>
export type BOMList = z.infer<typeof bomListSchema>
