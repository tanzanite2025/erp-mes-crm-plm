import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type DeltaSet } from '@/lib/delta/types'
import { buildMutationOptions } from '@/lib/react-query-mutation'
import {
  type User,
  type UserAccessSnapshot,
  type UserListPage,
  type UserOption,
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
      invalidateQueryKeys: [USERS_QUERY_KEY],
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
      invalidateQueryKeys: [USERS_QUERY_KEY],
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
    }),
  })

  const unbindEmployeeMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => userApi.unbindUserEmployee(id),
    ...buildMutationOptions<User, unknown, { id: string }>({
      queryClient,
      invalidateQueryKeys: [USERS_QUERY_KEY, USER_ACCESS_SNAPSHOT_QUERY_KEY],
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
        USER_PERMISSIONS_QUERY_KEY,
        USER_ACCESS_SNAPSHOT_QUERY_KEY,
      ],
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
