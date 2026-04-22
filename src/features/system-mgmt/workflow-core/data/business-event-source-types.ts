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
  label: z.string().min(1),
  phase: z
    .enum([
      'draft',
      'pending',
      'active',
      'done',
      'cancelled',
      'terminal',
      'custom',
    ])
    .default('custom'),
  isTerminal: z.boolean().default(false),
  defaultResolve: z.boolean().default(false),
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
    type: z.enum(['user', 'role', 'permission']).default('user'),
  })

export const businessEventSourceConfigSchema = z.object({
  actions: z.array(businessEventActionSchema).default([]),
  statuses: z.array(businessStatusSchema).default([]),
  fields: z.array(businessEventFieldSchema).default([]),
  dynamicResolvers: z.array(businessDynamicResolverSchema).default([]),
  defaultActionUrlTemplate: z.string().optional(),
})

export const businessEventSourceSchema = z.object({
  id: z.string(),
  code: z.string().min(1),
  name: z.string().min(1),
  module: z.string().default('System'),
  entity: z
    .enum(['ORDER', 'BOM', 'PRODUCT', 'MOLD', 'SYSTEM'])
    .default('SYSTEM'),
  enabled: z.boolean().default(true),
  description: z.string().optional(),
  config: businessEventSourceConfigSchema.default({}),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export const businessEventSourceTemplateSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  module: z.string().default('System'),
  entity: z
    .enum(['ORDER', 'BOM', 'PRODUCT', 'MOLD', 'SYSTEM'])
    .default('SYSTEM'),
  enabled: z.boolean().default(true),
  description: z.string().optional(),
  config: businessEventSourceConfigSchema.default({}),
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
  businessEventSourceTemplateSchema
export const businessEventSourceUpdateSchema =
  businessEventSourceTemplateSchema

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
