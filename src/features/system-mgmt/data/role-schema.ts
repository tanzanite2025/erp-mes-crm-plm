import { z } from 'zod'

export const roleSchema = z.object({
  id: z.string(),
  label: z.string(),
  color: z.string().optional(),
  permissions: z.array(z.string()).default([]),
})

export type Role = z.infer<typeof roleSchema>

export const roleListSchema = z.array(roleSchema)
