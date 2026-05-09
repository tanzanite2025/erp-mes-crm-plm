import { z } from 'zod'

export const bomSectionConfigSchema = z.object({
  id: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  version: z.number().default(1),
  code: z.string().min(1, 'Section code is required'),
  name: z.string().min(1, 'Section name is required'),
  description: z.string().optional().default(''),
  isSystem: z.boolean().default(false),
  active: z.boolean().default(true),
  sortOrder: z.number().default(0),
  isDefault: z.boolean().default(false),
  legacyNames: z.array(z.string()).default([]),
})

export const bomSectionOptionSchema = z.object({
  value: z.string().min(1, 'Section value is required'),
  label: z.string().min(1, 'Section label is required'),
  code: z.string().min(1, 'Section code is required'),
  name: z.string().min(1, 'Section name is required'),
  active: z.boolean().default(true),
  sortOrder: z.number().default(0),
  isDefault: z.boolean().default(false),
  legacyNames: z.array(z.string()).default([]),
})

export const bomSectionListSchema = z.object({
  items: z.array(bomSectionConfigSchema).default([]),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
})

export type BOMSectionConfig = z.infer<typeof bomSectionConfigSchema>
export type BOMSectionOption = z.infer<typeof bomSectionOptionSchema>
export type BOMSectionList = z.infer<typeof bomSectionListSchema>
