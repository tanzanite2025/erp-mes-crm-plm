import { z } from 'zod'

export const roleSchema = z.object({
    id: z.string(),
    label: z.string(),
    color: z.string().optional().default('bg-blue-500/10 text-blue-600 border-blue-200'),
    permissions: z.array(z.string()),
})

export type Role = z.infer<typeof roleSchema>

export const permissionSchema = z.object({
    id: z.string(),
    label: z.string(),
    desc: z.string(),
    category: z.enum(['action', 'menu', 'page', 'tab']).default('action'),
    parentId: z.string().optional(),
    path: z.string().optional(),
})

export type Permission = z.infer<typeof permissionSchema>
