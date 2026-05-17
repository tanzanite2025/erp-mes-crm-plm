import { z } from 'zod'
import {
  masterDataControlSchema,
  productSchema,
} from '@/features/engineering/data/schema'
import { BOM_STATUS_ORDER } from '@/lib/codecs/code-normalization'

export const bomParentChildrenProtocolBranchDraftSchema = z.object({
  id: z.string().trim().min(1, 'Node ID is required'),
  parentId: z.string().trim().nullable(),
  children: z.array(z.string().trim()).default([]),
  nodeKind: z.literal('branch'),
  branchRole: z.enum(['section', 'collection']).optional(),
  label: z.string().trim().min(1, 'Label is required'),
  sectionCode: z.string().trim().min(1, 'Section Code is required'),
  sectionName: z.string().trim().optional(),
})

export const bomParentChildrenProtocolItemDraftSchema = z.object({
  id: z.string().trim().min(1, 'Node ID is required'),
  parentId: z.string().trim().nullable(),
  children: z.array(z.string().trim()).default([]),
  nodeKind: z.literal('item'),
  sectionCode: z.string().trim().min(1, 'Section Code is required'),
  sectionName: z.string().trim().optional(),
  itemId: z.string().trim().optional(),
})

export const bomParentChildrenProtocolDraftSchema = z.object({
  rootChildren: z.array(z.string().trim()).default([]),
  branchNodes: z.array(bomParentChildrenProtocolBranchDraftSchema).default([]),
  itemNodes: z.array(bomParentChildrenProtocolItemDraftSchema).default([]),
})

export const bomRelationSidecarSchema = z.object({
  kind: z.literal('parent_children_protocol'),
  version: z.literal('v1'),
  protocolDraft: bomParentChildrenProtocolDraftSchema,
})

export const bomItemSchema = z.object({
  id: z.string().trim(),
  section: z.string().trim().min(1, 'Section is required'),
  materialId: z.string().trim().min(1, 'Material is required'),
  materialName: z.string().trim().optional(),
  materialSpec: z.string().trim().optional(),
  unitPrice: z.number().default(0),
  unit: z.string().default('pcs'),
  unitUsage: z.number().min(0, 'Unit usage must be non-negative'),
  wastagePercent: z.number().min(0).max(100).default(3),
  standardUsage: z.number().default(0),
  materialType: z.string().optional(),
  supplyChannel: z.string().optional(),
  sortOrder: z.number().default(0),
})

export const bomSchema = z.object({
  id: z.string(),
  bomNo: z.string().trim().default(''),
  bomType: z.enum(['EBOM', 'MBOM']).default('EBOM'),
  productId: z.string().min(1, 'Product is required'),
  product: productSchema.optional(),
  sourceEbomId: z.string().nullable().optional(),
  bomVersion: z.string().trim().regex(/^V[0-9]+(\.[0-9]+)*$/, 'Version must follow V1.0 format').default('V1.0'),
  status: z.enum(BOM_STATUS_ORDER).default('DRAFT'),
  isLocked: z.boolean().default(false),
  // 归属语义在 BOM 维度（方案 B + 1:1 设计）：
  //   - INTERNAL：内部生产 BOM（ownerCustomerId 留空）
  //   - CUSTOMER：某客户专供 BOM（ownerCustomerId 必填，关联 Customer.id）
  ownerType: z.enum(['INTERNAL', 'CUSTOMER']).default('INTERNAL'),
  ownerCustomerId: z.string().optional(),
  // VersionLevel 是 BOM 配方层的"档次"标签（思路 3 重构,Step R1）。
  //   - 来源 product_attribute_options(category=versionLevel) 的 value
  //   - 当前阶段允许为空(过渡期),后续 Step R6 加唯一约束时变必填
  versionLevel: z.string().trim().optional(),
  // 方案 B：BOM 是产品最终重量的端到端权威源。
  //   - 创建/草稿期允许为 0 / 空字符串（后端校验：仅 RELEASED 必须 > 0 + 单位非空）
  //   - 单位引用 basic-settings 的 WEIGHT 类目代码（g / kg 等）
  measuredWeight: z.number().nonnegative('Measured weight must be non-negative').default(0),
  measuredWeightUnit: z.string().trim().default(''),
  items: z.array(bomItemSchema).default([]),
  description: z.string().optional(),
  relationSidecar: bomRelationSidecarSchema.optional(),
  createdAt: z.string().optional(),
  version: z.number().default(1),
  masterDataControl: masterDataControlSchema.optional(),
})

export const bomListSchema = z.object({
  items: z.array(bomSchema).default([]),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
})

export type Product = z.infer<typeof productSchema>
export type BOMItem = z.infer<typeof bomItemSchema>
export type BOM = z.infer<typeof bomSchema>
export type BOMList = z.infer<typeof bomListSchema>

export type BOMParentChildrenProtocolBranchDraft = z.infer<typeof bomParentChildrenProtocolBranchDraftSchema>
export type BOMParentChildrenProtocolItemDraft = z.infer<typeof bomParentChildrenProtocolItemDraftSchema>
export type BOMParentChildrenProtocolDraft = z.infer<typeof bomParentChildrenProtocolDraftSchema>
export type BOMRelationSidecar = z.infer<typeof bomRelationSidecarSchema>
