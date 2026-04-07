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
  tireType: z.string().optional(),
  brakeType: z.string().optional(),
  techSeries: z.string().optional(),
  versionLevel: z.string().optional(),
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
  createdAt: z.string(),
  version: z.number().default(1),
}).extend(masterDataControlSchema.shape)

export type Product = z.infer<typeof productSchema>

export const productTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Template name is required'),
  code: z.string().min(1, 'Template code is required'),
  componentKey: z.enum(['RIM', 'STEM', 'FORK', 'GENERAL']).default('GENERAL'),
  description: z.string().optional(),
  active: z.boolean().default(true),
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

export const changeOrderSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Change order title is required'),
  productId: z.string().optional(),
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
  bomNo: z.string().min(1, 'BOM number is required'),
  productId: z.string().min(1, 'Product is required'),
  changeOrderId: z.string().optional(),
  changeOrder: changeOrderSchema.optional(),
  bomVersion: z.string().min(1, 'Version is required').default('V1.0'),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  items: z.array(bomItemSchema).default([]),
  description: z.string().optional(),
  createdAt: z.string(),
  version: z.number().default(1),
}).extend(masterDataControlSchema.shape)

export type BOMSubstitute = z.infer<typeof bomSubstituteSchema>
export type BOMItem = z.infer<typeof bomItemSchema>
export type BOM = z.infer<typeof bomSchema>

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
