import { z } from 'zod'

export const ruleExecutionTypeSchema = z.enum([
  'match',
  'notify',
  'approval',
  'workflow',
])
export type RuleExecutionType = z.infer<typeof ruleExecutionTypeSchema>

export const ruleExecutionStatusSchema = z.enum([
  'pending',
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
