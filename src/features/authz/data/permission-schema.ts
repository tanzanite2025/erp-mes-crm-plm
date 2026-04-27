import { z } from 'zod'

export const permissionSchema = z.object({
  id: z.string(),
  label: z.string(),
  desc: z.string(),
  category: z.enum(['action', 'menu', 'page', 'tab']).default('action'),
  parentId: z.string().optional(),
  path: z.string().optional(),
})

export type Permission = z.infer<typeof permissionSchema>
