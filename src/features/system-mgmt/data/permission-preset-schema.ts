import { z } from 'zod'

export const permissionPresetSchema = z.object({
  id: z.string(),
  label: z.string(),
  color: z.string().optional(),
  permissions: z.array(z.string()).default([]),
})

export type PermissionPreset = z.infer<typeof permissionPresetSchema>

export const permissionPresetListSchema = z.array(permissionPresetSchema)
