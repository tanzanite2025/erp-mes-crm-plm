import { z } from 'zod'
import { productionPlanStatuses } from './production-plan-status'

export const workflowNodeStatusSchema = z.enum(['PENDING', 'ACTIVE', 'DONE', 'REJECTED'])
export type WorkflowNodeStatus = z.infer<typeof workflowNodeStatusSchema>

export const workflowNodeTypeSchema = z.enum(['START', 'APPROVAL', 'CHECK', 'PRODUCTION'])
export type WorkflowNodeType = z.infer<typeof workflowNodeTypeSchema>

export const workflowNodeSchema = z.object({
    id: z.string(),
    type: workflowNodeTypeSchema,
    position: z.object({ x: z.number(), y: z.number() }).default({ x: 0, y: 0 }),
    refId: z.string().optional(), // 关联的 ProcessStep.id (仅当 type 为 PRODUCTION 时)
    title: z.string(),
    assigneeRoles: z.array(z.string()).default([]), // 负责岗位或角色名称列表
    assigneeTeamId: z.string().optional(), // 负责团队 (Team ID)
    commands: z.array(z.string()).default([]), // 给该环节下达的指令
    status: workflowNodeStatusSchema.default('PENDING'),
    comment: z.string().optional(), // 处理意见或备注
    completedAt: z.string().optional(),
    completedBy: z.string().optional(),
    triggerConfig: z.object({
        entity: z.enum(['ORDER', 'BOM', 'PRODUCT', 'MOLD', 'SYSTEM']), // 监听对象
        action: z.enum(['CREATED', 'UPDATED', 'DELETED', 'STATUS_CHANGED']), // 监听动作
        targetStatus: z.string().optional() // 特定于 STATUS_CHANGED 的目标值
    }).optional(),
})

export type WorkflowNode = z.infer<typeof workflowNodeSchema>

export const workflowEdgeSchema = z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    sourceHandle: z.string().optional(), // 'approved', 'rejected', 'default'
    targetHandle: z.string().optional(),
})

export type WorkflowEdge = z.infer<typeof workflowEdgeSchema>

export const StandardCommandSchema = z.object({
    id: z.string(),
    actionType: z.enum(['PRINT', 'QC', 'NOTIFY', 'OP', 'CLAIM']), // 打印, 质检, 通知, 普通操作, 认领
    bindType: z.enum(['SECTION', 'ROLE', 'GLOBAL']), // 工段, 角色, 全局
  nodeType: workflowNodeTypeSchema.optional(), // 关联的工作流环节类型
  title: z.string(), // 指令标题/简述
  content: z.string(), // 通知文本模板
  targetLink: z.string().optional(), // 目标跳转链接，如 /trading/orders/[OrderNo]
  params: z.array(z.string()).optional(), // 动态参数如 [OrderNo], [ProductName]
  createdAt: z.string(),
})

export type StandardCommand = z.infer<typeof StandardCommandSchema>

export const productionPlanSchema = z.object({
    id: z.string(),
    orderId: z.string(),
    orderNo: z.string(),
    productId: z.string(),
    productName: z.string(),
    nodes: z.array(workflowNodeSchema),
    edges: z.array(workflowEdgeSchema).default([]), // 新增：流转连线
    currentStepIndex: z.number().default(0),
    status: z.enum(productionPlanStatuses).default('SCHEDULED'),
    createdAt: z.string(),
    updatedAt: z.string(),
})

export type ProductionPlan = z.infer<typeof productionPlanSchema>
