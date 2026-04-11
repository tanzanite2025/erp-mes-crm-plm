import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type User, type UserAccessSnapshot, type UserListPage, type UserOption, type UserRoleBindingsResponse } from '../data/schema'
import * as userApi from '../services/user-api'
import { handleServerError } from '@/lib/handle-server-error'
import { buildMutationOptions } from '@/lib/react-query-mutation'
import { type DeltaSet } from '@/lib/delta/types'
import { type CreateUserPayload, type UserReplacePayload, type UserRoleBindingUpsertPayload } from '../services/user-api'
import { isSuperAdmin } from '../utils/user-utils'

type UsersQueryValue = string | number | boolean | null | undefined | string[]
type UsersQueryParams = Record<string, UsersQueryValue>

export const USERS_QUERY_KEY = ['users'] as const
export const USER_ROLE_BINDINGS_QUERY_KEY = ['users', 'role-bindings'] as const
export const USER_ACCESS_SNAPSHOT_QUERY_KEY = ['users', 'access-snapshot'] as const

export const useUsersQuery = (params: UsersQueryParams = {}) => {
  return useQuery<UserListPage>({
    queryKey: [...USERS_QUERY_KEY, params],
    queryFn: () => userApi.fetchUsers(params),
  })
}

export const useUserOptionsQuery = (params: UsersQueryParams = {}) => {
  return useQuery<UserOption[]>({
    queryKey: [...USERS_QUERY_KEY, 'options', params],
    queryFn: () => userApi.fetchUserOptions(params),
  })
}

export const useUserRoleBindingsQuery = (userId: string | undefined, enabled = true) => {
  const normalizedUserID = (userId || '').trim()
  return useQuery<UserRoleBindingsResponse>({
    queryKey: [...USER_ROLE_BINDINGS_QUERY_KEY, normalizedUserID],
    queryFn: () => userApi.fetchUserRoleBindings(normalizedUserID),
    enabled: enabled && normalizedUserID.length > 0,
  })
}

export const useUserAccessSnapshotQuery = (userId: string | undefined, enabled = true) => {
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
      onError: handleServerError,
    }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, delta, version, user }: { id: string; delta: DeltaSet; version: number; user?: User }) => {
      if (user && isSuperAdmin(user)) {
        throw new Error('[CRITICAL] Cannot modify protected superadmin account')
      }
      return userApi.patchUser(id, delta, version)
    },
    ...buildMutationOptions<User, unknown, { id: string; delta: DeltaSet; version: number; user?: User }>({
      queryClient,
      invalidateQueryKeys: [USERS_QUERY_KEY],
      onError: handleServerError,
    }),
  })

  const replaceMutation = useMutation({
    mutationFn: ({ id, data, user }: { id: string; data: UserReplacePayload; user?: User }) => {
      if (user && isSuperAdmin(user)) {
        throw new Error('[CRITICAL] Cannot replace protected superadmin account')
      }
      return userApi.replaceUser(id, data)
    },
    ...buildMutationOptions<User, unknown, { id: string; data: UserReplacePayload; user?: User }>({
      queryClient,
      invalidateQueryKeys: [USERS_QUERY_KEY],
      onError: handleServerError,
    }),
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id, user }: { id: string; user: User }) => {
      if (isSuperAdmin(user)) {
        throw new Error('[CRITICAL] Cannot delete protected superadmin account')
      }
      return userApi.deleteUser(id)
    },
    ...buildMutationOptions<unknown, unknown, { id: string; user: User }>({
      queryClient,
      invalidateQueryKeys: [USERS_QUERY_KEY],
      onError: handleServerError,
    }),
  })

  const setPrimaryRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => userApi.setUserPrimaryRole(id, role),
    ...buildMutationOptions<User, unknown, { id: string; role: string }>({
      queryClient,
      invalidateQueryKeys: [USERS_QUERY_KEY, USER_ROLE_BINDINGS_QUERY_KEY, USER_ACCESS_SNAPSHOT_QUERY_KEY],
      onError: handleServerError,
    }),
  })

  const bindEmployeeMutation = useMutation({
    mutationFn: ({ id, employeeId }: { id: string; employeeId: string }) => userApi.bindUserEmployee(id, employeeId),
    ...buildMutationOptions<User, unknown, { id: string; employeeId: string }>({
      queryClient,
      invalidateQueryKeys: [USERS_QUERY_KEY, USER_ROLE_BINDINGS_QUERY_KEY, USER_ACCESS_SNAPSHOT_QUERY_KEY],
      onError: handleServerError,
    }),
  })

  const unbindEmployeeMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => userApi.unbindUserEmployee(id),
    ...buildMutationOptions<User, unknown, { id: string }>({
      queryClient,
      invalidateQueryKeys: [USERS_QUERY_KEY, USER_ROLE_BINDINGS_QUERY_KEY, USER_ACCESS_SNAPSHOT_QUERY_KEY],
      onError: handleServerError,
    }),
  })

  const addRoleBindingMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UserRoleBindingUpsertPayload }) =>
      userApi.addUserRoleBinding(id, payload),
    ...buildMutationOptions<UserRoleBindingsResponse, unknown, { id: string; payload: UserRoleBindingUpsertPayload }>({
      queryClient,
      invalidateQueryKeys: [USERS_QUERY_KEY, USER_ROLE_BINDINGS_QUERY_KEY, USER_ACCESS_SNAPSHOT_QUERY_KEY],
      onError: handleServerError,
    }),
  })

  const removeRoleBindingMutation = useMutation({
    mutationFn: ({ id, roleId }: { id: string; roleId: string }) => userApi.removeUserRoleBinding(id, roleId),
    ...buildMutationOptions<UserRoleBindingsResponse, unknown, { id: string; roleId: string }>({
      queryClient,
      invalidateQueryKeys: [USERS_QUERY_KEY, USER_ROLE_BINDINGS_QUERY_KEY, USER_ACCESS_SNAPSHOT_QUERY_KEY],
      onError: handleServerError,
    }),
  })

  return {
    createMutation,
    updateMutation,
    replaceMutation,
    deleteMutation,
    setPrimaryRoleMutation,
    bindEmployeeMutation,
    unbindEmployeeMutation,
    addRoleBindingMutation,
    removeRoleBindingMutation,
  }
}
