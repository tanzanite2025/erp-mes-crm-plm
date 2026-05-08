import { z } from 'zod'

const standardTypeSchema = z.union([
  z.enum(['IQC', 'IPQC', 'FQC']),
  z.enum(['品检', '巡检', '首检']),
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

const formulaStatusSchema = z.union([
  z.enum(['NORMAL', 'DISABLED']),
  z.enum(['正常', '停用']),
])

export const levelConfigSchema = z.object({
  level: z.enum(['A', 'B', 'C', 'S']),
  tolerance: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  errorCodeLower: z.string().optional(),
  errorCodeUpper: z.string().optional(),
})

export type LevelConfig = z.infer<typeof levelConfigSchema>

export const standardItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, '请输入检验项目'),
  order: z.number().int().default(1),
  centerValue: z.number().optional(),
  levels: z.array(levelConfigSchema),
  formula: z.string().optional(),
  unit: z.string().optional(),
  isRequired: z.boolean().default(true),
  remarks: z.string().optional(),
})

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
  expiresAt: z.string().optional(),
  module: z.string(),
  action: z.string(),
  createdAt: z.string(),
  verifierId: z.string().optional(),
})

export type ApprovalRequestSummary = z.infer<typeof approvalRequestSummarySchema>

export const standardSchema = z.object({
  id: z.string(),
  code: z.string().min(1, '请输入标准编码'),
  version: z.number().default(1),
  name: z.string().min(1, '请输入标准名称'),
  type: standardTypeSchema.default('IQC'),
  status: standardStatusSchema.default('DRAFT'),
  auditor: z.string().optional(),
  auditTime: z.string().optional(),
  reviewComment: z.string().optional(),
  rejectReason: z.string().optional(),
  publishedBy: z.string().optional(),
  publishedAt: z.string().optional(),
  archiveReason: z.string().optional(),
  archivedBy: z.string().optional(),
  archivedAt: z.string().optional(),
  operator: z.string().optional(),
  operateTime: z.string().optional(),
  remarks: z.string().optional(),
  approvalRequestSummary: approvalRequestSummarySchema.optional(),
  items: z.array(standardItemSchema).default([]),
})

export const inspectionFormulaSchema = z.object({
  id: z.string(),
  name: z.string().min(1, '请输入公式名称'),
  formula: z.string().min(1, '请输入计算逻辑'),
  status: formulaStatusSchema.default('NORMAL'),
  operator: z.string().optional(),
  operateTime: z.string().optional(),
  remarks: z.string().optional(),
})

export type InspectionFormula = z.infer<typeof inspectionFormulaSchema>
export type Standard = z.infer<typeof standardSchema>
