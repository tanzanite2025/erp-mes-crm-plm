import { z } from 'zod'

export const moldGroupMasterRecordSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  description: z.string().default(''),
  active: z.boolean(),
  version: z.number().int().positive(),
  moldCount: z.number().int().nonnegative().default(0),
  productCount: z.number().int().nonnegative().default(0),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export type MoldGroupMasterRecord = z.infer<typeof moldGroupMasterRecordSchema>
export type MoldGroupMasterWriteInput = Pick<
  MoldGroupMasterRecord,
  'name' | 'description' | 'active' | 'version'
>
