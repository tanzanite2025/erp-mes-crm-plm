import { z } from 'zod'

export const userStatusApiDTOSchema = z.enum([
  'active',
  'inactive',
  'suspended',
])

export const userApiDTOSchema = z
  .object({
    id: z.string(),
    username: z.string(),
    email: z.string().optional(),
    phoneNumber: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    status: userStatusApiDTOSchema,
    isProtected: z.boolean().optional(),
    role: z.string().optional(),
    employeeId: z.string().optional(),
    password: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    version: z.number().optional(),
  })
  .strict()
export type UserApiDTO = z.infer<typeof userApiDTOSchema>

export const userOptionApiDTOSchema = z
  .object({
    id: z.string(),
    username: z.string(),
    employeeId: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    isProtected: z.boolean().optional(),
    role: z.string().optional(),
    status: userStatusApiDTOSchema.optional(),
  })
  .strict()
export type UserOptionApiDTO = z.infer<typeof userOptionApiDTOSchema>

export const userListPageApiDTOSchema = z
  .object({
    items: z.array(userApiDTOSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
  })
  .strict()
export type UserListPageApiDTO = z.infer<typeof userListPageApiDTOSchema>

export const userOptionListApiDTOSchema = z.array(userOptionApiDTOSchema)

export const userPermissionItemApiDTOSchema = z
  .object({
    permissionId: z.string(),
    source: z.string().optional(),
    grantedBy: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .strict()
export type UserPermissionItemApiDTO = z.infer<
  typeof userPermissionItemApiDTOSchema
>

export const userPermissionsApiDTOSchema = z
  .object({
    userId: z.string(),
    username: z.string(),
    status: userStatusApiDTOSchema,
    employeeId: z.string().optional(),
    role: z.string().optional(),
    permissions: z.array(userPermissionItemApiDTOSchema),
    inheritedPermissions: z.array(z.string()),
    effectivePermissions: z.array(z.string()),
    total: z.number(),
  })
  .strict()
export type UserPermissionsApiDTO = z.infer<typeof userPermissionsApiDTOSchema>

export const userPermissionsReplaceResultApiDTOSchema = z
  .object({
    userId: z.string(),
    permissions: z.array(z.string()),
    changeSummary: z
      .object({
        added: z.number().optional(),
        removed: z.number().optional(),
        unchanged: z.number().optional(),
      })
      .optional(),
  })
  .strict()
export type UserPermissionsReplaceResultApiDTO = z.infer<
  typeof userPermissionsReplaceResultApiDTOSchema
>

export const userAccessSnapshotApiDTOSchema = z
  .object({
    userId: z.string(),
    username: z.string(),
    employeeId: z.string().optional(),
    status: userStatusApiDTOSchema.optional(),
    permissions: z.array(z.string()),
    diagnostics: z.array(z.string()).optional(),
  })
  .strict()
export type UserAccessSnapshotApiDTO = z.infer<
  typeof userAccessSnapshotApiDTOSchema
>

export function deserializeUserApiDTO(input: unknown): UserApiDTO {
  return userApiDTOSchema.parse(input)
}

export function deserializeUserOptionListApiDTO(
  input: unknown
): UserOptionApiDTO[] {
  return userOptionListApiDTOSchema.parse(input)
}

export function deserializeUserListPageApiDTO(
  input: unknown
): UserListPageApiDTO {
  return userListPageApiDTOSchema.parse(input)
}

export function deserializeUserPermissionsApiDTO(
  input: unknown
): UserPermissionsApiDTO {
  return userPermissionsApiDTOSchema.parse(input)
}

export function deserializeUserPermissionsReplaceResultApiDTO(
  input: unknown
): UserPermissionsReplaceResultApiDTO {
  return userPermissionsReplaceResultApiDTOSchema.parse(input)
}

export function deserializeUserAccessSnapshotApiDTO(
  input: unknown
): UserAccessSnapshotApiDTO {
  return userAccessSnapshotApiDTOSchema.parse(input)
}
