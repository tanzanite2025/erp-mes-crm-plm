import { z } from 'zod'

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
    /** 分支接收角色 */
    assigneeRoles: z.array(z.string()).default([]),
    /** 自动归档触发状态 */
    resolveOnStatuses: z.array(z.string()).default(['Done', 'Canceled']),
    /** 动态角色解析器 */
    dynamicRoleField: z.enum(['claimedBy', 'createdBy', 'approval.manager']).nullable().default(null),
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
    entity: z.enum(['ORDER', 'BOM', 'PRODUCT', 'MOLD', 'SYSTEM']),
    /** 业务规则分支列表，每个分支对应一个 Tab */
    segments: z.array(RuleSegmentSchema).min(1, '至少需要一个配置分支'),
    createdAt: z.string(),
    version: z.number().default(1),
})

export type NotificationRule = z.infer<typeof NotificationRuleSchema>

/** 实体选项 (用于 UI 下拉) */
export const ENTITY_OPTIONS = [
    { value: 'ORDER', label: '销售订单 (Order)' },
    { value: 'BOM', label: '物料清单 (BOM)' },
    { value: 'PRODUCT', label: '产品 (Product)' },
    { value: 'MOLD', label: '模具 (Mold)' },
    { value: 'SYSTEM', label: '系统 (System)' },
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
