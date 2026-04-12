import { z } from 'zod'
import { dimensionsSchema, materialCategorySchema } from '../data/schema'

const optionalControlDateSchema = z.string().nullable().optional()

export const materialChangeTypeApiDTOSchema = z.enum(['MANUAL', 'ECO', 'ECN'])
export const materialStatusApiDTOSchema = z.enum(['Active', 'Inactive', 'Archived'])

export const materialDimensionsApiDTOSchema = dimensionsSchema

export const materialApiDTOSchema = z.object({
  id: z.string(),
  code: z.string().min(1),
  name: z.string().min(1),
  category: materialCategorySchema,
  spec: z.string().optional(),
  internalDimensions: materialDimensionsApiDTOSchema.nullable().optional(),
  externalDimensions: materialDimensionsApiDTOSchema.nullable().optional(),
  uom: z.string().min(1),
  minStock: z.number(),
  costPrice: z.number().optional(),
  supplierId: z.string().optional(),
  description: z.string().optional(),
  images: z.array(z.string()).optional(),
  status: materialStatusApiDTOSchema,
  revisionNo: z.string().optional(),
  effectiveFrom: optionalControlDateSchema,
  effectiveTo: optionalControlDateSchema,
  changeType: materialChangeTypeApiDTOSchema.optional(),
  changeOrderNo: z.string().optional(),
  siteCode: z.string().optional(),
  isDefaultSite: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  version: z.number().optional(),
})

export const materialApiDTOArraySchema = z.array(materialApiDTOSchema)

export const materialOptionApiDTOSchema = z.object({
  id: z.string(),
  code: z.string().min(1),
  name: z.string().min(1),
  spec: z.string().optional(),
  uom: z.string().optional(),
  category: materialCategorySchema.optional(),
  status: materialStatusApiDTOSchema.optional(),
  costPrice: z.number().optional(),
})

export const materialOptionsResponseApiDTOSchema = z.object({
  items: z.array(materialOptionApiDTOSchema),
  version: z.string(),
})

export const materialListPageApiDTOSchema = z.object({
  items: materialApiDTOArraySchema,
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  version: z.string(),
})

export const saveMaterialApiDTOSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1),
  name: z.string().min(1),
  category: materialCategorySchema,
  spec: z.string().optional(),
  internalDimensions: materialDimensionsApiDTOSchema.optional(),
  externalDimensions: materialDimensionsApiDTOSchema.optional(),
  uom: z.string().min(1),
  minStock: z.number(),
  costPrice: z.number().optional(),
  supplierId: z.string().optional(),
  description: z.string().optional(),
  images: z.array(z.string()).optional(),
  status: materialStatusApiDTOSchema,
  revisionNo: z.string().optional(),
  effectiveFrom: optionalControlDateSchema,
  effectiveTo: optionalControlDateSchema,
  changeType: materialChangeTypeApiDTOSchema.optional(),
  changeOrderNo: z.string().optional(),
  siteCode: z.string().optional(),
  isDefaultSite: z.boolean().optional(),
  version: z.number().optional(),
})

export const bulkSyncMaterialsApiDTOSchema = z.object({
  materials: z.array(saveMaterialApiDTOSchema),
  globalVersion: z.number().optional(),
})

export type MaterialApiDTO = z.infer<typeof materialApiDTOSchema>
export type MaterialOptionApiDTO = z.infer<typeof materialOptionApiDTOSchema>
export type MaterialOptionsResponseApiDTO = z.infer<typeof materialOptionsResponseApiDTOSchema>
export type MaterialListPageApiDTO = z.infer<typeof materialListPageApiDTOSchema>
export type SaveMaterialApiDTO = z.infer<typeof saveMaterialApiDTOSchema>
export type BulkSyncMaterialsApiDTO = z.infer<typeof bulkSyncMaterialsApiDTOSchema>
