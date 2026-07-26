import { z } from 'zod'

const userStatusSchema = z.union([
  z.literal('active'),
  z.literal('inactive'),
  z.literal('suspended'),
])
export type UserStatus = z.infer<typeof userStatusSchema>

const userSchema = z.object({
  id: z.string(),
  employeeId: z.string().optional(),
  firstName: z.string(),
  lastName: z.string(),
  username: z.string(),
  phoneNumber: z.string(),
  status: userStatusSchema,
  isProtected: z.boolean().default(false),
  permissionPresetId: z.string().optional(),
  version: z.number().default(1), // 为 SDRTS 增加版本号支持
  password: z.string().optional(), // 移除硬编码默认值
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
  isProtected: z.boolean().default(false),
  permissionPresetId: z.string().optional(),
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

const nullableDateSchema = z.preprocess((value) => {
  if (value === null || value === undefined || value === '') {
    return undefined
  }
  return value
}, z.coerce.date().optional())

const userPermissionItemSchema = z.object({
  permissionId: z.string(),
  source: z.string().optional(),
  grantedBy: z.string().optional(),
  updatedAt: nullableDateSchema,
})
export type UserPermissionItem = z.infer<typeof userPermissionItemSchema>

export const userPermissionsResponseSchema = z.object({
  userId: z.string(),
  username: z.string(),
  status: userStatusSchema,
  employeeId: z.string().optional(),
  permissionPresetId: z.string().optional(),
  permissions: z.array(userPermissionItemSchema),
  presetPermissions: z.array(z.string()),
  effectivePermissions: z.array(z.string()),
  total: z.number(),
})
export type UserPermissionsResponse = z.infer<
  typeof userPermissionsResponseSchema
>

export const userPermissionsReplaceResultSchema = z.object({
  userId: z.string(),
  permissions: z.array(z.string()),
  changeSummary: z
    .object({
      added: z.number().default(0),
      removed: z.number().default(0),
      unchanged: z.number().default(0),
    })
    .default({
      added: 0,
      removed: 0,
      unchanged: 0,
    }),
})
export type UserPermissionsReplaceResult = z.infer<
  typeof userPermissionsReplaceResultSchema
>

export const userAccessSnapshotSchema = z.object({
  userId: z.string(),
  username: z.string(),
  employeeId: z.string().optional(),
  permissionPresetId: z.string().optional(),
  presetPermissionIds: z.array(z.string()),
  directPermissionIds: z.array(z.string()),
  status: userStatusSchema.optional(),
  permissions: z.array(z.string()),
  diagnostics: z.array(z.string()).optional(),
})
export type UserAccessSnapshot = z.infer<typeof userAccessSnapshotSchema>
