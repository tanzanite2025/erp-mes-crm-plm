import { z } from 'zod'
import { getBusinessEventStatusDerivedLabel } from './business-event-status-contract'
import { type BusinessEventSource } from './business-event-source-types'
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
  sourceCode: z.string().default(''),
  actionCode: z.string().default(''),
  statusCodes: z.array(z.string()).default([]),
  createdAt: z.string(),
})

export type StandardCommand = z.infer<typeof StandardCommandSchema>

export interface StandardCommandContext {
  sourceCode?: string
  actionCode?: string
  statusCode?: string
}

export interface StandardCommandContextGuard {
  tone: 'match' | 'warning' | 'blocking'
  reasons: string[]
}

export function getStandardCommandDisplayTitle(
  command: Pick<StandardCommand, 'sourceCode' | 'actionCode' | 'statusCodes'>,
  sources: Pick<BusinessEventSource, 'code' | 'name' | 'config'>[] = []
) {
  const matchedSource = sources.find((source) => source.code === command.sourceCode)
  const sourceLabel = matchedSource?.name || command.sourceCode || '全部业务事件源'
  const actionLabel = command.actionCode
    ? matchedSource?.config.actions.find((action) => action.code === command.actionCode)?.name ||
      command.actionCode
    : '全部动作'
  const statusLabel =
    command.statusCodes.length > 0
      ? command.statusCodes
          .map((statusCode) =>
            getBusinessEventStatusDerivedLabel(command.sourceCode || matchedSource?.code, {
              code: statusCode,
            })
          )
          .join(' / ')
      : '全部状态'

  return `${sourceLabel} · ${actionLabel} · ${statusLabel}`
}

export function getStandardCommandScopeSummary(command: Pick<StandardCommand, 'sourceCode' | 'actionCode' | 'statusCodes'>) {
  const sourceLabel = command.sourceCode || '全部业务源'
  const actionLabel = command.actionCode || '全部动作'
  const statusLabel = command.statusCodes.length > 0 ? command.statusCodes.join(' / ') : '全部状态'
  return `${sourceLabel} · ${actionLabel} · ${statusLabel}`
}

export function getStandardCommandContextCategory(
  command: Pick<StandardCommand, 'sourceCode' | 'actionCode' | 'statusCodes'>,
  context: StandardCommandContext
) {
  const guard = getStandardCommandContextGuard(command, context)
  if (guard.tone === 'blocking') {
    return 'other' as const
  }

  const scoped =
    Boolean(command.sourceCode) ||
    Boolean(command.actionCode) ||
    command.statusCodes.length > 0

  return scoped ? ('recommended' as const) : ('global' as const)
}

export function getStandardCommandContextGuard(
  command: Pick<StandardCommand, 'sourceCode' | 'actionCode' | 'statusCodes'>,
  context: StandardCommandContext
): StandardCommandContextGuard {
  const reasons: string[] = []

  if (command.sourceCode && context.sourceCode && command.sourceCode !== context.sourceCode) {
    reasons.push(`模板业务源限定为 ${command.sourceCode}`)
  }
  if (command.actionCode && context.actionCode && command.actionCode !== context.actionCode) {
    reasons.push(`模板动作限定为 ${command.actionCode}`)
  }
  if (
    command.statusCodes.length > 0 &&
    context.statusCode &&
    !command.statusCodes.includes(context.statusCode)
  ) {
    reasons.push(`模板状态限定为 ${command.statusCodes.join(' / ')}`)
  }

  if (reasons.length > 0) {
    return { tone: 'blocking', reasons }
  }

  const scopedFieldCount = [
    Boolean(command.sourceCode),
    Boolean(command.actionCode),
    command.statusCodes.length > 0,
  ].filter(Boolean).length

  if (scopedFieldCount === 0) {
    return { tone: 'match', reasons: [] }
  }

  if (scopedFieldCount === 3) {
    return { tone: 'match', reasons: [] }
  }

  return {
    tone: 'warning',
    reasons: ['模板范围与当前状态兼容，但仍覆盖更宽的业务上下文'],
  }
}

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
