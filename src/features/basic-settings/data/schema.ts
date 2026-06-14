import { z } from 'zod'

export const numberingRuleSchema = z.object({
  id: z.string().optional(),
  ruleKey: z.string().min(1, 'Rule key is required'),
  prefix: z.string().optional(),
  pattern: z.string().min(1, 'Pattern is required and must include {SEQ}'),
  currentSeq: z.number().default(0),
  padding: z.number().min(1).max(10).default(4),
  resetPeriod: z.enum(['MONTHLY', 'YEARLY', 'NEVER']).default('MONTHLY'),
  lastReset: z.string().optional(),
})

export type NumberingRule = z.infer<typeof numberingRuleSchema>
