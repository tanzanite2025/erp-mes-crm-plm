import { z } from 'zod'
import {
  ENGINEERING_DATE_PROTOCOL_VALIDATION_MESSAGE,
  ENGINEERING_OPTIONAL_DATE_PROTOCOL_REGEX,
} from '@/lib/codecs/code-normalization'

const optionalControlDateSchema = z
  .string()
  .trim()
  .regex(ENGINEERING_OPTIONAL_DATE_PROTOCOL_REGEX, ENGINEERING_DATE_PROTOCOL_VALIDATION_MESSAGE)
  .nullable()
  .optional()

export const masterDataControlSchema = z.object({
  revisionNo: z.string().optional(),
  effectiveFrom: optionalControlDateSchema,
  effectiveTo: optionalControlDateSchema,
  changeType: z.enum(['MANUAL', 'ECO', 'ECN']).optional(),
  changeOrderNo: z.string().optional(),
  siteCode: z.string().optional(),
  isDefaultSite: z.boolean().optional(),
})

export const barcodeConfigSchema = z.object({
  modelCode: z.string().regex(/^\d{2}$/, 'Model code must be 2 digits').default('01'),
  appearanceCode: z.string().length(1, 'Appearance code must be 1 character').default('1'),
  category: z.enum(['R', 'D']).default('R'),
  holes: z.number().min(8).max(36).default(24),
  isDrainHole: z.boolean().default(false),
  wheelType: z.enum(['F', 'R', 'H']).default('H'),
  scopeCode: z.string().default(''),
  suffix: z.string().optional().default(''),
  serialNumber: z.string().length(5, 'Serial number must be 5 characters').default('00001'),
})

export type BarcodeConfig = z.infer<typeof barcodeConfigSchema>

export const productSchema = z.object({
  id: z.string(),
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Product name is required'),
  modelCode: z.string().regex(/^\d{2}$/, 'Model code must be 2 digits').default('01'),
  typeId: z.string().min(1, 'Product type is required'),
  depth: z.number().optional(),
  widthInternal: z.number().optional(),
  widthExternal: z.number().optional(),
  maxTirePressure: z.number().optional(),
  weight: z.number().optional(),
  length: z.number().optional(),
  angle: z.number().optional(),
  clamp: z.string().optional(),
  offset: z.number().optional(),
  axleCrown: z.number().optional(),
  steerer: z.string().optional(),
  image: z.string().optional(),
  restrictions: z.array(z.string()).default([]),
  moldGroup: z.string().optional(),
  description: z.string().optional(),
  engineeringSpecId: z.string().optional(),
  attributeValues: z.array(z.object({
    id: z.string().optional(),
    productId: z.string().optional(),
    categoryKey: z.string().min(1, 'Category key is required'),
    optionValue: z.string().min(1, 'Option value is required'),
    sortOrder: z.number().default(0),
    version: z.number().default(1),
  })).default([]),
  techSpecs: z.any().optional(),
  barcodeConfig: barcodeConfigSchema.optional(),
  attachments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    url: z.string(),
    type: z.string(),
    size: z.number(),
    createdAt: z.string(),
  })).default([]),
  status: z.enum(['Active', 'Draft', 'Archived']).default('Active'),
  ownerType: z.enum(['INTERNAL', 'CUSTOMER']).default('INTERNAL'),
  ownerCustomerId: z.string().optional(),
  templateKey: z.string().optional(),
  resolvedTemplateId: z.string().optional(),
  resolvedTemplateKey: z.string().optional(),
  templateResolutionSource: z.string().optional(),
  templateResolutionError: z.string().optional(),
  createdAt: z.string(),
  version: z.number().default(1),
  masterDataControl: masterDataControlSchema.optional(),
})

export type Product = z.infer<typeof productSchema>

export const productDraftSchema = productSchema.extend({
  sku: z.string().default(''),
})

export const productTemplateAttributeBindingSchema = z.object({
  id: z.string().optional(),
  templateId: z.string().optional(),
  categoryKey: z.string().min(1, 'Category key is required'),
  sortOrder: z.number().default(0),
  required: z.boolean().default(false),
  active: z.boolean().default(true),
  version: z.number().default(1),
})

export type ProductTemplateAttributeBinding = z.infer<typeof productTemplateAttributeBindingSchema>

export const productTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Template name is required'),
  code: z.string().min(1, 'Template code is required'),
  componentKey: z.enum(['RIM', 'STEM', 'FORK', 'GENERAL']).default('GENERAL'),
  description: z.string().optional(),
  active: z.boolean().default(true),
  attributeBindings: z.array(productTemplateAttributeBindingSchema).default([]),
  createdAt: z.string(),
  version: z.number().default(1),
  masterDataControl: masterDataControlSchema.optional(),
})

export type ProductTemplate = z.infer<typeof productTemplateSchema>

export const productTypeSchema = z.object({
  id: z.string(),
  parentId: z.string().optional(),
  name: z.string().min(1, 'Type name is required'),
  code: z.string().min(1, 'Type code is required'),
  templateId: z.string().optional(),
  description: z.string().optional(),
  active: z.boolean().default(true),
  sortOrder: z.number().default(0),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  version: z.number().default(1),
})

export type ProductType = z.infer<typeof productTypeSchema>

export const productAttributeValueSchema = z.object({
  id: z.string().optional(),
  productId: z.string().optional(),
  categoryKey: z.string().min(1, 'Category key is required'),
  optionValue: z.string().min(1, 'Option value is required'),
  sortOrder: z.number().default(0),
  version: z.number().default(1),
})

export type ProductAttributeValue = z.infer<typeof productAttributeValueSchema>

export const productAttributeCategorySchema = z.object({
  id: z.string(),
  key: z.string().min(1, 'Category key is required'),
  nameZh: z.string().min(1, 'Chinese category name is required'),
  nameEn: z.string().optional(),
  description: z.string().optional(),
  sortOrder: z.number().default(0),
  active: z.boolean().default(true),
  revisionNo: z.string().optional(),
  effectiveFrom: z.string().nullable().optional(),
  effectiveTo: z.string().nullable().optional(),
  changeType: z.enum(['MANUAL', 'ECO', 'ECN']).optional(),
  changeOrderNo: z.string().optional(),
  siteCode: z.string().optional(),
  isDefaultSite: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  version: z.number().default(1),
})

export type ProductAttributeCategory = z.infer<typeof productAttributeCategorySchema>

export const productAttributeOptionSchema = z.object({
  id: z.string(),
  categoryKey: z.string().min(1, 'Category key is required'),
  value: z.string().min(1, 'Value is required'),
  labelZh: z.string().min(1, 'Chinese label is required'),
  labelEn: z.string().optional(),
  description: z.string().optional(),
  sortOrder: z.number().default(0),
  active: z.boolean().default(true),
  revisionNo: z.string().optional(),
  effectiveFrom: z.string().nullable().optional(),
  effectiveTo: z.string().nullable().optional(),
  changeType: z.enum(['MANUAL', 'ECO', 'ECN']).optional(),
  changeOrderNo: z.string().optional(),
  siteCode: z.string().optional(),
  isDefaultSite: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  version: z.number().default(1),
})

export type ProductAttributeOption = z.infer<typeof productAttributeOptionSchema>
