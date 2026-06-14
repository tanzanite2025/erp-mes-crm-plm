import { z } from 'zod'
import { getBusinessEventSourceTemplateByCode } from './business-event-source-templates'

const NON_ID_CHAR_PATTERN = /[^a-z0-9]+/g

function slugifyRuleSegmentIdPart(value?: string) {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(NON_ID_CHAR_PATTERN, '-')
    .replace(/^-+|-+$/g, '')
}

function buildLegacyRuleSegmentId(
  index: number,
  segment: Partial<RuleSegment> & {
    targetStatuses?: string[]
    title?: string
  }
) {
  const base = [segment.title, ...(segment.targetStatuses ?? [])]
    .map((part) => slugifyRuleSegmentIdPart(part))
    .filter(Boolean)
    .join('-')

  return `segment-${base || `item-${index + 1}`}-${index + 1}`
}

function normalizeRuleSegmentInput(input: unknown, index: number) {
  if (!input || typeof input !== 'object') {
    return input
  }

  const segment = input as Partial<RuleSegment>
  return {
    ...segment,
    id:
      typeof segment.id === 'string' && segment.id.trim()
        ? segment.id.trim()
        : buildLegacyRuleSegmentId(index, segment),
  }
}

function normalizeNotificationRuleInput(input: unknown) {
  if (!input || typeof input !== 'object') {
    return input
  }

  const rule = input as {
    entity?: string
    sourceCode?: string
    actionCode?: string
    segments?: unknown[]
  }
  const entity = (rule.entity ?? 'ORDER').trim()
  const sourceCode = (rule.sourceCode ?? '').trim()
  const normalizedSourceCode =
    entity === 'ORDER' && (sourceCode === '' || sourceCode === 'ORDER')
      ? 'SALES_ORDER'
      : sourceCode
  const templateMeta =
    getBusinessEventSourceTemplateByCode(normalizedSourceCode)?.meta
  const forceStatusChanged = templateMeta?.forceStatusChangedAction === true

  return {
    ...rule,
    entity,
    sourceCode: normalizedSourceCode,
    actionCode: forceStatusChanged ? 'STATUS_CHANGED' : rule.actionCode?.trim(),
    segments: Array.isArray(rule.segments)
      ? rule.segments.map((segment, index) =>
          normalizeRuleSegmentInput(segment, index)
        )
      : rule.segments,
  }
}

/**
 * 通知规则分支 (Segment/Tab) Schema
 * 每个分支代表规则下的一个特定状态阶段配置
 */
export const RuleSegmentSchema = z.object({
  id: z.string(),
  title: z.string().min(1, '分支名称不能为空'),
  /** 该分支监听的目标状态列表 */
  targetStatuses: z.array(z.string()).default([]),
  /** 分支绑定的指令 ID */
  commandIds: z.array(z.string()).default([]),
  /** 分支接收分组 */
  assigneeGroups: z.array(z.string()).default([]),
  assigneeUsernames: z.array(z.string()).default([]),
  /** 自动归档触发状态 */
  resolveOnStatuses: z.array(z.string()).default(['Done', 'Canceled']),
  /** 动态目标解析器 */
  dynamicTargetField: z.string().nullable().default(null),
  /** 审批动作配置：分支命中后，除通知外是否生成审批申请 */
  approval: z
    .object({
      enabled: z.boolean().default(false),
      module: z.string().default('Trading'),
      action: z.string().default('ORDER_REVIEW'),
      approver1Id: z.string().default(''),
      approver2Id: z.string().default(''),
      dynamicApproverField: z.string().nullable().default(null),
      reasonTemplate: z
        .string()
        .default(
          '业务规则「[RuleName] / [SegmentTitle]」已命中，请审批单据 [OrderNo]。'
        ),
    })
    .optional(),
})

export type RuleSegment = z.infer<typeof RuleSegmentSchema>

/**
 * [V2] 通知规则 Schema
 * 升级为“一实体多分支”架构，通过 segments 支持多 Tab 配置
 */
export const NotificationRuleSchema = z.object({
  id: z.string(),
  name: z.string().min(1, '规则名称不能为空'),
  enabled: z.boolean().default(true),
  entity: z.enum(['ORDER', 'BOM', 'PRODUCT', 'MOLD', 'SYSTEM', 'QUALITY']),
  sourceCode: z.string().default('SALES_ORDER'),
  actionCode: z.string().default('STATUS_CHANGED'),
  /** 业务规则分支列表，每个分支对应一个 Tab */
  segments: z.array(RuleSegmentSchema).default([]),
  createdAt: z.string(),
  version: z.number().default(1),
})

export type NotificationRule = z.infer<typeof NotificationRuleSchema>

export const NotificationRuleWriteSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, '规则名称不能为空'),
  enabled: z.boolean().default(true),
  entity: z.enum(['ORDER', 'BOM', 'PRODUCT', 'MOLD', 'SYSTEM', 'QUALITY']),
  sourceCode: z.string().min(1).default('SALES_ORDER'),
  actionCode: z.string().min(1).default('STATUS_CHANGED'),
  segments: z.array(RuleSegmentSchema).default([]),
  createdAt: z.string().optional(),
  version: z.number().default(1),
})

export type NotificationRuleWritePayload = z.infer<
  typeof NotificationRuleWriteSchema
>

export function deserializeNotificationRule(input: unknown): NotificationRule {
  return NotificationRuleSchema.parse(normalizeNotificationRuleInput(input))
}

export function deserializeNotificationRules(
  input: unknown
): NotificationRule[] {
  return z
    .array(z.unknown())
    .parse(input)
    .map((rule) =>
      NotificationRuleSchema.parse(normalizeNotificationRuleInput(rule))
    )
}

export function serializeNotificationRule(
  rule: NotificationRuleWritePayload
): NotificationRuleWritePayload {
  return NotificationRuleWriteSchema.parse(normalizeNotificationRuleInput(rule))
}

/** 实体选项 (用于 UI 下拉) */
export const ENTITY_OPTIONS = [
  { value: 'ORDER', label: '销售订单 (Order)' },
  { value: 'BOM', label: '物料清单 (BOM)' },
  { value: 'PRODUCT', label: '产品 (Product)' },
  { value: 'MOLD', label: '模具 (Mold)' },
  { value: 'SYSTEM', label: '系统 (System)' },
  { value: 'QUALITY', label: '品质标准 (Quality)' },
] as const

/** 动作选项 (已在 V2 中内聚到 Segment 逻辑或简化) */
export const ACTION_OPTIONS = [
  { value: 'CREATED', label: '新建 (Created)' },
  { value: 'UPDATED', label: '更新 (Updated)' },
  { value: 'DELETED', label: '删除 (Deleted)' },
  { value: 'STATUS_CHANGED', label: '状态变更 (Status Changed)' },
] as const

/** 订单状态选项 */
export const ORDER_STATUS_OPTIONS = [
  { value: 'Draft', label: '草稿 (Draft)' },
  { value: 'Pending', label: '待处理 (Pending)' },
  { value: 'InProgress', label: '正式下达 (InProgress)' },
  { value: 'Done', label: '已完成 (Done)' },
  { value: 'Canceled', label: '已作废 (Canceled)' },
]
