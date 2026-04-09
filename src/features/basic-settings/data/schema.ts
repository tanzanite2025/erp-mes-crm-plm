import { z } from 'zod'

export const dictionaryGroupSchema = z.object({
    id: z.string(),
    name: z.string().min(1, 'Group name is required'),
    code: z.string().min(1, 'Group code is required'),
    description: z.string().optional(),
    active: z.boolean().default(true),
    isSystem: z.boolean().default(false),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
})

export type DictionaryGroup = z.infer<typeof dictionaryGroupSchema>

export const dictionaryOptionSchema = z.object({
    label: z.string().min(1, 'Option label is required'),
    value: z.string().min(1, 'Option value is required'),
    ext: z.string().optional(),
})

export type DictionaryOption = z.infer<typeof dictionaryOptionSchema>

export const dictionaryEntrySchema = z.object({
    id: z.string(),
    groupId: z.string(),
    label: z.string().min(1, 'Entry label is required'),
    code: z.string().optional(),
    description: z.string().optional(),
    options: z.array(z.union([z.string(), dictionaryOptionSchema])).default([]),
    sortOrder: z.number().default(0),
    active: z.boolean().default(true),
    isSystem: z.boolean().default(false),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
})

export type DictionaryEntry = z.infer<typeof dictionaryEntrySchema>

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
