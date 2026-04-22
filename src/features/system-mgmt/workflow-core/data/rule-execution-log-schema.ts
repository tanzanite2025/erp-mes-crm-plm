import { z } from 'zod'

export const ruleExecutionTypeSchema = z.enum([
  'match',
  'notify',
  'approval',
  'workflow',
])
export type RuleExecutionType = z.infer<typeof ruleExecutionTypeSchema>

export const ruleExecutionStatusSchema = z.enum([
  'matched',
  'success',
  'failed',
  'skipped',
])
export type RuleExecutionStatus = z.infer<typeof ruleExecutionStatusSchema>

export const ruleExecutionLogSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  eventKey: z.string().default(''),
  entity: z.string().default(''),
  sourceCode: z.string().default(''),
  actionCode: z.string().default(''),
  statusCode: z.string().default(''),
  ruleId: z.string().default(''),
  ruleName: z.string().default(''),
  segmentId: z.string().default(''),
  segmentTitle: z.string().default(''),
  executionType: ruleExecutionTypeSchema,
  executionStatus: ruleExecutionStatusSchema,
  commandId: z.string().default(''),
  title: z.string().default(''),
  content: z.string().default(''),
  actionUrl: z.string().default(''),
  targets: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
  result: z.unknown().default({}),
  errorMessage: z.string().default(''),
  triggeredAt: z.string(),
})

export type RuleExecutionLog = z.infer<typeof ruleExecutionLogSchema>

export const ruleExecutionLogWriteSchema = z.object({
  eventKey: z.string().optional(),
  entity: z.string().optional(),
  sourceCode: z.string().min(1),
  actionCode: z.string().min(1),
  statusCode: z.string().optional(),
  ruleId: z.string().optional(),
  ruleName: z.string().optional(),
  segmentId: z.string().optional(),
  segmentTitle: z.string().optional(),
  executionType: ruleExecutionTypeSchema,
  executionStatus: ruleExecutionStatusSchema,
  commandId: z.string().optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  actionUrl: z.string().optional(),
  targets: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  result: z.unknown().optional(),
  errorMessage: z.string().optional(),
  triggeredAt: z.string().optional(),
})

export type RuleExecutionLogWritePayload = z.infer<
  typeof ruleExecutionLogWriteSchema
>

export const ruleExecutionLogPageSchema = z.object({
  items: z.array(ruleExecutionLogSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
})

export type RuleExecutionLogPage = z.infer<typeof ruleExecutionLogPageSchema>

export function deserializeRuleExecutionLog(input: unknown): RuleExecutionLog {
  return ruleExecutionLogSchema.parse(input)
}

export function deserializeRuleExecutionLogPage(
  input: unknown
): RuleExecutionLogPage {
  return ruleExecutionLogPageSchema.parse(input)
}

export function serializeRuleExecutionLog(
  payload: RuleExecutionLogWritePayload
): RuleExecutionLogWritePayload {
  return ruleExecutionLogWriteSchema.parse(payload)
}
