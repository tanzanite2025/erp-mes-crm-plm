import { z } from 'zod'

const userStatusSchema = z.union([
  z.literal('active'),
  z.literal('inactive'),
  z.literal('suspended'),
])
export type UserStatus = z.infer<typeof userStatusSchema>

const userRoleSchema = z.string()

const userSchema = z.object({
  id: z.string(),
  employeeId: z.string().optional(),
  firstName: z.string(),
  lastName: z.string(),
  username: z.string(),
  phoneNumber: z.string(),
  status: userStatusSchema,
  role: userRoleSchema,
  password: z.string().optional(), // 移除硬编码默认值
  resolvedRole: z.string().optional(),
  roleInfo: z.object({
    isStale: z.boolean().optional(),
    isInvalid: z.boolean().optional()
  }).passthrough().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type User = z.infer<typeof userSchema>

const userOptionSchema = z.object({
  id: z.string(),
  username: z.string(),
  employeeId: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.string().optional(),
  status: userStatusSchema.optional(),
})
export type UserOption = z.infer<typeof userOptionSchema>

export const userListSchema = z.array(userSchema)

export const userListPageSchema = z.object({
  items: userListSchema,
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
})

export type UserListPage = z.infer<typeof userListPageSchema>

export const userOptionListSchema = z.array(userOptionSchema)
