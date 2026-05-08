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
  refId: z.string().optional(),
  title: z.string(),
  assigneeGroups: z.array(z.string()).default([]),
  assigneeTeamId: z.string().optional(),
  commands: z.array(z.string()).default([]),
  status: workflowNodeStatusSchema.default('PENDING'),
  comment: z.string().optional(),
  completedAt: z.string().optional(),
  completedBy: z.string().optional(),
  triggerConfig: z.object({
    entity: z.enum(['ORDER', 'BOM', 'PRODUCT', 'MOLD', 'SYSTEM', 'QUALITY']),
    action: z.enum(['CREATED', 'UPDATED', 'DELETED', 'STATUS_CHANGED']),
    targetStatus: z.string().optional(),
  }).optional(),
})

export type WorkflowNode = z.infer<typeof workflowNodeSchema>

export const workflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
})

export type WorkflowEdge = z.infer<typeof workflowEdgeSchema>

export const StandardCommandSchema = z.object({
  id: z.string(),
  actionType: z.enum(['PRINT', 'QC', 'NOTIFY', 'OP', 'CLAIM']),
  bindType: z.enum(['SECTION', 'GROUP', 'GLOBAL']),
  nodeType: workflowNodeTypeSchema.optional(),
  title: z.string(),
  content: z.string(),
  targetLink: z.string().optional(),
  params: z.array(z.string()).optional(),
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
  edges: z.array(workflowEdgeSchema).default([]),
  currentStepIndex: z.number().default(0),
  status: z.enum(productionPlanStatuses).default('SCHEDULED'),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type ProductionPlan = z.infer<typeof productionPlanSchema>
