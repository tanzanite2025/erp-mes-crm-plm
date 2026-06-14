import { z } from 'zod'

export interface OrgNode {
  id?: string
  name: string
  parentId?: string
  manager?: string
  description?: string
  children?: OrgNode[]
  type: 'company' | 'department' | 'team'
  linkedArchitecture?: Array<{
    type: 'line' | 'segment'
    id: string
    name: string
  }>
  version: number
}

export const orgNodeSchema: z.ZodType<OrgNode> = z.lazy(() =>
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
