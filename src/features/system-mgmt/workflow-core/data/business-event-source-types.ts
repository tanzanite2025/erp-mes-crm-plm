import { z } from 'zod'

export const businessConfigItemBaseSchema = z.object({
  id: z.string().optional(),
  order: z.number().int().nonnegative().optional(),
})

export const businessEventActionSchema = businessConfigItemBaseSchema.extend({
  code: z.string().min(1),
  name: z.string().min(1),
  kind: z
    .enum(['created', 'updated', 'deleted', 'status', 'custom'])
    .default('custom'),
})

export const businessStatusSchema = businessConfigItemBaseSchema.extend({
  code: z.string().min(1),
})

export const businessEventFieldSchema = businessConfigItemBaseSchema.extend({
  key: z.string().min(1),
  label: z.string().min(1),
  path: z.string().min(1),
  type: z
    .enum(['string', 'number', 'date', 'user', 'boolean', 'object'])
    .default('string'),
  templateKey: z.string().optional(),
  templateEnabled: z.boolean().default(false),
  dynamicResolver: z.boolean().default(false),
})

export const businessDynamicResolverSchema =
  businessConfigItemBaseSchema.extend({
    code: z.string().min(1),
    label: z.string().min(1),
    path: z.string().min(1),
    type: z.enum(['user', 'group', 'permission']).default('user'),
  })

export const businessEventSourceConfigSchema = z.object({
  actions: z.array(businessEventActionSchema).default([]),
  statuses: z.array(businessStatusSchema).default([]),
  fields: z.array(businessEventFieldSchema).default([]),
  dynamicResolvers: z.array(businessDynamicResolverSchema).default([]),
  defaultActionUrlTemplate: z.string().optional(),
})

const emptyBusinessEventSourceConfig = {
  actions: [],
  statuses: [],
  fields: [],
  dynamicResolvers: [],
}

export const businessEventSourceSchema = z.object({
  id: z.string(),
  code: z.string().min(1),
  name: z.string().min(1),
  module: z.string().default('System'),
  entity: z
    .enum(['ORDER', 'BOM', 'PRODUCT', 'MOLD', 'SYSTEM', 'QUALITY'])
    .default('SYSTEM'),
  enabled: z.boolean().default(true),
  description: z.string().optional(),
  config: businessEventSourceConfigSchema.default(
    emptyBusinessEventSourceConfig
  ),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export const businessEventSourceTemplateMetaSchema = z.object({
  /**
   * 运行时覆盖度。决定卡片上的徽章和 fallback 默认开启/关闭。
   * - connected：已接入实时执行链
   * - preconnected：技术入口已准备，等业务模块确认
   * - template-only：仅模板预置，业务尚未接入
   */
  runtimeCoverage: z
    .enum(['connected', 'preconnected', 'template-only'])
    .default('template-only'),
  /**
   * 实时入口对应的 NotificationType。
   * 仅 connected 和 preconnected 必须有值；template-only 可以省略。
   */
  notificationType: z
    .enum([
      'ORDER_EVENT',
      'QUALITY_STANDARD_EVENT',
      'BOM_EVENT',
      'QUALITY_ALERT',
      'EQUIPMENT_STATUS',
      'SYSTEM_NOTICE',
      'TASK_ASSIGNED',
    ])
    .optional(),
  /**
   * 该事件源是否始终强制使用 STATUS_CHANGED 作为 actionCode。
   * 用于 normalize 阶段把 sourceCode 已确定但 actionCode 缺失的规则补回来。
   */
  forceStatusChangedAction: z.boolean().default(false),
  /**
   * 后端取不到事件源时是否作为前端 fallback 使用模板兜底。
   * 默认仅 connected / preconnected 的事件源做 fallback。
   */
  seedAsFallback: z.boolean().default(false),
})

export type BusinessEventSourceTemplateMeta = z.infer<
  typeof businessEventSourceTemplateMetaSchema
>

const DEFAULT_TEMPLATE_META: BusinessEventSourceTemplateMeta = {
  runtimeCoverage: 'template-only',
  forceStatusChangedAction: false,
  seedAsFallback: false,
}

export const businessEventSourceTemplateSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  module: z.string().default('System'),
  entity: z
    .enum(['ORDER', 'BOM', 'PRODUCT', 'MOLD', 'SYSTEM', 'QUALITY'])
    .default('SYSTEM'),
  enabled: z.boolean().default(true),
  description: z.string().optional(),
  config: businessEventSourceConfigSchema.default(
    emptyBusinessEventSourceConfig
  ),
  /**
   * 运行时元信息 - 让模板成为单一注册点，避免横向多处同步。
   * 详见 BusinessEventSourceTemplateMeta。
   */
  meta: businessEventSourceTemplateMetaSchema.default(DEFAULT_TEMPLATE_META),
})

export type BusinessEventAction = z.infer<typeof businessEventActionSchema>
export type BusinessStatus = z.infer<typeof businessStatusSchema>
export type BusinessEventField = z.infer<typeof businessEventFieldSchema>
export type BusinessDynamicResolver = z.infer<
  typeof businessDynamicResolverSchema
>
export type BusinessConfigItemBase = z.infer<
  typeof businessConfigItemBaseSchema
>
export type BusinessEventSourceConfig = z.infer<
  typeof businessEventSourceConfigSchema
>
export type BusinessEventSource = z.infer<typeof businessEventSourceSchema>
export type BusinessEventSourceTemplate = z.infer<
  typeof businessEventSourceTemplateSchema
>

export const businessEventSourceCreateSchema =
  businessEventSourceTemplateSchema.omit({ meta: true })
export const businessEventSourceUpdateSchema =
  businessEventSourceTemplateSchema.omit({ meta: true })

export type BusinessEventSourceCreatePayload = z.infer<
  typeof businessEventSourceCreateSchema
>
export type BusinessEventSourceUpdatePayload = z.infer<
  typeof businessEventSourceUpdateSchema
>

export const EMPTY_BUSINESS_EVENT_SOURCE_CONFIG: BusinessEventSourceConfig = {
  actions: [],
  statuses: [],
  fields: [],
  dynamicResolvers: [],
  defaultActionUrlTemplate: '',
}
