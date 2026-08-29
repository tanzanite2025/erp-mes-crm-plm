import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type DeltaSet } from '@/lib/delta/types'
import { buildMutationOptions } from '@/lib/react-query-mutation'
import { refreshCurrentAccountAccessSnapshotIfMutatedAccountMatches } from '@/features/authz/services/account-access-refresh-service'
import {
  type User,
  type UserAccessSnapshot,
  type UserListPage,
  type UserOption,
  type UserPermissionItem,
  type UserPermissionsReplaceResult,
  type UserPermissionsResponse,
} from '../data/schema'
import * as userApi from '../services/user-api'
import {
  type CreateUserPayload,
  type ReplaceUserPermissionsPayload,
  type UserReplacePayload,
} from '../services/user-api'
import { isProtectedSystemAccount } from '../utils/user-utils'

type UsersQueryValue = string | number | boolean | null | undefined | string[]
type UsersQueryParams = Record<string, UsersQueryValue>

export const USERS_QUERY_KEY = ['users'] as const
export const USER_ACCESS_SNAPSHOT_QUERY_KEY = [
  'users',
  'access-snapshot',
] as const
export const USER_PERMISSIONS_QUERY_KEY = ['users', 'permissions'] as const

function normalizePermissionIDs(permissionIDs: string[]): string[] {
  return Array.from(
    new Set(
      permissionIDs
        .map((permissionID) => permissionID.trim().toLowerCase())
        .filter(Boolean)
    )
  )
}

export const useUsersQuery = (params: UsersQueryParams = {}) => {
  return useQuery<UserListPage>({
    queryKey: [...USERS_QUERY_KEY, params],
    queryFn: () => userApi.fetchUsers(params),
  })
}

export const useUserOptionsQuery = (
  params: UsersQueryParams = {},
  enabled = true
) => {
  return useQuery<UserOption[]>({
    queryKey: [...USERS_QUERY_KEY, 'options', params],
    queryFn: () => userApi.fetchUserOptions(params),
    enabled,
  })
}

export const useUserPermissionsQuery = (
  userId: string | undefined,
  enabled = true
) => {
  const normalizedUserID = (userId || '').trim()
  return useQuery<UserPermissionsResponse>({
    queryKey: [...USER_PERMISSIONS_QUERY_KEY, normalizedUserID],
    queryFn: () => userApi.fetchUserPermissions(normalizedUserID),
    enabled: enabled && normalizedUserID.length > 0,
  })
}

export const useUserAccessSnapshotQuery = (
  userId: string | undefined,
  enabled = true
) => {
  const normalizedUserID = (userId || '').trim()
  return useQuery<UserAccessSnapshot>({
    queryKey: [...USER_ACCESS_SNAPSHOT_QUERY_KEY, normalizedUserID],
    queryFn: () => userApi.fetchUserAccessSnapshot(normalizedUserID),
    enabled: enabled && normalizedUserID.length > 0,
  })
}

