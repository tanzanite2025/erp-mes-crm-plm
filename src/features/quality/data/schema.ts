import { z } from 'zod'

const standardTypeSchema = z.union([
  z.enum(['IQC', 'IPQC', 'FQC', 'OQC']),
  z.enum(['品检', '巡检', '首检', '出货检验']),
])

const standardStatusSchema = z.union([
  z.enum([
    'DRAFT',
    'PENDING_APPROVAL',
    'APPROVED',
    'REJECTED',
    'PUBLISHED',
    'ARCHIVED',
  ]),
  z.enum(['草稿', '待审核', '审批通过', '已驳回', '已发布', '已归档']),
])

export const levelConfigSchema = z
  .object({
    level: z
      .string()
      .trim()
      .min(1)
      .refine((name) => [...name].length <= 40, '等级名称不能超过 40 个字符'),
    lowerTolerance: z.number().finite().nonnegative(),
    upperTolerance: z.number().finite().nonnegative(),
    result: z.enum(['PASS', 'FAIL']),
  })
  .strict()

export type LevelConfig = z.infer<typeof levelConfigSchema>

export const standardItemSchema = z
  .object({
    id: z.string(),
    name: z.string().min(1, '请输入检验项目'),
    inspectionStageId: z.string().min(1),
    inspectionStageName: z.string().min(1),
    order: z.number().int().default(1),
    centerValue: z.number().finite(),
    gradingMode: z.literal('DEVIATION_BANDS'),
    levels: z.array(levelConfigSchema).min(1).max(20),
    unit: z.string().min(1),
    isRequired: z.boolean().default(true),
    remarks: z.string().optional(),
  })
  .strict()

export type StandardItem = z.infer<typeof standardItemSchema>

export const approvalRequestSummarySchema = z.object({
  id: z.string(),
  requesterId: z.string(),
  reason: z.string(),
  approver1Id: z.string().optional(),
  approver2Id: z.string().optional(),
  currentLevel: z.number().int(),
  status: z.enum([
    'PENDING',
    'APPROVED_L1',
    'APPROVED',
    'REJECTED',
    'EXPIRED',
    'CONSUMED',
  ]),
  expiresAt: z.string().nullable().optional(),
  module: z.string(),
  action: z.string(),
  createdAt: z.string(),
  verifierId: z.string().optional(),
})

export type ApprovalRequestSummary = z.infer<
  typeof approvalRequestSummarySchema
>

export const standardSchema = z.object({
  id: z.string(),
  code: z.string().min(1, '请输入标准编码'),
  version: z.number().default(1),
  name: z.string().min(1, '请输入标准名称'),
  productId: z.string().optional(),
  productName: z.string().optional(),
  type: standardTypeSchema.default('IQC'),
  status: standardStatusSchema.default('DRAFT'),
  auditor: z.string().optional(),
  // 后端 *time.Time 字段在 nil 时序列化为 null，必须 nullable + optional
  auditTime: z.string().nullable().optional(),
  reviewComment: z.string().optional(),
  rejectReason: z.string().optional(),
  publishedBy: z.string().optional(),
  publishedAt: z.string().nullable().optional(),
  archiveReason: z.string().optional(),
  archivedBy: z.string().optional(),
  archivedAt: z.string().nullable().optional(),
  operator: z.string().optional(),
  operateTime: z.string().nullable().optional(),
  remarks: z.string().optional(),
  approvalRequestSummary: approvalRequestSummarySchema.optional(),
  items: z.array(standardItemSchema).default([]),
})

export type Standard = z.infer<typeof standardSchema>
