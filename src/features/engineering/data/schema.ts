import { z } from 'zod'

const optionalControlDateSchema = z
  .string()
  .trim()
  .regex(/^$|^\d{4}-\d{2}-\d{2}$/, 'Date must follow YYYY-MM-DD format')
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
  templateKey: z.string().optional(),
  resolvedTemplateId: z.string().optional(),
  resolvedTemplateKey: z.string().optional(),
  templateResolutionSource: z.string().optional(),
  templateResolutionError: z.string().optional(),
  createdAt: z.string(),
  version: z.number().default(1),
}).extend(masterDataControlSchema.shape)

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
}).extend(masterDataControlSchema.shape)

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

export const productTypeAttributeBindingSchema = z.object({
  id: z.string(),
  productTypeId: z.string().min(1, 'Product type is required'),
  categoryKey: z.string().min(1, 'Category key is required'),
  sortOrder: z.number().default(0),
  required: z.boolean().default(false),
  active: z.boolean().default(true),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  version: z.number().default(1),
})

export type ProductTypeAttributeBinding = z.infer<typeof productTypeAttributeBindingSchema>

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

export const changeOrderSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Change order title is required'),
  productId: z.string().nullable().optional(),
  status: z.enum(['draft', 'released', 'obsolete']).default('draft'),
  description: z.string().optional(),
  createdAt: z.string(),
  version: z.number().default(1),
}).extend(masterDataControlSchema.shape)

export type ChangeOrder = z.infer<typeof changeOrderSchema>

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
  changeOrderId: z.string().nullable().optional(),
  changeOrder: changeOrderSchema.optional(),
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

export type BOMSubstitute = z.infer<typeof bomSubstituteSchema>
export type BOMItem = z.infer<typeof bomItemSchema>
export type BOM = z.infer<typeof bomSchema>
export type BOMList = z.infer<typeof bomListSchema>

// --- 产品工艺路线 (Product Routing) 模型 ---
export const productProcessRoutingNodeSchema = z.object({
  id: z.string().uuid().optional(),
  sequenceNumber: z.number().int().min(10, '执行顺位比如 10, 20'),
  processStepId: z.string().min(1, '强关联的工厂基础工序配置 ID'),
  processStepName: z.string().min(1, '纯作显示用的工序名'),
  standardTimeValueInSeconds: z.number().nonnegative().default(0),
  requiredJobCategoryTitle: z.string().optional(),
  qualityInspectionRequired: z.boolean().default(false),
  operationInstructionText: z.string().optional(),
})

export const productProcessRoutingSchema = z.object({
  id: z.string().uuid().optional(),
  targetProductId: z.string().min(1, '强关联目标产品 ID'),
  versionControlTag: z.string().default('V1.0'),
  isCurrentlyActiveBlueprint: z.boolean().default(true),
  routeNodes: z.array(productProcessRoutingNodeSchema).default([]),
  engineeringApprovalMemo: z.string().optional(),
  createdAt: z.string().optional(),
  version: z.number().default(1),
})

export type ProductProcessRoutingNode = z.infer<typeof productProcessRoutingNodeSchema>
export type ProductProcessRouting = z.infer<typeof productProcessRoutingSchema>