export const useUserMutations = () => {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: userApi.createUser,
    ...buildMutationOptions<User, unknown, CreateUserPayload>({
      queryClient,
      invalidateQueryKeys: [USERS_QUERY_KEY],
    }),
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      delta,
      version,
      user,
    }: {
      id: string
      delta: DeltaSet
      version: number
      user?: User
    }) => {
      if (user && isProtectedSystemAccount(user)) {
        throw new Error('[CRITICAL] Cannot modify protected system account')
      }
      return userApi.patchUser(id, delta, version)
    },
    ...buildMutationOptions<
      User,
      unknown,
      { id: string; delta: DeltaSet; version: number; user?: User }
    >({
      queryClient,
      invalidateQueryKeys: [USERS_QUERY_KEY, USER_ACCESS_SNAPSHOT_QUERY_KEY],
      onSuccess: (_data, variables) =>
        refreshCurrentAccountAccessSnapshotIfMutatedAccountMatches(
          variables.id
        ),
    }),
  })

  const replaceMutation = useMutation({
    mutationFn: ({
      id,
      data,
      user,
    }: {
      id: string
      data: UserReplacePayload
      user?: User
    }) => {
      if (user && isProtectedSystemAccount(user)) {
        throw new Error('[CRITICAL] Cannot replace protected system account')
      }
      return userApi.replaceUser(id, data)
    },
    ...buildMutationOptions<
      User,
      unknown,
      { id: string; data: UserReplacePayload; user?: User }
    >({
      queryClient,
      invalidateQueryKeys: [USERS_QUERY_KEY, USER_ACCESS_SNAPSHOT_QUERY_KEY],
      onSuccess: (_data, variables) =>
        refreshCurrentAccountAccessSnapshotIfMutatedAccountMatches(
          variables.id
        ),
    }),
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id, user }: { id: string; user: User }) => {
      if (isProtectedSystemAccount(user)) {
        throw new Error('[CRITICAL] Cannot delete protected system account')
      }
      return userApi.deleteUser(id)
    },
    ...buildMutationOptions<unknown, unknown, { id: string; user: User }>({
      queryClient,
      invalidateQueryKeys: [USERS_QUERY_KEY],
    }),
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: ({ userIds }: { userIds: string[] }) =>
      userApi.bulkDeleteUsers(userIds),
    ...buildMutationOptions<
      { deleted: number },
      unknown,
      { userIds: string[] }
    >({
      queryClient,
      invalidateQueryKeys: [USERS_QUERY_KEY],
    }),
  })

  const bindEmployeeMutation = useMutation({
    mutationFn: ({ id, employeeId }: { id: string; employeeId: string }) =>
      userApi.bindUserEmployee(id, employeeId),
    ...buildMutationOptions<User, unknown, { id: string; employeeId: string }>({
      queryClient,
      invalidateQueryKeys: [USERS_QUERY_KEY, USER_ACCESS_SNAPSHOT_QUERY_KEY],
      onSuccess: (_data, variables) =>
        refreshCurrentAccountAccessSnapshotIfMutatedAccountMatches(
          variables.id
        ),
    }),
  })

  const unbindEmployeeMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => userApi.unbindUserEmployee(id),
    ...buildMutationOptions<User, unknown, { id: string }>({
      queryClient,
      invalidateQueryKeys: [USERS_QUERY_KEY, USER_ACCESS_SNAPSHOT_QUERY_KEY],
      onSuccess: (_data, variables) =>
        refreshCurrentAccountAccessSnapshotIfMutatedAccountMatches(
          variables.id
        ),
    }),
  })

  const replaceUserPermissionsMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: ReplaceUserPermissionsPayload
    }) => userApi.replaceUserPermissions(id, payload),
    ...buildMutationOptions<
      UserPermissionsReplaceResult,
      unknown,
      { id: string; payload: ReplaceUserPermissionsPayload }
    >({
      queryClient,
      invalidateQueryKeys: [
        USERS_QUERY_KEY,
        USER_ACCESS_SNAPSHOT_QUERY_KEY,
      ],
      onSuccess: (data, variables) => {
        const normalizedPermissionIDs = normalizePermissionIDs(data.permissions)
        const queryKey = [...USER_PERMISSIONS_QUERY_KEY, variables.id.trim()]

        queryClient.setQueryData<UserPermissionsResponse>(queryKey, (current) => {
          if (!current) {
            return current
          }

          const permissionItemByID = new Map<string, UserPermissionItem>(
            current.permissions.map((item) => [
              item.permissionId.trim().toLowerCase(),
              item,
            ])
          )
          const nextPermissions = normalizedPermissionIDs.map((permissionID) =>
            permissionItemByID.get(permissionID) ?? {
              permissionId: permissionID,
            }
          )
          const nextEffectivePermissions = Array.from(
            new Set([
              ...current.presetPermissions
                .map((permissionID) => permissionID.trim().toLowerCase())
                .filter(Boolean),
              ...normalizedPermissionIDs,
            ])
          )

          return {
            ...current,
            permissions: nextPermissions,
            effectivePermissions: nextEffectivePermissions,
            total: nextPermissions.length,
          }
        })

        return refreshCurrentAccountAccessSnapshotIfMutatedAccountMatches(
          variables.id
        )
      },
    }),
  })

  return {
    createMutation,
    updateMutation,
    replaceMutation,
    deleteMutation,
    bulkDeleteMutation,
    bindEmployeeMutation,
    unbindEmployeeMutation,
    replaceUserPermissionsMutation,
  }
}
