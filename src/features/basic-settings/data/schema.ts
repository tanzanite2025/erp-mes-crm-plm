import { z } from 'zod'

/**
 * 字典组模型 (对应 TAB 栏)
 */
export const dictionaryGroupSchema = z.object({
    id: z.string(),
    name: z.string().min(1, '请输入分组名称'),
    code: z.string().min(1, '请输入分组编码'),
    description: z.string().optional(),
    active: z.boolean().default(true),
    isSystem: z.boolean().default(false), // 是否为系统内置，内置不可删除
    createdAt: z.string(),
})

export type DictionaryGroup = z.infer<typeof dictionaryGroupSchema>

/**
 * 字典项选项结构 (键值对)
 */
export const dictionaryOptionSchema = z.object({
    label: z.string().min(1, '显示名称不能为空'), // 中文显示名
    value: z.string().min(1, '键值/代码不能为空'), // 英文代码值
    ext: z.string().optional(), // 扩展字段 (用于存储业务简码等)
})

export type DictionaryOption = z.infer<typeof dictionaryOptionSchema>

/**
 * 字典项模型 (对应列表内容)
 */
export const dictionaryEntrySchema = z.object({
    id: z.string(),
    groupId: z.string(),
    label: z.string().min(1, '请输入属性名称'),
    code: z.string().optional(), // 属性唯一编码
    description: z.string().optional(),
    options: z.array(z.union([z.string(), dictionaryOptionSchema])).default([]), // 支持旧字符串和新对象
    sortOrder: z.number().default(0),
    active: z.boolean().default(true),
    isSystem: z.boolean().default(false), // 是否为系统内置
    createdAt: z.string(),
})

export type DictionaryEntry = z.infer<typeof dictionaryEntrySchema>

/**
 * 业务编号规则模型
 */
export const numberingRuleSchema = z.object({
    id: z.string().optional(),
    ruleKey: z.string().min(1, '请输入规则唯一键'),
    prefix: z.string().optional(),
    pattern: z.string().min(1, '请输入生成模式 (必须包含 {SEQ})'),
    currentSeq: z.number().default(0),
    padding: z.number().min(1).max(10).default(4),
    resetPeriod: z.enum(['MONTHLY', 'YEARLY', 'NEVER']).default('MONTHLY'),
    lastReset: z.string().optional(),
})

export type NumberingRule = z.infer<typeof numberingRuleSchema>
