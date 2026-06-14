import { z } from 'zod'

export const orgNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'orgPersonnel.org.dialog.nameRequired'),
    parentId: z.string().optional(),
    manager: z.string().optional(),
    description: z.string().optional(),
    children: z.array(orgNodeSchema).optional(),
    type: z.enum(['company', 'department', 'team']).default('department'),
    linkedArchitecture: z
      .array(
        z.object({
          type: z.enum(['line', 'segment']),
          id: z.string(),
          name: z.string(),
        })
      )
      .optional(),
    version: z.number().default(1),
  })
)

export type OrgNode = z.infer<typeof orgNodeSchema>
